import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/blog.db');

// Ensure data directory exists
import * as fs from 'node:fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize database schema
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
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
  CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
  CREATE INDEX IF NOT EXISTS idx_posts_pub_date ON posts(pub_date);
`);

// Create default admin user (password: admin123 - change this!)
const defaultAdminId = 'admin-001';
const checkAdmin = db.prepare('SELECT id FROM admin_users WHERE id = ?').get(defaultAdminId);
if (!checkAdmin) {
  const passwordHash = Buffer.from('admin:' + 'admin123').toString('base64'); // Simple encoding for demo - use bcrypt in production
  db.prepare('INSERT INTO admin_users (id, username, password) VALUES (?, ?, ?)').run(defaultAdminId, 'admin', passwordHash);
  console.log('Default admin user created: username=admin, password=admin123');
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  pubDate: Date;
  updatedDate?: Date;
  tags?: string[];
  status?: 'draft' | 'published';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NewPost {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  pubDate: Date;
  updatedDate?: Date;
  tags?: string[];
  status?: 'draft' | 'published';
}

// Post operations
export const postDb = {
  getAll: (status?: 'draft' | 'published' | 'all'): Post[] => {
    let query = 'SELECT * FROM posts';
    if (status && status !== 'all') {
      query += ' WHERE status = ?';
    }
    query += ' ORDER BY pub_date DESC';
    const stmt = db.prepare(query);
    const rows = status && status !== 'all' ? stmt.all(status) : stmt.all();
    return rows.map((row: any) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      content: row.content,
      excerpt: row.excerpt,
      pubDate: new Date(row.pub_date),
      updatedDate: row.updated_date ? new Date(row.updated_date) : undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      status: row.status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  },

  getById: (id: string): Post | undefined => {
    const row = db.prepare('SELECT * FROM posts WHERE id = ?').get(id) as any;
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  getBySlug: (slug: string): Post | undefined => {
    const row = db.prepare('SELECT * FROM posts WHERE slug = ?').get(slug) as any;
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  create: (post: NewPost): Post => {
    const id = `post-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const now = Date.now();
    const stmt = db.prepare(`
      INSERT INTO posts (id, title, slug, content, excerpt, pub_date, updated_date, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      post.title,
      post.slug,
      post.content,
      post.excerpt || '',
      (post.pubDate instanceof Date ? post.pubDate : new Date(post.pubDate)).getTime(),
      post.updatedDate ? (post.updatedDate instanceof Date ? post.updatedDate : new Date(post.updatedDate)).getTime() : now,
      JSON.stringify(post.tags || []),
      post.status || 'draft'
    );
    return postDb.getById(id)!;
  },

  update: (id: string, post: Partial<NewPost>): Post | undefined => {
    const existing = postDb.getById(id);
    if (!existing) return undefined;

    const updates: string[] = [];
    const values: any[] = [];

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

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE posts SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);
    return postDb.getById(id);
  },

  delete: (id: string): boolean => {
    const stmt = db.prepare('DELETE FROM posts WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  },

  publish: (id: string): Post | undefined => {
    return postDb.update(id, { status: 'published' });
  },

  unpublish: (id: string): Post | undefined => {
    return postDb.update(id, { status: 'draft' });
  },
};

// Auth operations
export const authDb = {
  verifyUser: (username: string, password: string): { id: string; username: string } | null => {
    const passwordHash = Buffer.from('admin:' + password).toString('base64');
    const row = db.prepare('SELECT id, username FROM admin_users WHERE username = ? AND password = ?').get(username, passwordHash);
    return row as { id: string; username: string } | null;
  },

  changePassword: (userId: string, newPassword: string): boolean => {
    const passwordHash = Buffer.from('admin:' + newPassword).toString('base64');
    const stmt = db.prepare('UPDATE admin_users SET password = ? WHERE id = ?');
    const result = stmt.run(passwordHash, userId);
    return result.changes > 0;
  },
};

export default db;
