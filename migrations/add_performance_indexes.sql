-- Migration: Add performance indexes
-- This adds indexes for frequently queried columns to improve performance

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
CREATE INDEX IF NOT EXISTS idx_posts_pub_date ON posts(pub_date);
CREATE INDEX IF NOT EXISTS idx_posts_hidden ON posts(hidden);
CREATE INDEX IF NOT EXISTS idx_posts_pinned_post ON posts(pinned_post);
CREATE INDEX IF NOT EXISTS idx_posts_status_hidden ON posts(status, hidden);

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_status ON comments(status);

-- Post categories junction table indexes
CREATE INDEX IF NOT EXISTS idx_post_categories_post_id ON post_categories(post_id);
CREATE INDEX IF NOT EXISTS idx_post_categories_category_id ON post_categories(category_id);

-- Composite index for common queries (published + non-hidden + ordered by date)
CREATE INDEX IF NOT EXISTS idx_posts_published_hidden_date ON posts(status, hidden, pub_date DESC);

-- Homepage settings indexes
CREATE INDEX IF NOT EXISTS idx_homepage_settings_id ON homepage_settings(id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);
