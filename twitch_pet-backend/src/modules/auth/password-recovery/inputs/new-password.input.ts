import { IsPasswordMatchingConstraint } from '@/shared/decorators/is-password-matching-constraint.decorator';
import { InputType, Field } from '@nestjs/graphql';
import { IsNotEmpty, IsString, IsUUID, isUUID, MinLength, Validate } from 'class-validator';

@InputType()
export class NewPasswordInput {
  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  public password: string;

  @Field(() => String)
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @Validate(IsPasswordMatchingConstraint)
  public passwordRepeat: string;

  @Field(() => String)
  @IsUUID('4')
  @IsNotEmpty()
  public token: string;
}
