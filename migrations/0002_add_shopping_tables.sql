
CREATE TABLE IF NOT EXISTS "shopping_items" (
  "id" SERIAL PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id"),
  "name" TEXT NOT NULL,
  "target_price" TEXT NOT NULL,
  "category" TEXT DEFAULT 'General',
  "deadline" TIMESTAMP,
  "notifications" INTEGER DEFAULT 1,
  "created_at" TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "shopping_price_checks" (
  "id" SERIAL PRIMARY KEY,
  "item_id" INTEGER NOT NULL REFERENCES "shopping_items"("id"),
  "store_name" TEXT NOT NULL,
  "price" TEXT NOT NULL,
  "location" TEXT,
  "checked_at" TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "shopping_items_user_id_idx" ON "shopping_items"("user_id");
CREATE INDEX IF NOT EXISTS "shopping_price_checks_item_id_idx" ON "shopping_price_checks"("item_id");
