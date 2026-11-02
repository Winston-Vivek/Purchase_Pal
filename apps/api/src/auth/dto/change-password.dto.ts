import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  /**
   * Required even though the caller is signed in.
   *
   * A stolen session must not be able to lock the real owner out of their own
   * account, which is the whole point of asking.
   */
  @ApiProperty()
  @IsString()
  @MaxLength(72)
  currentPassword!: string;

  @ApiProperty({ minLength: 8, maxLength: 72, description: 'At least one letter and one number' })
  @IsString()
  @Length(8, 72, { message: 'Password must be 8 to 72 characters' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Password must include at least one letter and one number',
  })
  newPassword!: string;
}
