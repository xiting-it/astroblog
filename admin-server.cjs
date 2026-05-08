// Load environment variables first
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieSession = require('cookie-session');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const bcrypt = require('bcrypt');

// Import logger
const logger = require('./src/lib/logger.cjs');

const app = express();
const PORT = 3002;

// Trigger rebuild function with debouncing and error handling
let rebuildTimeout = null;
let isRebuilding = false;

function triggerRebuild() {
  // Clear existing timeout if any
  if (rebuildTimeout) {
    clearTimeout(rebuildTimeout);
  }

  // Debounce rebuilds to wait 2 seconds after the last change
  rebuildTimeout = setTimeout(() => {
    if (isRebuilding) {
      logger.warn('Rebuild already in progress, skipping');
      return;
    }

    isRebuilding = true;
    logger.info('Starting blog rebuild...');

    exec('/root/astroblog/quick-update.sh', (error, stdout, stderr) => {
      isRebuilding = false;

      if (error) {
        logger.error('Rebuild failed:', { error: error.message });
        return;
      }

      logger.info('Blog rebuilt successfully');
    });
  }, 2000); // Wait 2 seconds after last change before rebuilding
}

// Database setup
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, 'blog.db'));

// Posts directory for content collections
const postsDir = path.join(__dirname, 'src', 'content', 'posts');

