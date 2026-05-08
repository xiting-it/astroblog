# Astro 博客部署指南

## 部署到 blog.xitingit.top

### 前提条件
- Ubuntu 服务器（18.04+）
- 服务器 root 或 sudo 权限
- 域名 blog.xitingit.top 已解析到服务器 IP

### 部署步骤

#### 1. 上传项目文件到服务器

```bash
# 在本地打包项目（排除 node_modules）
tar -czf astroblog.tar.gz --exclude=node_modules --exclude=dist --exclude=.astro \
    --exclude=logs astroblog/

# 上传到服务器
scp astroblog.tar.gz user@your-server-ip:/home/user/

# 在服务器上解压
ssh user@your-server-ip
cd /home/user/
mkdir -p /var/www/astroblog
tar -xzf astroblog.tar.gz -C /var/www/astroblog
cd /var/www/astroblog
```

#### 2. 安装 Node.js（如果未安装）

```bash
# 检查 Node.js 版本
node -v

# 如果未安装或版本过低
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### 3. 安装 PM2 进程管理器

```bash
sudo npm install -g pm2
```

#### 4. 运行部署脚本

```bash
cd /var/www/astroblog
chmod +x deploy.sh
./deploy.sh
```

#### 5. 配置 Nginx（可选但推荐）

```bash
# 安装 Nginx
sudo apt update
sudo apt install nginx -y

# 复制配置文件
sudo cp nginx.conf.example /etc/nginx/sites-available/blog.xitingit.top

# 创建软链接启用站点
sudo ln -s /etc/nginx/sites-available/blog.xitingit.top /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

#### 6. 配置 SSL 证书（Let's Encrypt）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 获取 SSL 证书
sudo certbot --nginx -d blog.xitingit.top

# 自动续期（已自动配置）
sudo certbot renew --dry-run
```

#### 7. 配置域名 DNS

在您的域名提供商（xitingit.top）添加 DNS 记录：

```
类型: A
主机记录: blog
记录值: 您的服务器 IP 地址
TTL: 600
```

### 常用管理命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs astro-blog
pm2 logs admin-api

# 重启应用
pm2 restart astro-blog
pm2 restart admin-api

# 停止应用
pm2 stop astro-blog admin-api

# 删除应用
pm2 delete astro-blog admin-api

# 保存 PM2 配置
pm2 save

# 监控
pm2 monit
```

### 端口说明

- **3001**: Astro 博客前端
- **3002**: Admin API（管理后台）

### 故障排除

#### 应用无法启动
```bash
# 查看错误日志
pm2 logs --err

# 检查端口是否被占用
sudo lsof -i :3001
sudo lsof -i :3002
```

#### Nginx 502 错误
- 确保应用正在运行（pm2 status）
- 检查端口是否正确
- 查看 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`

#### 数据库文件权限
```bash
# 确保数据库文件可写
chmod 664 /var/www/astroblog/database.db
chown www-data:www-data /var/www/astroblog/database.db
```

### 更新部署

当您更新代码后：

```bash
cd /var/www/astroblog
git pull  # 或重新上传文件
npm install
npm run build
pm2 restart astro-blog
```

### 安全建议

1. **配置防火墙**
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

2. **修改默认管理员密码**
- 访问 http://blog.xitingit.top/admin
- 默认账号：admin / admin123
- 登录后立即修改密码

3. **定期备份**
```bash
# 备份数据库
cp /var/www/astroblog/database.db /backup/database-$(date +%Y%m%d).db

# 自动备份脚本（添加到 crontab）
# 0 2 * * * cp /var/www/astroblog/database.db /backup/database-$(date +\%Y\%m\%d).db
```

### 性能优化

1. **启用 PM2 集群模式**
   - 编辑 `ecosystem.config.cjs`
   - 将 `instances: 1` 改为 `instances: 'max'` 或具体数字

2. **配置 CDN**
   - 静态资源可以使用 CDN 加速

3. **启用缓存**
   - Nginx 配置中已包含静态文件缓存

## 完成部署后

访问 http://blog.xitingit.top 查看您的博客！

如有问题，查看日志：
```bash
pm2 logs
```
