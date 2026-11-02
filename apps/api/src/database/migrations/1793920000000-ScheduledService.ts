import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-12 amended: a service can be scheduled when the thing is bought.
 *
 * As first built the date lived only on a service record, and a record logs a
 * visit that already happened — so a thing nobody had serviced yet could not
 * be scheduled at all, which is the case that matters most.
 */
export class ScheduledService1793920000000 implements MigrationInterface {
  name = 'ScheduledService1793920000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchases" ADD "scheduled_service_date" date`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchases" DROP COLUMN "scheduled_service_date"`);
  }
}