// Sync post to markdown file
function syncMarkdownFile(post) {
  // Only sync published posts
  if (post.status !== 'published') {
    // Remove markdown file if exists and status is not published
    const filePath = path.join(postsDir, `${post.slug}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted markdown file: ${post.slug}.md`);
    }
    return;
  }

  // Ensure posts directory exists
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  // Format tags as YAML array
  const tagsArray = post.tags && post.tags.length > 0
    ? `\ntags:\n${post.tags.map(tag => `  - ${tag}`).join('\n')}`
    : '';

  // Format background image
  const backgroundImageField = post.backgroundImage
    ? `\nbackgroundImage: ${post.backgroundImage}`
    : '';

  // Add status field for published posts
  const statusField = post.status === 'published'
    ? '\nstatus: published'
    : '';

  // Create frontmatter
  const frontmatter = `---
title: ${post.title}
pubDate: ${post.pubDate.toISOString().split('T')[0]}
description: ${post.excerpt || post.title}${tagsArray}${backgroundImageField}${statusField}
---`;

  // Write markdown file
  const filePath = path.join(postsDir, `${post.slug}.md`);
  fs.writeFileSync(filePath, frontmatter + '\n\n' + post.content);
  logger.info(`Synced markdown file: ${post.slug}.md`);
}

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    content TEXT NOT NULL,
    excerpt TEXT,
    pub_date INTEGER NOT NULL,
    updated_date INTEGER,
    tags TEXT,
    status TEXT DEFAULT 'draft',
    background_image TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    author TEXT NOT NULL,
    email TEXT NOT NULL,
    content TEXT NOT NULL,
    user_agent TEXT,
    device_type TEXT,
    ip_address TEXT,
    status TEXT DEFAULT 'pending',
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS homepage_settings (
    id TEXT PRIMARY KEY DEFAULT 'settings',
    posts_per_page INTEGER DEFAULT 10,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS post_categories (
    post_id TEXT NOT NULL,
    category_id TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );

  -- Insert default settings if not exists
  INSERT OR IGNORE INTO homepage_settings (id, posts_per_page) VALUES ('settings', 10);
`);

// Create default admin user and migrate existing passwords to bcrypt
const defaultAdminId = 'admin-001';
const checkAdmin = db.prepare('SELECT id, username, password, password_hash FROM admin_users WHERE id = ?').get(defaultAdminId);
if (!checkAdmin) {
  // Create new admin user with bcrypt password
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admin_users (id, username, password, password_hash) VALUES (?, ?, ?, ?)').run(defaultAdminId, 'admin', '', passwordHash);
  logger.info('Default admin user created');
} else if (checkAdmin.password && !checkAdmin.password_hash) {
  // Migrate existing Base64 password to bcrypt
  const oldPasswordHash = checkAdmin.password; // Base64 format: admin:password
  const password = oldPasswordHash.split(':')[1] || 'admin123'; // Extract password from Base64
  const bcryptHash = bcrypt.hashSync(password, 10);
  db.prepare('UPDATE admin_users SET password_hash = ?, password = ? WHERE id = ?').run(bcryptHash, '', defaultAdminId);
  logger.info('Migrated admin password to bcrypt');
}

// Add hidden and archived columns if they don't exist
try {
  const columns = db.prepare('PRAGMA table_info(posts)').all();
  const columnNames = columns.map(col => col.name);

  if (!columnNames.includes('hidden')) {
    db.exec('ALTER TABLE posts ADD COLUMN hidden INTEGER DEFAULT 0');
    logger.info('Added hidden column to posts table');
  }

  if (!columnNames.includes('archived')) {
    db.exec('ALTER TABLE posts ADD COLUMN archived INTEGER DEFAULT 0');
    logger.info('Added archived column to posts table');
  }

  if (!columnNames.includes('pinned_post')) {
    db.exec('ALTER TABLE posts ADD COLUMN pinned_post INTEGER DEFAULT 0');
    logger.info('Added pinned_post column to posts table');
  }
} catch (error) {
  logger.info('Note: Columns may already exist or ALTER TABLE not supported:', error.message);
}

// Parse allowed origins from environment
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '').split(',').filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:4321', 'http://localhost:4322', 'http://localhost:3001'],
  credentials: true
}));
app.use(express.json());
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'fallback-secret-key-please-change'],
  maxAge: parseInt(process.env.SESSION_MAX_AGE || '86400000'),
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  secure: process.env.COOKIE_SECURE === 'true',
  httpOnly: true
}));

// Auth middleware
function requireAuth(req, res, next) {
  if (req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: '未授权' });
  }
}

// Helper functions
const postDb = {
  getAll: (status) => {
    let query = 'SELECT * FROM posts';
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
    }
    query += ' ORDER BY pub_date DESC';
    const stmt = db.prepare(query);
    const rows = status && status !== 'all' ? stmt.all(status) : stmt.all();
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      status: row.status,
      backgroundImage: row.background_image,
      archived: Boolean(row.archived),
      hidden: Boolean(row.hidden),
      pinnedPost: Boolean(row.pinned_post),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  },

  getById: (id) => {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id);
    if (!row) return undefined;
    return {
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      status: row.status,
      backgroundImage: row.background_image,
      archived: Boolean(row.archived),
      hidden: Boolean(row.hidden),
      pinnedPost: Boolean(row.pinned_post),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  create: (post) => {
    const id = `post-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO posts (id, title, slug, content, excerpt, pub_date, updated_date, tags, status, background_image)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    // Handle both Date objects and ISO strings
    const pubDate = post.pubDate instanceof Date ? post.pubDate : new Date(post.pubDate);
    const updatedDate = post.updatedDate ? (post.updatedDate instanceof Date ? post.updatedDate : new Date(post.updatedDate)) : null;

    stmt.run(
      id,
      post.title,
      post.slug,
      post.content,
      post.excerpt || '',
      pubDate.getTime(),
      updatedDate ? updatedDate.getTime() : now,
      JSON.stringify(post.tags || []),
      post.status || 'draft',
      post.backgroundImage || null
    );
    const newPost = postDb.getById(id);

    // Sync to markdown file
    syncMarkdownFile(newPost);

    // Trigger rebuild in background (don't wait)
    if (newPost.status === 'published') {
      triggerRebuild();
    }

    return newPost;
  },

  update: (id, post) => {
    const existing = postDb.getById(id);
    if (!existing) return undefined;

    // Delete old markdown file if slug is changing
    if (post.slug !== undefined && post.slug !== existing.slug) {
      const oldFilePath = path.join(postsDir, `${existing.slug}.md`);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    const updates = [];
    const values = [];

    if (post.title !== undefined) {
      updates.push('title = ?');
      values.push(post.title);
    }
    if (post.slug !== undefined) {
      updates.push('slug = ?');
      values.push(post.slug);
    }
    if (post.content !== undefined) {
      updates.push('content = ?');
      values.push(post.content);
    }
    if (post.excerpt !== undefined) {
      updates.push('excerpt = ?');
      values.push(post.excerpt);
    }
    if (post.pubDate !== undefined) {
      updates.push('pub_date = ?');
      // Handle both Date objects and ISO strings
      const pubDate = post.pubDate instanceof Date ? post.pubDate : new Date(post.pubDate);
      values.push(pubDate.getTime());
    }
    if (post.tags !== undefined) {
      updates.push('tags = ?');
      values.push(JSON.stringify(post.tags));
    }
    if (post.status !== undefined) {
      updates.push('status = ?');
      values.push(post.status);
    }
    if (post.backgroundImage !== undefined) {
      updates.push('background_image = ?');
      values.push(post.backgroundImage);
    }
    if (post.archived !== undefined) {
      updates.push('archived = ?');
      values.push(post.archived ? 1 : 0);
    }
    if (post.hidden !== undefined) {
      updates.push('hidden = ?');
      values.push(post.hidden ? 1 : 0);
    }
    if (post.pinnedPost !== undefined) {
      updates.push('pinned_post = ?');
      values.push(post.pinnedPost ? 1 : 0);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    const updatedPost = postDb.getById(id);

    // Sync to markdown file
    syncMarkdownFile(updatedPost);

    // Trigger rebuild in background (don't wait)
    if (updatedPost.status === 'published') {
      triggerRebuild();
    }

    return updatedPost;
  },

  delete: (id) => {
    const post = postDb.getById(id);
    if (!post) return false;

    // Delete markdown file if exists
    const filePath = path.join(postsDir, `${post.slug}.md`);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info(`Deleted markdown file: ${post.slug}.md`);
    }

    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);

    // Trigger rebuild in background (don't wait)
    if (result.changes > 0 && post.status === 'published') {
      triggerRebuild();
    }

    return result.changes > 0;
  },
};

