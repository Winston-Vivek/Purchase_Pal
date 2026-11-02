import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/user.entity';

/** Owns persistence for User. Nothing outside this class touches the table. */
@Injectable()
export class UserRepository {
  constructor(@InjectRepository(User) private readonly users: Repository<User>) {}

  findById(id: string): Promise<User | null> {
    return this.users.findOne({ where: { id } });
  }

  /** Callers pass an already-lowercased address; see AuthService. */
  findByEmail(email: string): Promise<User | null> {
    return this.users.findOne({ where: { email } });
  }

  store(data: Pick<User, 'name' | 'email' | 'passwordHash'>): Promise<User> {
    return this.users.save(this.users.create(data));
  }

  save(user: User): Promise<User> {
    return this.users.save(user);
  }

  /** BR-13: the hash and the timestamp move together, in one statement, so
   *  there is no window where the password is new and the sessions are old. */
  async updatePassword(id: string, passwordHash: string, changedAt: Date): Promise<void> {
    await this.users.update({ id }, { passwordHash, passwordChangedAt: changedAt });
  }
}
