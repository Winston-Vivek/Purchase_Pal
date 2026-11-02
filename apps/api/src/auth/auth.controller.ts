import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Patch, Post, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { User } from '../users/user.entity';
import { UserResponse, toUserResponse } from '../users/user-response';
import { AuthThrottleGuard } from './auth-throttle.guard';
import { authCookieOptions } from './auth-cookie';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { PasswordChangeService } from './password-change.service';
import { PasswordResetService } from './password-reset.service';
import { CurrentUser } from './current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
    private readonly passwordChange: PasswordChangeService,
    config: ConfigService,
  ) {
    this.cookieOptions = authCookieOptions(config);
  }

  @Public()
  @UseGuards(AuthThrottleGuard)
  @Post('register')
  @HttpCode(201)
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const user = await this.auth.register(dto);
    this.issueCookie(response, user);
    return toUserResponse(user);
  }

  @Public()
  @UseGuards(AuthThrottleGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const user = await this.auth.validate(dto.email, dto.password);
    this.issueCookie(response, user);
    return toUserResponse(user);
  }

  /** Public: clearing a cookie should work even when the session has expired. */
  @Public()
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) response: Response): void {
    const { maxAge: _maxAge, ...options } = this.cookieOptions;
    response.clearCookie(AUTH_COOKIE, options);
  }

  @Get('me')
  me(@CurrentUser() user: User): UserResponse {
    return toUserResponse(user);
  }

  private issueCookie(response: Response, user: User): void {
    response.cookie(AUTH_COOKIE, this.auth.signToken(user), this.cookieOptions);
  }

  /**
   * BR-14. Always 202, whether or not the address has an account.
   *
   * A different answer for a known address would turn this into a way to
   * find out who has an account here — the same property /auth/login is
   * careful about.
   */
  @Public()
  @UseGuards(AuthThrottleGuard)
  @Post('forgot-password')
  @HttpCode(202)
  @ApiOperation({ summary: 'Email a password reset link' })
  @ApiResponse({ status: 202, description: 'Accepted, whether or not the account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<void> {
    await this.passwordReset.request(dto.email);
  }

  /**
   * BR-14. Spends the token and sets the password.
   *
   * No cookie is issued: possession of an inbox at one moment should not
   * silently become a signed-in browser. The user signs in afterwards.
   */
  @Public()
  @UseGuards(AuthThrottleGuard)
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset link' })
  @ApiResponse({ status: 400, description: 'The link is expired, spent or invalid' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.password);
  }

  /**
   * BR-13. On the auth controller, not users, because AuthModule already
   * imports UsersModule — the reverse would be the circular import
   * arch-avoid-circular-deps exists to prevent. It is also honestly an
   * authentication operation: it ends every session and issues a new one.
   *
   * The cookie is re-issued because changing the password invalidates every
   * token signed under the old one, including the one that made this request.
   * Without it the user is signed out by their own action.
   */
  @Patch('password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change your password' })
  @ApiResponse({ status: 400, description: 'Wrong current password, or a new one too weak' })
  async changePassword(
    @CurrentUser() user: User,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<UserResponse> {
    const updated = await this.passwordChange.change(user, dto.currentPassword, dto.newPassword);

    response.cookie(AUTH_COOKIE, this.auth.signToken(updated), this.cookieOptions);
    return toUserResponse(updated);
  }
}