const authDb = {
  verifyUser: (username, password) => {
    // Get user with password_hash
    const row = db.prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ?').get(username);
    if (!row) {
      return null;
    }
    // Check password using bcrypt
    const isValid = bcrypt.compareSync(password, row.password_hash);
    if (!isValid) {
      return null;
    }
    // Return user without password_hash
    return { id: row.id, username: row.username };
  },
};

// Routes
app.post('/api/admin/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }
  const user = authDb.verifyUser(username, password);
  if (!user) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.json({ success: true, user: { id: user.id, username: user.username } });
});

app.post('/api/admin/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true });
});

app.get('/api/admin/auth/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      user: { id: req.session.userId, username: req.session.username }
    });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

app.get('/api/admin/posts', requireAuth, (req, res) => {
  const status = req.query.status || 'all';
  try {
    const posts = postDb.getAll(status);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

app.post('/api/admin/posts', requireAuth, (req, res) => {
  const { title, slug, content, excerpt, tags, status } = req.body;
  if (!title || !slug || !content) {
    return res.status(400).json({ error: '标题、slug和内容不能为空' });
  }
  try {
    const post = postDb.create({
      title,
      slug,
      content,
      excerpt,
      pubDate: new Date(),
      tags: tags || [],
      status: status || 'draft',
    });
    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message || '创建文章失败' });
  }
});

app.get('/api/admin/posts/:id', requireAuth, (req, res) => {
  try {
    const post = postDb.getById(req.params.id);
    if (!post) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json({ post });
  } catch (error) {
    res.status(500).json({ error: '获取文章失败' });
  }
});

app.put('/api/admin/posts/:id', requireAuth, (req, res) => {
  try {
    const post = postDb.update(req.params.id, req.body);
    if (!post) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json({ success: true, post });
  } catch (error) {
    res.status(500).json({ error: error.message || '更新文章失败' });
  }
});

app.delete('/api/admin/posts/:id', requireAuth, (req, res) => {
  try {
    const success = postDb.delete(req.params.id);
    if (!success) {
      return res.status(404).json({ error: '文章不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除文章失败' });
  }
});

// Settings API
app.get('/api/admin/settings', requireAuth, (req, res) => {
  try {
    // Get current pinned post
    const pinnedPost = db.prepare('SELECT id, title FROM posts WHERE pinned_post = 1').get();

    // Get homepage settings
    const homepageSettings = db.prepare('SELECT posts_per_page FROM homepage_settings WHERE id = ?').get('settings');

    res.json({
      pinnedPost: pinnedPost || null,
      postsPerPage: homepageSettings?.posts_per_page || 10
    });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

app.post('/api/admin/settings/pin', requireAuth, (req, res) => {
  const { postId } = req.body;
  if (!postId) {
    // Unpin all posts
    db.prepare('UPDATE posts SET pinned_post = 0').run();
    res.json({ success: true });
    return;
  }

  try {
    // Unpin all posts first (only one pinned post at a time)
    db.prepare('UPDATE posts SET pinned_post = 0').run();
    // Pin the selected post
    db.prepare('UPDATE posts SET pinned_post = 1 WHERE id = ?').run(postId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message || '设置置顶失败' });
  }
});

app.post('/api/admin/settings/posts-per-page', requireAuth, (req, res) => {
  logger.info('POST /api/admin/settings/posts-per-page called with body:', req.body);
  const { postsPerPage } = req.body;
  if (!postsPerPage || postsPerPage < 1 || postsPerPage > 50) {
    logger.info('Invalid postsPerPage value:', postsPerPage);
    return res.status(400).json({ error: '每页文章数必须在 1-50 之间' });
  }

  try {
    db.prepare('UPDATE homepage_settings SET posts_per_page = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(postsPerPage, 'settings');
    logger.info('Successfully updated posts_per_page to:', postsPerPage);
    res.json({ success: true });
  } catch (error) {
    logger.error('Error updating posts_per_page:', error);
    res.status(500).json({ error: error.message || '更新设置失败' });
  }
});

// Public API for homepage settings (no auth required)
app.get('/api/homepage/settings', (req, res) => {
  try {
    // Get pinned post slug (if any) - exclude hidden posts
    const pinnedPost = db.prepare('SELECT id, title, slug FROM posts WHERE pinned_post = 1 AND status = ? AND (hidden IS NULL OR hidden = 0)').get('published');

    // Get homepage settings
    const homepageSettings = db.prepare('SELECT posts_per_page FROM homepage_settings WHERE id = ?').get('settings');

    res.json({
      pinnedPostSlug: pinnedPost?.slug || null,
      pinnedPostTitle: pinnedPost?.title || null,
      postsPerPage: homepageSettings?.posts_per_page || 10
    });
  } catch (error) {
    res.status(500).json({ error: '获取设置失败' });
  }
});

// Categories API
app.get('/api/admin/categories', requireAuth, (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

app.post('/api/admin/categories', requireAuth, (req, res) => {
  const { name, slug, description } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: '分类名称和别名不能为空' });
  }

  try {
    const id = 'cat-' + Date.now();
    db.prepare('INSERT INTO categories (id, name, slug, description) VALUES (?, ?, ?, ?)').run(id, name, slug, description || null);
    res.json({ success: true, category: { id, name, slug, description } });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: '分类名称或别名已存在' });
    } else {
      res.status(500).json({ error: '创建分类失败' });
    }
  }
});

app.put('/api/admin/categories/:id', requireAuth, (req, res) => {
  const { name, slug, description } = req.body;
  if (!name || !slug) {
    return res.status(400).json({ error: '分类名称和别名不能为空' });
  }

  try {
    db.prepare('UPDATE categories SET name = ?, slug = ?, description = ?, updated_at = strftime(\'%s\', \'now\') WHERE id = ?').run(name, slug, description || null, req.params.id);
    res.json({ success: true });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      res.status(400).json({ error: '分类名称或别名已存在' });
    } else {
      res.status(500).json({ error: '更新分类失败' });
    }
  }
});

