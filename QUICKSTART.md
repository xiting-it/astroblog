# 快速开始指南

## 从 Typecho 迁移到 Astro 博客

### 第一步：上传项目到服务器

在本地（/root/astroblog）执行：

```bash
# 打包项目
tar -czf astroblog.tar.gz --exclude=node_modules --exclude=dist --exclude=.astro --exclude=logs .

# 上传到服务器（替换 user 和 IP）
scp astroblog.tar.gz user@your-server-ip:/home/user/
```

### 第二步：在服务器上解压

SSH 登录到服务器后执行：

```bash
# 创建目录
sudo mkdir -p /var/www/astroblog

# 解压项目
sudo tar -xzf /home/user/astroblog.tar.gz -C /var/www/astroblog

# 进入项目目录
cd /var/www/astroblog

# 设置权限
sudo chown -R $USER:$USER /var/www/astroblog
chmod +x *.sh
```

### 第三步：移除 Typecho（如果需要）

```bash
cd /var/www/astroblog
./remove-typecho.sh
```

按照提示操作即可安全移除 Typecho。

### 第四步：部署 Astro 博客

**选项 A：从 Typecho 迁移**

```bash
./deploy.sh
# 选择选项 2（从 Typecho 迁移）
```

脚本会提示您输入 Typecho 数据库信息：
- 数据库主机：通常是 `localhost` 或 Docker 容器名
- 数据库用户名：通常是 `root` 或环境变量中的用户
- 数据库密码：查看 Typecho Docker 环境变量
- 数据库名：通常是 `typecho`

**获取 Typecho 数据库信息：**

```bash
# 查看 Typecho 容器信息
docker ps | grep typecho

# 查看环境变量（包含数据库密码）
docker inspect <typecho-container-name> | grep -A 10 "Env"

# 进入容器查看配置
docker exec -it <typecho-container-name> cat /var/www/html/config.inc.php
```

**选项 B：全新部署**

```bash
./deploy.sh
# 选择选项 1（全新部署）
```

### 第五步：配置 Nginx

```bash
# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/blog.xitingit.top

# 创建软链接
sudo ln -s /etc/nginx/sites-available/blog.xitingit.top /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

### 第六步：配置 SSL 证书

```bash
# 安装 Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d blog.xitingit.top

# 自动续期已配置，测试一下
sudo certbot renew --dry-run
```

### 完成！

访问 https://blog.xitingit.top 查看您的博客！

访问 https://blog.xitingit.top/admin 管理博客（默认：admin/admin123）

## 常用命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 restart all

# 停止应用
pm2 stop all
```

## 故障排除

### 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3001
sudo lsof -i :3002

# 停止占用端口的进程
sudo kill -9 <PID>
```

### 数据库连接失败

```bash
# 检查 Docker 容器网络
docker network ls
docker network inspect bridge

# 如果需要，可以使用 Docker 容器 IP
docker inspect <mysql-container> | grep IPAddress
```

### 迁移失败

```bash
# 查看迁移报告
cat migration-report.json

# 手动检查迁移的文章
ls -la src/content/posts/
```

## 需要帮助？

查看详细文档：
- `DEPLOY.md` - 完整部署指南
- `MIGRATE.md` - Typecho 迁移指南
