import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Body, Controller, Get, HttpCode, Post, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CookieOptions, Response } from 'express';
import { User } from '../users/user.entity';
import { UserResponse, toUserResponse } from '../users/user-response';
import { AUTH_COOKIE } from './auth.constants';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { CurrentUser } from './current-user.decorator';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterDto } from './dto/register.dto';
import { Public } from './public.decorator';

/** "7d" / "15m" -> milliseconds, so the cookie outlives the tab but not the token. */
function toMilliseconds(expiresIn: string): number {
  const match = /^(\d+)([smhdw])$/.exec(expiresIn);
  if (!match) throw new Error(`JWT_EXPIRES_IN "${expiresIn}" is not a duration like 7d`);

  const unit = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };
  return Number(match[1]) * unit[match[2] as keyof typeof unit];
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly cookieOptions: CookieOptions;

  constructor(
    private readonly auth: AuthService,
    private readonly passwordReset: PasswordResetService,
    config: ConfigService,
  ) {
    this.cookieOptions = {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: config.getOrThrow<string>('NODE_ENV') === 'production',
      maxAge: toMilliseconds(config.getOrThrow<string>('JWT_EXPIRES_IN')),
    };
  }

  @Public()
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
  @Post('reset-password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Set a new password using a reset link' })
  @ApiResponse({ status: 400, description: 'The link is expired, spent or invalid' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<void> {
    await this.passwordReset.reset(dto.token, dto.password);
  }
}
