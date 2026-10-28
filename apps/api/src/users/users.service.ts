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
    changes: Partial<Pick<User, 'warrantyAlertDays' | 'returnAlertDays'>>,
  ): Promise<User> {
    if (changes.warrantyAlertDays !== undefined) user.warrantyAlertDays = changes.warrantyAlertDays;
    if (changes.returnAlertDays !== undefined) user.returnAlertDays = changes.returnAlertDays;
    return this.users.save(user);
  }
}
