import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, HttpCode, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { ChangeEmailDto } from './dto/change-email.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import { UserResponse, toUserResponse } from './user-response';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponse, toSettingsResponse } from './settings-response';
import { User } from './user.entity';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly profile: ProfileService,
  ) {}

  /** Only ever the signed-in user: there is no :id, so there is nothing to
   *  tamper with (BR-09). */
  @Patch('me')
  @ApiOperation({ summary: 'Change your name' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponse> {
    return toUserResponse(
      dto.name === undefined ? user : await this.profile.rename(user, dto.name),
    );
  }

  /**
   * BR-15. Asks for a change; the address is not written until the link sent
   * to it is opened.
   */
  @Post('me/email')
  @HttpCode(202)
  @ApiOperation({ summary: 'Ask to change your email address' })
  @ApiResponse({ status: 409, description: 'That address already has an account' })
  async requestEmailChange(@CurrentUser() user: User, @Body() dto: ChangeEmailDto): Promise<void> {
    await this.profile.requestEmailChange(user, dto.email, dto.currentPassword);
  }

  /**
   * Public: the token is the authority, and the link may well be opened in a
   * browser that was never signed in — which is the normal case when someone
   * is proving they read a different inbox.
   */
  @Public()
  @Post('me/email/confirm')
  @HttpCode(200)
  @ApiOperation({ summary: 'Confirm a new email address' })
  async confirmEmailChange(@Body() dto: ConfirmEmailDto): Promise<void> {
    await this.profile.confirmEmailChange(dto.token);
  }

  @Patch('me/settings')
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return toSettingsResponse(await this.users.updateSettings(user, dto));
  }
}
