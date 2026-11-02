import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-12: a service record can say when the next service is due, and each user
 * gets a window for how far ahead to be warned.
 *
 * Both nullable/defaulted, so every existing row keeps the behaviour it had:
 * no service is scheduled until someone schedules one.
 */
export class NextService1793910000000 implements MigrationInterface {
  name = 'NextService1793910000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "service_records" ADD "next_service_date" date`);
    await queryRunner.query(
      `ALTER TABLE "users" ADD "service_alert_days" integer NOT NULL DEFAULT '14'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "service_alert_days"`);
    await queryRunner.query(`ALTER TABLE "service_records" DROP COLUMN "next_service_date"`);
  }
}
