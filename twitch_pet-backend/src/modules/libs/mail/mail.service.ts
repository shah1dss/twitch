import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { VerificationTemplate } from './templates/verification.template';
import { PasswordRecoveryTemplate } from './templates/password-recovery.template';
import type { SessionMetadata } from '@/shared/types/session-metadata.types';

@Injectable()
export class MailService {
  public constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService
  ) {}

  public async sendVerificationToken(email: string, token: string) {
    const domain = this.configService.get('ALLOWD_ORIGIN');
    const html = await render(VerificationTemplate({ domain, token }));

    return this.sendMail(email, 'Верификация аккаунта', html);
  }
  
  public async sendPasswordResetToken(email: string, token: string, metadata: SessionMetadata) {
    const domain = this.configService.get('ALLOWD_ORIGIN');
    const html = await render(PasswordRecoveryTemplate({ domain, token, metadata }));

    return this.sendMail(email, 'Сброс пароля', html);
  }

  private sendMail(email: string, subject: string, html: string) {
    this.mailerService.sendMail({ to: email, subject, html });
  }
}
