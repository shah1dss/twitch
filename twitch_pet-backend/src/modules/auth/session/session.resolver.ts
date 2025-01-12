import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';

import { Authorization } from '@/shared/decorators/auth.decorator';
import { UserAgent } from '@/shared/decorators/user-agent.decorator';
import type { GqlContext } from '@/shared/types/gql-context.types';

import { UserModel } from '../account/models/user.model';

import { LoginInput } from './inputs/login.input';
import { SessionModel } from './models/session.model';
import { SessionService } from './session.service';

@Resolver('Session')
export class SessionResolver {
  public constructor(private readonly sessionService: SessionService) {}

  @Authorization()
  @Query(() => [SessionModel], { name: 'fundSessionByUser' })
  public async findByUser(@Context() { req }: GqlContext) {
    return this.sessionService.findByUser(req);
  }

  @Authorization()
  @Query(() => SessionModel, { name: 'findCurrentSession' })
  public async findCurrent(@Context() { req }: GqlContext) {
    return this.sessionService.findCurrent(req);
  }

  @Mutation(() => UserModel, { name: 'loginUser' })
  public async login(
    @Context() { req }: GqlContext,
    @Args('data') input: LoginInput,
    @UserAgent() userAgent: string
  ) {
    return this.sessionService.login(req, input, userAgent);
  }

  @Mutation(() => Boolean, { name: 'logoutUser' })
  @Authorization()
  public async logout(@Context() { req }: GqlContext) {
    return this.sessionService.logout(req);
  }

  @Mutation(() => Boolean, { name: 'clearSession' })
  @Authorization()
  public async clearSession(@Context() { req }: GqlContext) {
    return this.sessionService.clearSession(req);
  }
  @Mutation(() => Boolean, { name: 'removeSession' })
  @Authorization()
  public async remove(@Context() { req }: GqlContext, @Args('id') id: string) {
    return this.sessionService.remove(req, id);
  }
}
