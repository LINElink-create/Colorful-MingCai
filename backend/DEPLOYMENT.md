# Backend Deployment

本文档描述明彩后端在服务器上的推荐部署方式：Docker Compose + GitHub Actions + 外部 MySQL。

当前推荐架构是：

- 本机仓库或 GitHub Actions 构建后端镜像
- 目标服务器只负责运行后端容器
- MySQL 部署在另一台独立服务器，通过 `MYSQL_HOST` 指向远程数据库

## 部署目标

- 代码推送到 GitHub 后自动构建镜像
- 镜像推送到 GitHub Container Registry
- GitHub Actions 通过 SSH 登录服务器更新服务
- 容器启动时自动执行 `alembic upgrade head`
- 发布完成后通过健康检查验证新版本

## 首次部署

1. 在服务器上安装 Docker 与 Docker Compose。
2. 创建部署目录，例如 `/srv/mingcai/backend`。
3. 将 `backend/deploy/compose.server.yml` 放到服务器部署目录。
4. 在同一目录创建 `.env.production`，至少包含以下变量：

```env
APP_NAME=Mingcai Backend
APP_ENV=production
APP_HOST=0.0.0.0
APP_PORT=8000
APP_VERSION=0.1.0
LOG_LEVEL=info
DEPLOY_ENV=production
SERVER_PUBLIC_BASE_URL=https://your-domain.example.com
TRUSTED_PROXIES=127.0.0.1
MYSQL_HOST=your-remote-mysql-host
MYSQL_PORT=3306
MYSQL_USER=your-user
MYSQL_PASSWORD=your-password
MYSQL_DATABASE=mingcai
DATABASE_ECHO=false
CORS_ORIGINS=https://your-extension-origin
DEFAULT_TRANSLATION_PROVIDER=youdao
PLATFORM_TRANSLATION_ENABLED=true
PLATFORM_YOUDAO_APP_KEY=
PLATFORM_YOUDAO_APP_SECRET=
PLATFORM_REQUESTS_PER_MINUTE=30
PLATFORM_DAILY_LIMIT=5000
GUNICORN_WORKERS=2
GUNICORN_TIMEOUT=120
GUNICORN_GRACEFUL_TIMEOUT=30
GUNICORN_KEEPALIVE=5
IMAGE_TAG=main
GITHUB_REPOSITORY_OWNER=your-github-user-or-org
```

5. 登录 GitHub Container Registry：

```bash
echo <github-token> | docker login ghcr.io -u <github-user> --password-stdin
```

6. 手动执行首次启动：

```bash
docker compose --env-file .env.production -f compose.server.yml pull
docker compose --env-file .env.production -f compose.server.yml up -d
```

## 外部 MySQL 额外要求

如果 MySQL 在另一台服务器上，除了应用配置本身，还需要满足以下条件：

1. 数据库服务器放通来自后端服务器出口 IP 的 3306 访问。
2. MySQL 用户允许从后端服务器来源地址登录，而不是只允许 `localhost`。
3. 数据库字符集建议保持 `utf8mb4`。
4. 首次部署前，从后端服务器执行一次远程端口探测，确认网络可达。

示例检查命令：

```bash
nc -zv your-remote-mysql-host 3306
```

如果服务器没有 `nc`，可以改用：

```bash
timeout 5 bash -c 'cat < /dev/null > /dev/tcp/your-remote-mysql-host/3306' && echo mysql-port-open || echo mysql-port-closed
```

## GitHub Actions 所需 Secrets

构建并推送镜像到 GHCR 时，工作流直接使用 GitHub Actions 自带的 `GITHUB_TOKEN`，不再依赖额外的 GHCR 推送凭据。

以下 Secrets 仍然需要配置，其中 `GHCR_USERNAME` 和 `GHCR_TOKEN` 只用于服务器通过 `docker login ghcr.io` 拉取私有镜像：

- `GHCR_USERNAME`：GitHub 用户名或组织机器人账号
- `GHCR_TOKEN`：具备 `read:packages` 权限的 token
- `DEPLOY_HOST`：服务器 IP 或域名
- `DEPLOY_PORT`：SSH 端口
- `DEPLOY_USERNAME`：部署用户
- `DEPLOY_SSH_KEY`：私钥内容
- `DEPLOY_PATH`：服务器上的部署目录，例如 `/srv/mingcai/backend`
- `DEPLOY_BASE_URL`：对外访问地址，例如 `https://api.example.com`

## 自动发布流程

1. 推送 `backend/**` 或 `.github/workflows/backend-deploy.yml` 相关改动到 `main`
2. Actions 运行测试
3. 构建并推送镜像到 `ghcr.io`
4. 通过 SSH 到服务器执行：
   - `docker compose pull`
   - `docker compose up -d`
5. 调用 `/v1/health` 与 `/v1/health/version` 校验部署结果

## 回滚策略

推荐保留稳定镜像 tag，例如：

- `main`
- `sha-<commit>`
- `release-<version>`

回滚时把 `.env.production` 中的 `IMAGE_TAG` 改为旧 tag，然后重新执行：

```bash
docker compose --env-file .env.production -f compose.server.yml pull
docker compose --env-file .env.production -f compose.server.yml up -d
```

## 注意事项

- 当前迁移策略是容器启动即执行 `alembic upgrade head`，上线前需要确保迁移脚本经过验证。
- 如果服务器前面有 Nginx 或 Caddy，应正确设置 `SERVER_PUBLIC_BASE_URL` 和 `TRUSTED_PROXIES`。
- 如果你不想在容器内直接对外暴露 8000 端口，应让反向代理接入 compose 网络并隐藏宿主机端口映射。
- 如果 MySQL 位于另一台服务器，部署失败时优先检查安全组、防火墙、数据库授权来源和 `MYSQL_HOST` 是否为内网地址。