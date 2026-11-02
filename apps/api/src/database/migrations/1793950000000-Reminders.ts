import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-16: daily deadline reminders.
 *
 * The unique index is the mechanism that makes a second send impossible, not
 * a safety net behind application logic — a read-then-write has a race in it
 * and a constraint does not.
 */
export class Reminders1793950000000 implements MigrationInterface {
  name = 'Reminders1793950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "email_reminders" boolean NOT NULL DEFAULT true`,
    );
    await queryRunner.query(
      `CREATE TABLE "sent_reminders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "purchase_id" uuid NOT NULL,
        "kind" character varying(16) NOT NULL,
        "deadline_date" date NOT NULL,
        "sent_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_sent_reminders" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_sent_reminders_deadline"
         ON "sent_reminders" ("user_id", "purchase_id", "kind", "deadline_date")`,
    );
    // The rows are about a purchase; when it goes, so do they.
    await queryRunner.query(
      `ALTER TABLE "sent_reminders"
         ADD CONSTRAINT "FK_sent_reminders_purchase"
         FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "sent_reminders"
         ADD CONSTRAINT "FK_sent_reminders_user"
         FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sent_reminders"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "email_reminders"`);
  }
}
