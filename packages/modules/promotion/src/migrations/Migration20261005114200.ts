import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20261005114200 extends Migration {
  override async up(): Promise<void> {
    // Pagly: bank is a promotion type of its own. Checkout does not apply it yet.
    this.addSql(
      `alter table if exists "promotion" drop constraint if exists "promotion_type_check";`
    )
    this.addSql(
      `alter table if exists "promotion" add constraint "promotion_type_check" check("type" in ('standard', 'buyget', 'bank'));`
    )
  }

  override async down(): Promise<void> {
    this.addSql(
      `alter table if exists "promotion" drop constraint if exists "promotion_type_check";`
    )
    this.addSql(
      `alter table if exists "promotion" add constraint "promotion_type_check" check("type" in ('standard', 'buyget'));`
    )
  }
}
