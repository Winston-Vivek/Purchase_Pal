import { Body, Controller, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsResponse, toSettingsResponse } from './settings-response';
import { User } from './user.entity';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /** Only ever the signed-in user: there is no :id, so there is nothing to
   *  tamper with (BR-09). */
  @Patch('me/settings')
  async updateSettings(
    @CurrentUser() user: User,
    @Body() dto: UpdateSettingsDto,
  ): Promise<SettingsResponse> {
    return toSettingsResponse(await this.users.updateSettings(user, dto));
  }
}
