# Typecho 到 Astro 迁移指南

本指南帮助您从 Typecho 博客迁移到 Astro 博客。

## 前提条件

- Typecho 通过 Docker 部署
- 有服务器访问权限
- 已安装 Node.js 20+

## 步骤 1: 备份 Typecho 数据

```bash
# 备份 Typecho 数据库
docker exec -i <typecho-container-name> mysqldump -u root -p typecho > typecho-backup.sql

# 备份 Typecho 上传的文件（如果有）
docker cp <typecho-container-name>:/var/www/html/usr/uploads ./typecho-uploads-backup
```

## 步骤 2: 获取 Typecho 数据库信息

```bash
# 查看 Typecho Docker 容器信息
docker ps | grep typecho

# 查看 Typecho 环境变量（包含数据库密码）
docker inspect <typecho-container-name> | grep -A 20 "Env"
```

记录以下信息：
- 数据库名
- 数据库用户名
- 数据库密码
- 数据库主机（通常是容器名称或 localhost）

## 步骤 3: 安装迁移工具依赖

```bash
cd /var/www/astroblog
npm install mysql2
```

## 步骤 4: 配置并运行迁移脚本

编辑 `migrate-typecho.js`，修改数据库配置：

```javascript
const dbConfig = {
  host: 'localhost',        // 或 Docker 数据库容器地址
  user: 'your-db-user',     // Typecho 数据库用户名
  password: 'your-db-pass', // Typecho 数据库密码
  database: 'typecho',      // Typecho 数据库名
  charset: 'utf8mb4',
};
```

运行迁移脚本：

```bash
node migrate-typecho.js
```

## 步骤 5: 检查迁移结果

```bash
# 检查生成的文章文件
ls -la src/content/posts/

# 查看迁移报告
cat migration-report.json
```

## 步骤 6: 停止 Typecho Docker 容器

```bash
# 停止 Typecho 容器
docker stop <typecho-container-name>

# 可选：删除容器（如果不再需要）
docker rm <typecho-container-name>

# 停止相关数据库容器（如果只用于 Typecho）
docker stop <mysql-container-name>
```

## 步骤 7: 部署 Astro 博客

```bash
cd /var/www/astroblog
./deploy.sh
```

## 迁移后的处理

### 图片迁移

如果 Typecho 文章中有图片，需要手动处理：

1. **本地图片**：复制 `typecho-uploads-backup` 中的图片到 Astro 的 `public/images/` 目录
2. **外部图床**：通常不需要处理
3. **更新图片路径**：可能需要在 Markdown 文件中批量替换图片路径

### 自定义字段

如果 Typecho 文章使用了自定义字段，需要手动修改 `migrate-typecho.js` 脚本。

### 页面迁移

Typecho 的独立页面（非文章）需要手动创建，在 `src/pages/` 目录下创建对应文件。

## 故障排除

### 数据库连接失败

```bash
# 检查 Docker 网络配置
docker network ls

# 检查容器网络
docker inspect <typecho-container-name> | grep Network
```

### 中文乱码

确保数据库配置中使用 `utf8mb4` 字符集。

### 图片无法显示

检查图片路径并更新为正确的路径。

## 回滚

如果迁移有问题，可以从备份恢复：

```bash
# 恢复数据库
cat typecho-backup.sql | docker exec -i <mysql-container> mysql -u root -p typecho

# 重启 Typecho
docker start <typecho-container-name>
```

## 完成后

访问 https://blog.xitingit.top 查看迁移后的博客！

如有问题，查看日志：
```bash
pm2 logs
```
