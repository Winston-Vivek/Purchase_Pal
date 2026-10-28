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
}
