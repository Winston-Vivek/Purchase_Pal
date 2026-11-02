import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-13 and BR-14: password reset tokens, and the timestamp that ends every
 * session predating a password change.
 *
 * `password_changed_at` is nullable rather than defaulted to now(): an
 * existing account has never changed its password, and back-filling a
 * timestamp would sign everyone out on deploy.
 */
export class PasswordReset1793930000000 implements MigrationInterface {
  name = 'PasswordReset1793930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD "password_changed_at" TIMESTAMP WITH TIME ZONE`,
    );
    await queryRunner.query(
      `CREATE TABLE "password_reset_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_password_reset_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_password_reset_tokens" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_password_reset_tokens_user" ON "password_reset_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "password_reset_tokens"
         ADD CONSTRAINT "FK_password_reset_tokens_user"
         FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "password_reset_tokens"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "password_changed_at"`);
  }
}
