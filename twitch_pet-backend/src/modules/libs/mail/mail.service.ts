import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/components';
import { VerificationTemplate } from './templates/verification.template';

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

  private sendMail(email: string, subject: string, html: string) {
    this.mailerService.sendMail({ to: email, subject, html });
  }
}
