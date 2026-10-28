import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1793181034069 implements MigrationInterface {
  name = 'Init1793181034069';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "service_records" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_id" uuid NOT NULL, "service_date" date NOT NULL, "provider" character varying(120), "description" character varying(500) NOT NULL, "cost" numeric(12,2), "notes" character varying(1000), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_eb60ec90c5548e73a5211c48ab9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e9c6a320d396cdfa6c4c6f4e5b" ON "service_records" ("purchase_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying(80) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying NOT NULL, "warranty_alert_days" integer NOT NULL DEFAULT '30', "return_alert_days" integer NOT NULL DEFAULT '7', "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."purchases_category_enum" AS ENUM('ELECTRONICS', 'APPLIANCES', 'MOBILE', 'FURNITURE', 'FASHION', 'VEHICLE', 'HOME_KITCHEN', 'OTHER')`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchases" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "product_name" character varying(120) NOT NULL, "category" "public"."purchases_category_enum" NOT NULL, "seller" character varying(120), "purchase_date" date NOT NULL, "price" numeric(12,2) NOT NULL, "currency" character(3) NOT NULL DEFAULT 'INR', "return_window_days" integer, "return_deadline" date, "warranty_start_date" date, "warranty_months" integer, "notes" character varying(1000), "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6e01e7e8753c474066854d73cd" ON "purchases" ("user_id", "purchase_date") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_024ddf7e04177a07fcb9806a90" ON "purchases" ("user_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "attachments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "purchase_id" uuid NOT NULL, "storage_key" character varying NOT NULL, "file_name" character varying(255) NOT NULL, "mime_type" character varying(100) NOT NULL, "file_size" integer NOT NULL, "uploaded_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_ec3648b85f6af7eafe865a3257b" UNIQUE ("storage_key"), CONSTRAINT "PK_5e1f050bcff31e3084a1d662412" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6d39ca6980207804e44b5fa1db" ON "attachments" ("purchase_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "service_records" ADD CONSTRAINT "FK_e9c6a320d396cdfa6c4c6f4e5b5" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" ADD CONSTRAINT "FK_024ddf7e04177a07fcb9806a90a" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attachments" ADD CONSTRAINT "FK_6d39ca6980207804e44b5fa1db1" FOREIGN KEY ("purchase_id") REFERENCES "purchases"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "attachments" DROP CONSTRAINT "FK_6d39ca6980207804e44b5fa1db1"`,
    );
    await queryRunner.query(
      `ALTER TABLE "purchases" DROP CONSTRAINT "FK_024ddf7e04177a07fcb9806a90a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_records" DROP CONSTRAINT "FK_e9c6a320d396cdfa6c4c6f4e5b5"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_6d39ca6980207804e44b5fa1db"`);
    await queryRunner.query(`DROP TABLE "attachments"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_024ddf7e04177a07fcb9806a90"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6e01e7e8753c474066854d73cd"`);
    await queryRunner.query(`DROP TABLE "purchases"`);
    await queryRunner.query(`DROP TYPE "public"."purchases_category_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e9c6a320d396cdfa6c4c6f4e5b"`);
    await queryRunner.query(`DROP TABLE "service_records"`);
  }
}
