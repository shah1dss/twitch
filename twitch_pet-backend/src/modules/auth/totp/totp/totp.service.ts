import { BadRequestException, Injectable } from '@nestjs/common';
import { User } from '@prisma/generated';
import { randomBytes } from 'crypto';
import { encode } from 'hi-base32';
import { TOTP } from 'otpauth';
import * as QRCode from 'qrcode';

import { PrismaService } from '@/core/prisma/prisma.service';
import { PROJECT_NAME } from '@/shared/consts/main.consts';

import { EnableTotpInput } from './inputs/enable-totp.input';

@Injectable()
export class TotpService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async generate(user: User) {
    const secret = encode(randomBytes(15)).replace(/=/g, '').substring(0, 24);

    const totp = new TOTP({
      issuer: PROJECT_NAME,
      label: `${user.email}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret
    });

    const otpauthUrl = totp.toString();
    const qrcodeUrl = await QRCode.toDataURL(otpauthUrl);

    return { qrcodeUrl, secret };
  }

  public async enable(user: User, input: EnableTotpInput) {
    const { secret, pin } = input;

    const totp = new TOTP({
      issuer: PROJECT_NAME,
      label: `${user.email}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret
    });

    const delta = totp.validate({ token: pin });

    if (delta !== 0) {
      throw new BadRequestException('Неверный код');
    }

    await this.prismaService.user.update({
      where: { id: user.id },
      data: { isTotpEnabled: true, totpSecret: secret }
    });

    return true;
  }

  public async disable(user: User) {
    await this.prismaService.user.update({
      where: { id: user.id },
      data: { isTotpEnabled: false, totpSecret: null }
    });

    return true;
  }
}
