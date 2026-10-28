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
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator';
import { DatesService } from '../common/dates/dates.service';
import { User } from '../users/user.entity';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { ListPurchasesDto } from './dto/list-purchases.dto';
import { UpdatePurchaseDto } from './dto/update-purchase.dto';
import { PurchaseResponse, toPurchaseResponse } from './purchase-response';
import { PurchasesService } from './purchases.service';

/**
 * REST handler names follow the org template: index / store / show / update /
 * destroy.
 *
 * The template maps a full update to PUT, but requirements §9 locks
 * `PATCH /purchases/:id` with partial fields. The locked API contract wins, so
 * the verb stays PATCH and only the handler name is aligned.
 */
@ApiTags('purchases')
@Controller('purchases')
export class PurchasesController {
  constructor(
    private readonly purchases: PurchasesService,
    private readonly dates: DatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List my purchases, newest first' })
  async index(
    @CurrentUser() user: User,
    @Query() query: ListPurchasesDto,
  ): Promise<{ items: PurchaseResponse[]; total: number; page: number; pageSize: number }> {
    const { items, ...page } = await this.purchases.list(user, query);
    return { items: items.map((p) => toPurchaseResponse(p, user, this.dates)), ...page };
  }

  @Post()
  @HttpCode(201)
  @ApiOperation({ summary: 'Record a purchase' })
  async store(
    @CurrentUser() user: User,
    @Body() dto: CreatePurchaseDto,
  ): Promise<PurchaseResponse> {
    return toPurchaseResponse(await this.purchases.create(user, dto), user, this.dates);
  }

  @Get(':purchaseId')
  @ApiOperation({ summary: 'One purchase, with its receipts and service history' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  async show(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ): Promise<PurchaseResponse> {
    const purchase = await this.purchases.findOwned(user, purchaseId, true);
    return toPurchaseResponse(purchase, user, this.dates, { includeRelations: true });
  }

  @Patch(':purchaseId')
  @ApiOperation({ summary: 'Change some fields of a purchase' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  async update(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
    @Body() dto: UpdatePurchaseDto,
  ): Promise<PurchaseResponse> {
    return toPurchaseResponse(await this.purchases.update(user, purchaseId, dto), user, this.dates);
  }

  @Delete(':purchaseId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a purchase, its receipts and its service history' })
  @ApiParam({ name: 'purchaseId', format: 'uuid' })
  async destroy(
    @CurrentUser() user: User,
    @Param('purchaseId', ParseUUIDPipe) purchaseId: string,
  ): Promise<void> {
    await this.purchases.remove(user, purchaseId);
  }
}
