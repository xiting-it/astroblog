#!/bin/bash

echo "🔄 快速更新博客内容..."

# 进入项目目录
cd /root/astroblog

# 检查是否已经在构建中
if [ -f /tmp/astro-blog-building.lock ]; then
    echo "⚠️ 构建已在进行中，跳过此次更新"
    exit 0
fi

# 创建构建锁文件
touch /tmp/astro-blog-building.lock

# 重新构建（不检查类型）
echo "🔨 开始构建..."
if ./node_modules/.bin/astro build --no-check; then
    echo "✅ 构建成功"
else
    echo "❌ 构建失败"
    rm -f /tmp/astro-blog-building.lock
    exit 1
fi

# 等待一小段时间确保文件写入完成
sleep 1

# 重启PM2服务
echo "🔄 重启服务..."
if /root/.nvm/versions/node/v24.13.1/bin/pm2 restart astro-blog; then
    echo "✅ 服务重启成功"
else
    echo "❌ 服务重启失败"
    rm -f /tmp/astro-blog-building.lock
    exit 1
fi

# 删除构建锁文件
rm -f /tmp/astro-blog-building.lock

echo "✅ 更新完成！"
