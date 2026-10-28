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
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { DatesService } from '../common/dates/dates.service';
import { User } from '../users/user.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ListPurchasesDto } from './dto/list-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseResponse, toPurchaseResponse } from './purchase-response';
import { PurchasesService } from './purchases.service';

@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchases: PurchasesService,
    private readonly dates: DatesService,
  ) {}

  @Post()
  @HttpCode(201)
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseResponse> {
    return toPurchaseResponse(await this.purchases.create(user, dto), user, this.dates);
  }

  @Get()
  async list(
    @CurrentUser() user: User,
    @Query() query: ListPurchasesDto,
  ): Promise<{ items: PurchaseResponse[]; total: number; page: number; pageSize: number }> {
    const { items, ...page } = await this.purchases.list(user, query);
    return { items: items.map((p) => toPurchaseResponse(p, user, this.dates)), ...page };
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PurchaseResponse> {
    const purchase = await this.purchases.findOwned(user, id, true);
    return toPurchaseResponse(purchase, user, this.dates, { includeRelations: true });
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePurchaseDto,
  ): Promise<PurchaseResponse> {
    return toPurchaseResponse(await this.purchases.update(user, id, dto), user, this.dates);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.purchases.remove(user, id);
  }
}
