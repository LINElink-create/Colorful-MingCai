# Mingcai Backend

这个目录是明彩浏览器扩展的后端骨架，目标是把翻译能力从扩展中拆出，并为用户注册、账号配置和未来云同步预留统一边界。

## 当前范围

- FastAPI 应用骨架
- MySQL 配置与 SQLAlchemy 模型
- 翻译、账号、鉴权、健康检查路由骨架
- 有道翻译 provider 适配层接口
- 为平台统一代调和用户自带密钥预留的数据结构

## 启动方式

1. 复制 `.env.example` 为 `.env`

如果你使用外部 MySQL，直接在 `.env` 中填写线上数据库连接即可，不需要本地容器。

可选，如果你没有现成数据库，再使用本地 MySQL：

```bash
cd backend
docker compose up -d
```

2. 创建虚拟环境并安装依赖：

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -e .[dev]
```

3. 执行数据库迁移：

```bash
cd backend
alembic upgrade head
```

4. 启动开发服务：

```bash
uvicorn app.main:app --reload --port 8000
```

或者直接在 IDE 中运行 `backend/run.py`。

如果你使用 VS Code，仓库已经提供调试配置：

- 打开“运行和调试”
- 选择 `Mingcai Backend`
- 直接启动即可

## 建议下一步

- 增加 Alembic 初始化迁移并落地建表
- 把扩展侧翻译调用切换到 `POST /v1/translation/translate`
- 用 access token / refresh token 方案补齐 auth 实现
- 把 provider 凭据加密与健康检查任务补齐
