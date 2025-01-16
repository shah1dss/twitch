import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { verify } from 'argon2';
import type { Request } from 'express';

import { PrismaService } from '@/core/prisma/prisma.service';
import { RedisService } from '@/core/redis/redis.service';
import { getSessionMetadata } from '@/shared/utils/session-metadata.utils';
import { destroySession, saveSession } from '@/shared/utils/session.utils';

import { VerificationService } from '../verification/verification.service';

import { LoginInput } from './inputs/login.input';
import { TOTP } from 'otpauth';
import { PROJECT_NAME } from '@/shared/consts/main.consts';

@Injectable()
export class SessionService {
  public constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
    private readonly verificationService: VerificationService
  ) {}

  public async findByUser(req: Request) {
    const userId = req.session.userId;

    if (!userId) {
      throw new NotFoundException('Пользователь не найден в сессии');
    }

    const keys = await this.redisService.keys('*');

    const userSessions = [];
    for (const key of keys) {
      const sessionData = await this.redisService.get(key);

      if (sessionData) {
        const session = JSON.parse(sessionData);

        if (session.userId === userId) {
          userSessions.push({
            ...session,
            id: key.split(':')[1]
          });
        }
      }

      return userSessions
        .sort((a, b) => b.createdAt - a.createdAt)
        .filter((session) => session.id !== req.session.id);
    }
  }

  public async findCurrent(req: Request) {
    const sessionId = req.session.id;

    const sessionData = await this.redisService.get(
      `${this.configService.getOrThrow<string>('SESSION_FOLDER')}${sessionId}`
    );

    const session = JSON.parse(sessionData);
    return {
      ...session,
      id: sessionId
    };
  }

  public async login(req: Request, input: LoginInput, userAgent: string) {
    const { login, password, pin } = input;

    const user = await this.prismaService.user.findFirst({
      where: {
        OR: [{ username: { equals: login } }, { email: { equals: login } }]
      }
    });

    if (!user) {
      throw new NotFoundException('Пользователь не найден');
    }

    const isValidPassword = await verify(user.password, password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Пароль не верный');
    }

    if (!user.isEmailVerified) {
      await this.verificationService.sendVerificationToken(user);
      throw new BadRequestException('Аккаунт не верифицирован, пожалуйста, проверьте свою почту');
    }

    if(user.isTotpEnabled) {
      if(!pin) {
        return {
          message: 'Необходим код для завершения авторизации'
        }  
      }
      const totp = new TOTP({
        issuer: PROJECT_NAME,
        label: `${user.email}`,
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: user.totpSecret
      });

      const delta = totp.validate({ token: pin });

      if (delta !== 0) {
        throw new BadRequestException('Неверный код');
      }
    }

    const metadata = getSessionMetadata(req, userAgent);

    return saveSession(req, user, metadata);
  }

  public async logout(req: Request) {
    return destroySession(req, this.configService);
  }

  public async clearSession(req: Request) {
    req.res.clearCookie(this.configService.getOrThrow<string>('SESSION_NAME'));

    return true;
  }

  public async remove(req: Request, id: string) {
    if (req.session.id === id) {
      throw new ConflictException('Нельзя удалить текущую сессию');
    }

    await this.redisService.del(
      `${this.configService.getOrThrow<string>('SESSION_FOLDER')}${id}`
    );

    return true;
  }
}
