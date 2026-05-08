#!/usr/bin/env node

/**
 * Typecho to Astro 迁移脚本
 * 用于从 Typecho 数据库导出文章并转换为 Astro Markdown 格式
 *
 * 使用前请确保：
 * 1. 已安装 Node.js
 * 2. 有 Typecho 数据库的访问权限
 * 3. 已安装依赖: npm install mysql2
 */

import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Typecho 数据库配置
const dbConfig = {
  host: 'localhost',
  user: 'typecho',
  password: 'typechopassword',
  database: 'typecho', // Typecho 数据库名
  charset: 'utf8mb4',
};

// Astro 内容目录
const astroContentDir = path.join(__dirname, 'src', 'content', 'posts');

// 创建目录（如果不存在）
if (!fs.existsSync(astroContentDir)) {
  fs.mkdirSync(astroContentDir, { recursive: true });
}

/**
 * 将 HTML 内容转换为 Markdown 格式
 */
function htmlToMarkdown(html) {
  if (!html) return '';

  let markdown = html;

  // 标题转换
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n\n');

  // 粗体和斜体
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // 删除线
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/gi, '~~$1~~');
  markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~');

  // 代码块
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n');
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

  // 链接
  markdown = markdown.replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');

  // 图片
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi, '![$2]($1)');
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*>/gi, '![]($1)');

  // 引用
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, '> $1\n\n');

  // 无序列表
  markdown = markdown.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (match, content) => {
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
  });

  // 有序列表
  markdown = markdown.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (match, content) => {
    let index = 1;
    return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${index++}. $1\n`);
  });

  // 段落
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n');

  // 换行
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n');

  // 清理多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n');

  // 解码 HTML 实体
  markdown = markdown.replace(/&nbsp;/g, ' ');
  markdown = markdown.replace(/&lt;/g, '<');
  markdown = markdown.replace(/&gt;/g, '>');
  markdown = markdown.replace(/&amp;/g, '&');
  markdown = markdown.replace(/&quot;/g, '"');
  markdown = markdown.replace(/&#39;/g, "'");

  return markdown.trim();
}

/**
 * 格式化日期为 ISO 格式
 */
function formatDate(date) {
  if (!date) return new Date().toISOString().split('T')[0];
  return new Date(date).toISOString().split('T')[0];
}

/**
 * 生成文章 slug
 */
function generateSlug(title, created) {
  // 简单的 slug 生成策略
  const date = new Date(created);
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const slug = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `${dateStr}-${slug}`;
}

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('🚀 开始从 Typecho 迁移到 Astro...\n');

  let connection;

  try {
    // 连接数据库
    console.log('📡 连接到 Typecho 数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功\n');

    // 查询文章
    console.log('📝 导出文章...');
    const [posts] = await connection.execute(`
      SELECT
        cid,
        title,
        slug,
        created,
        modified,
        text,
        views,
        commentsNum
      FROM typecho_contents
      WHERE type = 'post'
      AND status = 'publish'
      ORDER BY created ASC
    `);

    console.log(`✅ 找到 ${posts.length} 篇文章\n`);

    // 查询标签和分类
    console.log('🏷️  导出标签和分类...');
    const [metas] = await connection.execute(`
      SELECT
        m.cid,
        m.name,
        m.slug,
        m.type,
        r.cid as post_id
      FROM typecho_metas m
      INNER JOIN typecho_relationships r ON m.mid = r.mid
      WHERE m.type IN ('category', 'tag')
      ORDER BY m.cid
    `);

    // 组织标签和分类数据
    const postMetas = {};
    metas.forEach(meta => {
      const postId = meta.post_id;
      if (!postMetas[postId]) {
        postMetas[postId] = { tags: [], categories: [] };
      }
      if (meta.type === 'category') {
        postMetas[postId].categories.push(meta.name);
      } else if (meta.type === 'tag') {
        postMetas[postId].tags.push(meta.name);
      }
    });

    console.log(`✅ 找到 ${metas.length} 个标签和分类\n`);

    // 转换文章为 Markdown
    console.log('🔄 转换文章格式...');
    let successCount = 0;
    let errorCount = 0;

    for (const post of posts) {
      try {
        const slug = post.slug || generateSlug(post.title, post.created);
        const fileName = `${slug}.md`;
        const filePath = path.join(astroContentDir, fileName);

        // 获取文章的标签和分类
        const meta = postMetas[post.cid] || { tags: [], categories: [] };

        // 转换内容为 Markdown
        const content = htmlToMarkdown(post.text);

        // 生成 frontmatter
        const frontmatter = `---
title: '${post.title.replace(/'/g, "''")}'
pubDate: ${formatDate(post.created * 1000)}
${post.modified ? `updatedDate: ${formatDate(post.modified * 1000)}` : ''}
description: '${post.title.replace(/'/g, "''")}'
${meta.tags.length > 0 ? `tags:\n${meta.tags.map(t => `  - '${t}'`).join('\n')}` : ''}
${meta.categories.length > 0 ? `category: '${meta.categories[0]}'` : ''}
---

${content}
`;

        // 写入文件
        fs.writeFileSync(filePath, frontmatter, 'utf8');
        successCount++;
        console.log(`  ✅ ${post.title}`);
      } catch (error) {
        errorCount++;
        console.error(`  ❌ ${post.title}: ${error.message}`);
      }
    }

    console.log(`\n✅ 迁移完成！`);
    console.log(`  成功: ${successCount} 篇`);
    console.log(`  失败: ${errorCount} 篇`);

    // 生成统计报告
    const reportPath = path.join(__dirname, 'migration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify({
      total: posts.length,
      success: successCount,
      failed: errorCount,
      timestamp: new Date().toISOString()
    }, null, 2));

    console.log(`\n📊 迁移报告已保存到: ${reportPath}`);

  } catch (error) {
    console.error('❌ 迁移失败:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行迁移
migrate();
