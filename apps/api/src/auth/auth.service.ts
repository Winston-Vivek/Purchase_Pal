import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';
import { SIGN_IN_FAILED } from './auth.constants';
import { RegisterDto } from './dto/register.dto';
import { passwordFingerprint } from './password-fingerprint';

/**
 * A real bcrypt hash of nothing useful. Compared against when no user matches,
 * so a missing address costs the same time as a wrong password — otherwise the
 * response time alone reveals which addresses have accounts.
 */
const ABSENT_USER_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<User> {
    const email = dto.email.toLowerCase();

    if (await this.users.findByEmail(email)) {
      throw new ConflictException('That email address is already registered');
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      this.config.getOrThrow<number>('BCRYPT_ROUNDS'),
    );

    return this.users.create({ name: dto.name, email, passwordHash });
  }

  /** One exception, one message, whichever half of the credentials is wrong. */
  async validate(email: string, password: string): Promise<User> {
    const user = await this.users.findByEmail(email.toLowerCase());

    if (!user) {
      await bcrypt.compare(password, ABSENT_USER_HASH);
      throw new UnauthorizedException(SIGN_IN_FAILED);
    }

    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException(SIGN_IN_FAILED);
    }

    return user;
  }

  /**
   * `sub` and a password fingerprint, and nothing else: everything in here is
   * readable by the client, so it holds only what the server must check.
   *
   * BR-13: the fingerprint is what makes a password change end every session
   * issued under the old password.
   */
  signToken(user: User): string {
    return this.jwt.sign({
      sub: user.id,
      pwd: passwordFingerprint(user.passwordHash, this.config.getOrThrow<string>('JWT_SECRET')),
    });
  }
}
