import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-11: a user can mark a return closed to say they are keeping the item.
 *
 * NOT NULL DEFAULT false, so every existing purchase keeps exactly the status
 * it had — the column records a decision, and nobody has made one yet.
 */
export class ReturnClosed1793900000000 implements MigrationInterface {
  name = 'ReturnClosed1793900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD "return_closed" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "purchases" DROP COLUMN "return_closed"`);
  }
}
