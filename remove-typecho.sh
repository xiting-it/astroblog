#!/bin/bash

# Typecho 移除脚本
# 用于安全地移除 Typecho Docker 容器和相关数据

set -e

echo "🗑️  Typecho 移除脚本"
echo "===================="
echo ""
echo "⚠️  警告：此操作将移除 Typecho 相关的所有容器、镜像和数据！"
echo ""
echo "请确认您已经备份了重要数据！"
echo ""
read -p "是否继续？(yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ 操作已取消"
    exit 0
fi

echo ""
echo "🔍 正在查找 Typecho 相关容器..."

# 查找 Typecho 相关容器
typecho_containers=$(docker ps -a --filter "name=typecho" --format "{{.Names}}" 2>/dev/null || true)
mysql_containers=$(docker ps -a --filter "name=mysql" --format "{{.Names}}" 2>/dev/null || true)

if [ -z "$typecho_containers" ] && [ -z "$mysql_containers" ]; then
    echo "ℹ️  未找到 Typecho 相关容器"
else
    echo ""
    echo "找到以下容器："
    [ -n "$typecho_containers" ] && echo "Typecho 容器: $typecho_containers"
    [ -n "$mysql_containers" ] && echo "MySQL 容器: $mysql_containers"

    echo ""
    read -p "是否停止并删除这些容器？(yes/no): " remove_containers

    if [ "$remove_containers" = "yes" ]; then
        # 停止并删除容器
        for container in $typecho_containers $mysql_containers; do
            echo "🛑 停止容器: $container"
            docker stop $container 2>/dev/null || true
            echo "🗑️  删除容器: $container"
            docker rm $container 2>/dev/null || true
        done
        echo "✅ 容器已删除"
    fi
fi

echo ""
echo "🔍 检查相关 Docker 镜像..."

# 查找 Typecho 相关镜像
typecho_images=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "(typecho|mysql:5.7)" || true)

if [ -z "$typecho_images" ]; then
    echo "ℹ️  未找到 Typecho 相关镜像"
else
    echo ""
    echo "找到以下镜像："
    echo "$typecho_images"
    echo ""
    read -p "是否删除这些镜像？(yes/no): " remove_images

    if [ "$remove_images" = "yes" ]; then
        for image in $typecho_images; do
            echo "🗑️  删除镜像: $image"
            docker rmi $image 2>/dev/null || true
        done
        echo "✅ 镜像已删除"
    fi
fi

echo ""
echo "🔍 检查相关数据卷..."

# 查找相关数据卷
typecho_volumes=$(docker volume ls --format "{{.Name}}" | grep -i "typecho\|mysql" || true)

if [ -z "$typecho_volumes" ]; then
    echo "ℹ️  未找到相关数据卷"
else
    echo ""
    echo "找到以下数据卷："
    echo "$typecho_volumes"
    echo ""
    read -p "是否删除这些数据卷？(yes/no): " remove_volumes

    if [ "$remove_volumes" = "yes" ]; then
        for volume in $typecho_volumes; do
            echo "🗑️  删除数据卷: $volume"
            docker volume rm $volume 2>/dev/null || true
        done
        echo "✅ 数据卷已删除"
    fi
fi

echo ""
echo "🔍 检查 Nginx 配置..."

# 检查 Nginx 中的 Typecho 配置
nginx_config="/etc/nginx/sites-available/typecho"

if [ -f "$nginx_config" ]; then
    echo "找到 Nginx 配置: $nginx_config"
    read -p "是否删除 Nginx 配置？(yes/no): " remove_nginx

    if [ "$remove_nginx" = "yes" ]; then
        sudo rm -f "$nginx_config"
        sudo rm -f "/etc/nginx/sites-enabled/typecho"
        sudo systemctl reload nginx
        echo "✅ Nginx 配置已删除"
    fi
else
    echo "ℹ️  未找到 Nginx Typecho 配置"
fi

echo ""
echo "🔍 检查 Typecho 文件目录..."

# 检查常见的 Typecho 安装目录
typecho_dirs=(
    "/var/www/typecho"
    "/var/www/html/typecho"
    "/home/user/typecho"
)

for dir in "${typecho_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "找到目录: $dir"
        read -p "是否删除此目录？(yes/no): " remove_dir

        if [ "$remove_dir" = "yes" ]; then
            sudo rm -rf "$dir"
            echo "✅ 目录已删除"
        fi
    fi
done

echo ""
echo "✅ Typecho 移除完成！"
echo ""
echo "📋 总结："
echo "  - Typecho 容器已删除"
echo "  - 相关镜像已删除"
echo "  - 相关数据卷已删除"
echo "  - Nginx 配置已删除"
echo ""
echo "🚀 现在可以部署 Astro 博客了！"
echo ""
echo "运行部署命令："
echo "  cd /var/www/astroblog"
echo "  ./deploy.sh"
