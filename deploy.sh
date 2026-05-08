#!/bin/bash

# Astro 博客部署脚本（支持从 Typecho 迁移）
# 适用于 Ubuntu 服务器

set -e

echo "🚀 Astro 博客部署脚本"
echo "========================"
echo ""
echo "请选择部署模式："
echo "1) 全新部署"
echo "2) 从 Typecho 迁移"
echo ""
read -p "请输入选项 (1/2): " choice

case $choice in
  1)
    echo ""
    echo "📦 开始全新部署..."
    ;;
  2)
    echo ""
    echo "🔄 开始从 Typecho 迁移..."
    echo ""
    echo "⚠️  注意：迁移前请确保已备份 Typecho 数据！"
    echo ""
    read -p "是否已备份？(y/n): " backup_confirm

    if [ "$backup_confirm" != "y" ]; then
      echo "❌ 请先备份 Typecho 数据后再运行此脚本"
      exit 1
    fi

    # 检查并停止 Typecho
    echo ""
    echo "🛑 检查 Typecho Docker 容器..."
    typecho_container=$(docker ps -q --filter "name=typecho" 2>/dev/null || true)

    if [ -n "$typecho_container" ]; then
      echo "发现 Typecho 容器: $typecho_container"
      read -p "是否停止 Typecho 容器？(y/n): " stop_typecho

      if [ "$stop_typecho" = "y" ]; then
        docker stop $typecho_container
        echo "✅ Typecho 容器已停止"
      fi
    fi

    # 安装迁移依赖
    echo ""
    echo "📦 安装迁移工具依赖..."
    npm install mysql2

    # 配置数据库连接
    echo ""
    echo "📝 请输入 Typecho 数据库信息："
    read -p "数据库主机 (默认: localhost): " db_host
    db_host=${db_host:-localhost}

    read -p "数据库用户名: " db_user
    read -sp "数据库密码: " db_pass
    echo ""

    read -p "数据库名 (默认: typecho): " db_name
    db_name=${db_name:-typecho}

    # 更新迁移脚本配置
    sed -i "s/host: 'localhost'/host: '$db_host'/" migrate-typecho.js
    sed -i "s/user: 'root'/user: '$db_user'/" migrate-typecho.js
    sed -i "s/password: ''/password: '$db_pass'/" migrate-typecho.js
    sed -i "s/database: 'typecho'/database: '$db_name'/" migrate-typecho.js

    # 运行迁移
    echo ""
    echo "🔄 开始迁移 Typecho 文章..."
    node migrate-typecho.js

    echo ""
    echo "✅ Typecho 迁移完成！"
    ;;
  *)
    echo "❌ 无效选项"
    exit 1
    ;;
esac

# 检查 Node.js 环境
if ! command -v node &> /dev/null; then
    echo "❌ 未检测到 Node.js，正在安装..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js 版本: $(node -v)"
echo "✅ npm 版本: $(npm -v)"

# 安装 PM2（如果未安装）
if ! command -v pm2 &> /dev/null; then
    echo "📦 正在安装 PM2..."
    sudo npm install -g pm2
fi

# 创建日志目录
mkdir -p logs

# 安装依赖
echo "📦 正在安装项目依赖..."
npm install

# 构建项目
echo "🔨 正在构建项目..."
npm run build

# 停止旧的应用（如果存在）
if pm2 describe astro-blog &> /dev/null; then
    echo "🛑 停止旧的应用..."
    pm2 stop astro-blog admin-api 2>/dev/null || true
    pm2 delete astro-blog admin-api 2>/dev/null || true
fi

# 启动新的应用
echo "🚀 正在启动应用..."
pm2 start ecosystem.config.cjs

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup | tail -n 1 | sudo bash || echo "⚠️  请手动执行: pm2 startup"

echo ""
echo "✅ 部署完成！"
echo ""
echo "📊 应用状态："
pm2 status
echo ""
echo "📝 查看日志："
echo "  - Astro 博客: pm2 logs astro-blog"
echo "  - Admin API: pm2 logs admin-api"
echo ""
echo "🌐 访问地址："
echo "  - 博客前台: http://localhost:3001"
echo "  - Admin API: http://localhost:3002"
echo ""
echo "📌 下一步："
echo "  1. 配置 Nginx 反向代理（可选）"
echo "  2. 配置域名 DNS 解析到服务器 IP"
echo "  3. 配置 SSL 证书（Let's Encrypt）"
echo ""
echo "📖 部署文档: DEPLOY.md"
if [ "$choice" = "2" ]; then
  echo "📖 迁移文档: MIGRATE.md"
fi
