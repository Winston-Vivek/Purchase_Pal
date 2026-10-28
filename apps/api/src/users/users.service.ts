import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  /** Callers pass an already-lowercased address; see AuthService. */
  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  create(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
    return this.users.save(this.users.create(data));
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
