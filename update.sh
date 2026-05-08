#!/bin/bash
# 博客更新和部署脚本

set -e

echo "🔄 开始更新博客..."

# 进入项目目录
cd /root/astroblog

# 构建博客
echo "📦 构建中..."
npm run build

# 复制到 nginx 目录（如果需要不同的部署位置）
# cp -r dist/* /var/www/html/

echo "✅ 构建完成！"
echo "🌐 博客已更新: http://localhost:3001"
echo ""
echo "📝 写新文章："
echo "   1. 在 src/content/posts/ 创建 .md 文件"
echo "   2. 运行 ./update.sh"
echo ""
echo "📥 添加下载资源："
echo "   1. 在 src/content/resources/ 创建 .md 文件"
echo "   2. 将文件放到 public/ 目录"
echo "   3. 运行 ./update.sh"
