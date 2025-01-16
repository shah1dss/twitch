import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { TokenType } from '@prisma/generated';
import { hash } from 'argon2';
import type { Request } from 'express';

import { PrismaService } from '@/core/prisma/prisma.service';
import { MailService } from '@/modules/libs/mail/mail.service';
import { generateToken } from '@/shared/utils/generate-token.utils';
import { getSessionMetadata } from '@/shared/utils/session-metadata.utils';

import { NewPasswordInput } from './inputs/new-password.input';
import { ResetPasswordInput } from './inputs/reset-password.input';

@Injectable()
export class PasswordRecoveryService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly mailService: MailService
  ) {}

  public async resetPassword(
    req: Request,
    input: ResetPasswordInput,
    userAgent: string
  ) {
    const { email } = input;

    const user = await this.prismaService.user.findUnique({ where: { email } });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const passwordResetToken = await generateToken(
      this.prismaService,
      user,
      TokenType.PASSWORD_RESET
    );

    const metadata = getSessionMetadata(req, userAgent);

    await this.mailService.sendPasswordResetToken(
      email,
      passwordResetToken.token,
      metadata
    );

    return true;
  }

  public async newPassword(input: NewPasswordInput) {
    const { password, token } = input;

    const existingToken = await this.prismaService.token.findUnique({
      where: { token, type: TokenType.PASSWORD_RESET }
    });

    if (!existingToken) {
      throw new UnauthorizedException('Токен не найден');
    }

    const hasExpired = new Date(existingToken.expiresIn) < new Date();

    if (hasExpired) {
      throw new BadRequestException('Токен просрочен');
    }

    await this.prismaService.user.update({
      where: { id: existingToken.userId },
      data: { password: await hash(password) }
    });

    await this.prismaService.token.delete({
      where: { id: existingToken.id, type: TokenType.PASSWORD_RESET }
    });

    return true;
  }
}
