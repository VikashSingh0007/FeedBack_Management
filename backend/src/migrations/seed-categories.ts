import { MigrationInterface, QueryRunner } from 'typeorm';

export class FillMissingCardIds123456789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, update all existing records with NULL cardId
    await queryRunner.query(`
      UPDATE feedback 
      SET "cardId" = 'AQA-' || LPAD((id)::text, 4, '0')
      WHERE "cardId" IS NULL
    `);

    // Then make the column NOT NULL and add unique constraint
    await queryRunner.query(`
      ALTER TABLE feedback 
      ALTER COLUMN "cardId" SET NOT NULL,
      ADD CONSTRAINT "UQ_feedback_cardId" UNIQUE ("cardId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE feedback 
      DROP CONSTRAINT IF EXISTS "UQ_feedback_cardId",
      ALTER COLUMN "cardId" DROP NOT NULL
    `);
  }
}