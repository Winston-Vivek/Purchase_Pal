import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, ProfileService],
  exports: [UsersService],
})
export class UsersModule {}
