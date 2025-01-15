import { Module } from '@nestjs/common';

import { AccountResolver } from './account.resolver';
import { AccountService } from './account.service';
import { VerificationService } from '../verification/verification.service';

@Module({
  providers: [AccountResolver, AccountService, VerificationService],
})
export class AccountModule {}
