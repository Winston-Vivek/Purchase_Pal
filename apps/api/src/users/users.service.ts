import { Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user/user.repository';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  findById(id: string): Promise<User | null> {
    return this.users.findById(id);
  }

  findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email);
  }

  create(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
    return this.users.store(data);
  }

  /** Assigns only the keys the DTO actually carried, so omitting one window
   *  leaves it alone instead of overwriting it with undefined. */
  updateSettings(
    user: User,
    changes: Partial<Pick<User, 'warrantyAlertDays' | 'returnAlertDays' | 'serviceAlertDays'>>,
  ): Promise<User> {
    if (changes.warrantyAlertDays !== undefined) user.warrantyAlertDays = changes.warrantyAlertDays;
    if (changes.returnAlertDays !== undefined) user.returnAlertDays = changes.returnAlertDays;
    if (changes.serviceAlertDays !== undefined) user.serviceAlertDays = changes.serviceAlertDays;
    return this.users.save(user);
  }

  /**
   * BR-13. Writing the hash and the timestamp together is deliberate: a
   * password change that forgot the timestamp would leave every old session
   * alive, which is the failure this exists to prevent.
   */
  async setPassword(userId: string, passwordHash: string, changedAt: Date): Promise<void> {
    await this.users.updatePassword(userId, passwordHash, changedAt);
  }

  async rename(userId: string, name: string): Promise<User> {
    return this.users.updateFields(userId, { name });
  }

  /** BR-15. Only ever called after a token proved the address is read. */
  async changeEmail(userId: string, email: string): Promise<User> {
    return this.users.updateFields(userId, { email });
  }
}
