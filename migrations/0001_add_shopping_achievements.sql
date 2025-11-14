
-- Shopping Items
CREATE TABLE IF NOT EXISTS shopping_items (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_price INTEGER NOT NULL,
  category TEXT NOT NULL,
  deadline TIMESTAMP,
  notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Price History
CREATE TABLE IF NOT EXISTS price_history (
  id SERIAL PRIMARY KEY,
  shopping_item_id INTEGER NOT NULL REFERENCES shopping_items(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  location TEXT,
  checked_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Achievements
CREATE TABLE IF NOT EXISTS achievements (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL,
  earned_at TIMESTAMP DEFAULT NOW() NOT NULL,
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_user ON shopping_items(user_id);
CREATE INDEX IF NOT EXISTS idx_price_history_item ON price_history(shopping_item_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON achievements(user_id, achievement_type);
