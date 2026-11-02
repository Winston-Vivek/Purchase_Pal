import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * BR-15: a requested email change, held here until the link sent to the new
 * address is opened. The address deliberately does not touch the users table
 * until then.
 */
export class EmailChange1793940000000 implements MigrationInterface {
  name = 'EmailChange1793940000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "email_change_tokens" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "new_email" character varying(255) NOT NULL,
        "token_hash" character(64) NOT NULL,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "used_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_email_change_tokens_hash" UNIQUE ("token_hash"),
        CONSTRAINT "PK_email_change_tokens" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_email_change_tokens_user" ON "email_change_tokens" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "email_change_tokens"
         ADD CONSTRAINT "FK_email_change_tokens_user"
         FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "email_change_tokens"`);
  }
}
