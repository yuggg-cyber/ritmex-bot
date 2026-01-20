# 统计系统 (Stats System)

## 📖 简介

这是一个为 ritmex-bot 设计的**分布式每小时交易统计报表系统**，采用零侵入、旁路模式设计，不会影响现有交易逻辑。

## 🏗️ 架构

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   Bot Client 1  │       │   Bot Client 2  │       │   Bot Client N  │
│                 │       │                 │       │                 │
│  collector.ts   │       │  collector.ts   │       │  collector.ts   │
│  reporter.ts    │       │  reporter.ts    │       │  reporter.ts    │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                         │                         │
         │ POST /stats (每小时)    │                         │
         └─────────────────────────┼─────────────────────────┘
                                   │
                          ┌────────▼────────┐
                          │  Stats Server   │
                          │                 │
                          │   server.ts     │
                          └────────┬────────┘
                                   │
                                   │ 每小时 02 分播报
                                   ▼
                          ┌─────────────────┐
                          │  钉钉机器人      │
                          └─────────────────┘
```

## 📁 文件说明

- **collector.ts**: 单例模式的计数器，内存中统计当前小时的交易数据
- **reporter.ts**: 定时上报器，每小时整点将统计数据发送到 Server
- **server.ts**: 汇总服务器，接收各 Client 数据并定时播报到钉钉
- **index.ts**: 统一导出接口，提供初始化函数

## 🚀 快速开始

### 1. Client 端配置

在 `.env` 中添加：

```bash
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://192.168.1.100:3000/stats
```

### 2. Server 端配置

在 `.env` 中添加：

```bash
ENABLE_STATS=true
STATS_ROLE=SERVER
STATS_SERVER_PORT=3000
DINGTALK_TOKEN=your_token_here
```

### 3. 启动 Server

```bash
bun run src/stats_system/server.ts
# 或使用快捷脚本
./start_stats_server.sh
```

### 4. 启动 Client

```bash
# 正常启动交易策略即可，统计系统会自动初始化
bun run src/index.tsx --strategy grid
```

## 📊 统计指标

- **挂单次数**: 所有类型的挂单（限价、市价、止损等）
- **撤单次数**: 主动撤单和去重撤单
- **成交次数**: 订单完全成交的次数
- **持续时长**: Bot 运行时长
- **周期盈亏**: 当前未实现盈亏
- **当前仓位**: 持仓数量
- **账户余额**: 钱包总余额

## 🔧 API 接口

### POST /stats

接收 Client 上报的统计数据。

**请求体**:
```json
{
  "botName": "bot-1",
  "timestamp": 1705449600000,
  "placeOrderCount": 10,
  "cancelOrderCount": 5,
  "fillCount": 3,
  "durationMs": 3600000,
  "periodPnl": 12.34,
  "currentPosition": 0.001,
  "accountBalance": 1000.00
}
```

### GET /health

健康检查接口，返回 "OK"。

## ⚙️ 工作流程

### Client 端

1. 程序启动时调用 `initStatsSystem()` 初始化
2. 在挂单/撤单/成交时调用 `collector.logXXX()` 记录事件
3. 每小时整点（00:00），`reporter` 自动上报数据到 Server
4. 上报后立即清零计数器

### Server 端

1. 启动 HTTP 服务监听 `/stats` 接口
2. 接收各 Client 的统计数据，暂存在内存中
3. 每小时 02 分（XX:02:00），汇总所有数据
4. 生成 Markdown 表格，调用钉钉 Webhook 发送
5. 发送后清空缓冲区

## 🛡️ 设计原则

### 1. 零侵入

所有统计代码都在独立的 `stats_system/` 目录下，与业务逻辑物理隔离。

### 2. 零干扰

- 所有 `collector.logXXX()` 方法都是同步的，不会阻塞主线程
- 上报请求采用 Fire-and-forget 模式，不等待响应
- 统计失败不会抛出异常，不影响交易逻辑

### 3. 最小化修改

原有文件中只插入单行代码，不修改任何业务逻辑。

### 4. 容错设计

- 未启用时（`ENABLE_STATS=false`），所有方法立即返回，零开销
- 网络失败、Server 宕机等情况不会影响 Client 运行
- 所有错误都会被捕获并记录到控制台

## 📝 集成指南

详细的集成步骤请参考根目录下的文档：

- **STATS_INTEGRATION.md**: 完整的集成指南
- **stats_system_patches.md**: 精确的补丁代码
- **.env.stats.example**: 环境变量配置示例

## 🧪 测试

### 健康检查

```bash
curl http://localhost:3000/health
```

### 手动上报测试

```bash
curl -X POST http://localhost:3000/stats \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "test-bot",
    "timestamp": 1705449600000,
    "placeOrderCount": 10,
    "cancelOrderCount": 5,
    "fillCount": 3,
    "durationMs": 3600000,
    "periodPnl": 12.34,
    "currentPosition": 0.001,
    "accountBalance": 1000.00
  }'
```

## 📈 报表示例

```markdown
📊 **每小时交易统计报表** (14:00)

| Bot名称 | 挂单 | 撤单 | 成交 | 盈亏 | 仓位 | 余额 |
|---------|------|------|------|------|------|------|
| bot-1 | 120 | 45 | 38 | 12.34 | 0.0010 | 1000.00 |
| bot-2 | 95 | 32 | 29 | -5.67 | 0.0005 | 800.00 |
| bot-3 | 150 | 60 | 52 | 23.45 | 0.0015 | 1500.00 |
|---------|------|------|------|------|------|------|
| **合计** | **365** | **137** | **119** | **30.12** | - | - |
```

## 🔍 日志前缀

- `[StatsCollector]`: Client 端收集器日志
- `[StatsReporter]`: Client 端上报器日志
- `[StatsServer]`: Server 端服务器日志

## 📞 支持

如有问题，请检查：

1. 环境变量是否正确配置
2. Server 端是否正常运行（`curl http://localhost:3000/health`）
3. Client 端日志中是否有 `[StatsCollector]` 初始化信息
4. 网络连通性（Client 能否访问 Server）

## 📄 许可

本模块遵循 ritmex-bot 项目的许可协议。
