import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/** The liveness probe's database round-trip, kept behind a repository so no
 *  controller touches the DataSource directly. */
@Injectable()
export class HealthRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async ping(): Promise<void> {
    await this.dataSource.query('SELECT 1');
  }
}
