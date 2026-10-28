import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../users/user.entity';
import { CreateServiceRecordDto } from './dto/create-service-record.dto';
import { UpdateServiceRecordDto } from './dto/update-service-record.dto';
import { ServiceRecordResponse, toServiceRecordResponse } from './service-record-response';
import { ServiceRecordsService } from './service-records.service';

@ApiTags('service history')
@Controller()
export class ServiceRecordsController {
  constructor(private readonly records: ServiceRecordsService) {}

  @Get('purchases/:purchaseId/services')
  @ApiOperation({ summary: 'Service history for a purchase, newest first' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  async index(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ): Promise<ServiceRecordResponse[]> {
    const records = await this.records.listForPurchase(user, purchaseId);
    return records.map(toServiceRecordResponse);
  }

  @Post('purchases/:purchaseId/services')
  @HttpCode(201)
  @ApiOperation({ summary: 'Log a repair or service visit' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  async store(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body() dto: CreateServiceRecordDto,
  ): Promise<ServiceRecordResponse> {
    return toServiceRecordResponse(await this.records.create(user, purchaseId, dto));
  }

  @Patch('services/:serviceRecordId')
  @ApiOperation({ summary: 'Change a service record' })
  @ApiParam({ name: 'serviceRecordId', format: 'uuid' })
  async update(
    @CurrentUser() user: User,
    @Param('serviceRecordId', ParseUUIDPipe) serviceRecordId: string,
    @Body() dto: UpdateServiceRecordDto,
  ): Promise<ServiceRecordResponse> {
    return toServiceRecordResponse(await this.records.update(user, serviceRecordId, dto));
  }

  @Delete('services/:serviceRecordId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a service record' })
  @ApiParam({ name: 'serviceRecordId', format: 'uuid' })
  async destroy(
    @CurrentUser() user: User,
    @Param('serviceRecordId', ParseUUIDPipe) serviceRecordId: string,
  ): Promise<void> {
    await this.records.remove(user, serviceRecordId);
  }
}