app.delete('/api/admin/categories/:id', requireAuth, (req, res) => {
  try {
    db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除分类失败' });
  }
});

// Post categories API
app.get('/api/admin/posts/:id/categories', requireAuth, (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug
      FROM categories c
      INNER JOIN post_categories pc ON c.id = pc.category_id
      WHERE pc.post_id = ?
    `).all(req.params.id);
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: '获取文章分类失败' });
  }
});

app.put('/api/admin/posts/:id/categories', requireAuth, (req, res) => {
  const { categoryIds } = req.body;
  if (!Array.isArray(categoryIds)) {
    return res.status(400).json({ error: '分类ID必须是数组' });
  }

  try {
    // Delete existing categories
    db.prepare('DELETE FROM post_categories WHERE post_id = ?').run(req.params.id);

    // Add new categories
    categoryIds.forEach(catId => {
      if (catId) {
        db.prepare('INSERT INTO post_categories (post_id, category_id) VALUES (?, ?)').run(req.params.id, catId);
      }
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新文章分类失败' });
  }
});

// Public API for categories
app.get('/api/categories', (req, res) => {
  try {
    const categories = db.prepare(`
      SELECT c.id, c.name, c.slug, c.description,
             COUNT(pc.post_id) as post_count
      FROM categories c
      LEFT JOIN post_categories pc ON c.id = pc.category_id
      LEFT JOIN posts p ON pc.post_id = p.id AND p.status = 'published' AND (p.hidden IS NULL OR p.hidden = 0)
      GROUP BY c.id
      ORDER BY c.name
    `).all();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: '获取分类失败' });
  }
});

app.get('/api/categories/:slug/posts', (req, res) => {
  try {
    const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
    if (!category) {
      return res.status(404).json({ error: '分类不存在' });
    }

    const posts = db.prepare(`
      SELECT p.id, p.title, p.slug, p.excerpt, p.pub_date, p.updated_date, p.tags, p.background_image
      FROM posts p
      INNER JOIN post_categories pc ON p.id = pc.post_id
      WHERE pc.category_id = ? AND p.status = 'published' AND (p.hidden IS NULL OR p.hidden = 0)
      ORDER BY p.pub_date DESC
    `).all(category.id);

    const result = posts.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt: row.excerpt,
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : null,
      tags: row.tags ? JSON.parse(row.tags) : [],
      backgroundImage: row.background_image,
    }));

    res.json({ category, posts: result });
  } catch (error) {
    res.status(500).json({ error: '获取分类文章失败' });
  }
});

// Public API for posts list (no auth required) - excludes hidden posts
app.get('/api/posts', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Get total count of non-hidden published posts
    const totalCount = db.prepare('SELECT COUNT(*) as count FROM posts WHERE status = ? AND (hidden IS NULL OR hidden = 0)').get('published').count;

    // Get paginated posts - exclude hidden posts, pinned posts first
    const posts = db.prepare(
      'SELECT * FROM posts WHERE status = ? AND (hidden IS NULL OR hidden = 0) ORDER BY CASE WHEN pinned_post = 1 THEN 0 ELSE 1 END, pub_date DESC LIMIT ? OFFSET ?'
    ).all('published', limit, offset);

    const result = posts.map((row) => {
      // Calculate word count from content
      const content = row.content || '';
      const wordCount = content.length;

      // Get categories for this post
      const categories = db.prepare(`
        SELECT c.id, c.name, c.slug
        FROM categories c
        INNER JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `).all(row.id);

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        pubDate: new Date(row.pub_date),
        updatedDate: row.updated_date ? new Date(row.updated_date) : null,
        wordCount: wordCount,
        categories: categories.map(cat => ({ name: cat.name, url: `/categories/${cat.slug}` })),
        tags: row.tags ? JSON.parse(row.tags) : [],
        backgroundImage: row.background_image,
        pinnedPost: Boolean(row.pinned_post),
      };
    });

    res.json({
      posts: result,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

// Public API for all posts (for archive, categories, tags) - excludes hidden posts
app.get('/api/posts/all', (req, res) => {
  try {
    const posts = db.prepare(
      'SELECT * FROM posts WHERE status = ? AND (hidden IS NULL OR hidden = 0) ORDER BY pub_date DESC'
    ).all('published');

    const result = posts.map((row) => {
      // Calculate word count from content
      const content = row.content || '';
      const wordCount = content.length;

      // Get categories for this post
      const categories = db.prepare(`
        SELECT c.id, c.name, c.slug
        FROM categories c
        INNER JOIN post_categories pc ON c.id = pc.category_id
        WHERE pc.post_id = ?
      `).all(row.id);

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt: row.excerpt,
        pubDate: new Date(row.pub_date),
        updatedDate: row.updated_date ? new Date(row.updated_date) : null,
        wordCount: wordCount,
        categories: categories.map(cat => ({ name: cat.name, url: `/categories/${cat.slug}` })),
        tags: row.tags ? JSON.parse(row.tags) : [],
        backgroundImage: row.background_image,
        pinnedPost: Boolean(row.pinned_post),
      };
    });

    res.json({ posts: result });
  } catch (error) {
    res.status(500).json({ error: '获取文章列表失败' });
  }
});

app.listen(PORT, () => {
  logger.info(`Admin API server running on http://localhost:${PORT}`);
});
