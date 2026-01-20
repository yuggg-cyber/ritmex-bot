# Client 端配置教程（交易服务器）

## 📋 前置条件

- ✅ 播报服务器已部署并运行（43.133.205.129:3000）
- ✅ 腾讯云安全组已开放 3000 端口
- ✅ 交易服务器已安装 Bun 和 Git
- ✅ 交易服务器已克隆 ritmex-bot 仓库

---

## 🚀 配置步骤

### 第一步：连接到交易服务器

```bash
ssh ubuntu@你的交易服务器IP
# 或者使用你的用户名和IP
```

---

### 第二步：进入项目目录

```bash
cd /path/to/ritmex-bot
# 例如: cd ~/ritmex-bot
```

---

### 第三步：拉取最新代码

```bash
# 拉取包含统计系统的最新代码
git pull origin main
```

**预期输出**：
```
remote: Enumerating objects: ...
Updating a34d06f..85b9c11
Fast-forward
 src/cli/strategy-runner.ts           | 2 ++
 src/core/order-coordinator.ts        | 5 +++++
 src/strategy/grid-engine.ts          | 12 ++++++++++++
 ...
 12 files changed, 327 insertions(+)
```

**说明**：这会拉取我们刚才应用的所有统计补丁。

---

### 第四步：配置环境变量

#### 4.1 编辑 .env 文件

```bash
nano .env
```

#### 4.2 添加统计系统配置

在文件末尾添加以下内容：

```bash
# ==========================================
# 统计系统配置
# ==========================================
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

**参数说明**：

| 参数 | 说明 | 示例 |
|------|------|------|
| `ENABLE_STATS` | 是否启用统计系统 | `true` 或 `false` |
| `STATS_ROLE` | 角色类型 | `CLIENT`（交易服务器） |
| `BOT_NAME` | Bot 名称（显示在报表中） | `bot-1`, `bot-2`, `grid-bot` 等 |
| `STATS_SERVER_URL` | 播报服务器地址 | `http://43.133.205.129:3000/stats` |

**⚠️ 重要提示**：
- `BOT_NAME` 可以自定义，建议用有意义的名字（如 `grid-bot-1`、`maker-bot-hk` 等）
- `STATS_SERVER_URL` 必须是播报服务器的完整地址，包括 `/stats` 路径
- 如果有多个交易服务器，每个都要配置不同的 `BOT_NAME`

#### 4.3 保存并退出

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

### 第五步：验证配置

```bash
# 查看配置是否正确
cat .env | grep STATS
```

**预期输出**：
```
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

---

### 第六步：测试网络连通性

```bash
# 测试是否能连接到播报服务器
curl http://43.133.205.129:3000/health
```

**预期输出**：
```
OK
```

**如果失败**：
- ❌ 检查播报服务器是否运行：`ssh ubuntu@43.133.205.129 "sudo systemctl status stats-server"`
- ❌ 检查腾讯云安全组是否开放了 3000 端口
- ❌ 检查防火墙设置

---

### 第七步：启动交易 Bot

```bash
# 启动 Bot（根据你的策略选择）
bun run src/index.tsx --strategy grid

# 或者使用其他策略
# bun run src/index.tsx --strategy maker
# bun run src/index.tsx --strategy trend
```

---

### 第八步：验证统计系统是否启动

查看 Bot 的启动日志，应该看到：

```
[StatsCollector] 统计系统已启用 (CLIENT 模式)
[StatsCollector] Bot 名称: bot-1
[StatsReporter] 播报服务器: http://43.133.205.129:3000/stats
[StatsReporter] 将在 XXXs 后首次上报（下一个整点）
```

**如果看到这些日志**，说明统计系统已成功启动！✅

**如果没有看到**：
- 检查 `.env` 文件配置是否正确
- 检查是否成功拉取了最新代码
- 重启 Bot

---

## 🧪 测试统计功能

### 测试 1：手动触发上报

在 Bot 运行时，你可以手动发送测试数据：

```bash
curl -X POST http://43.133.205.129:3000/stats \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "bot-1",
    "timestamp": '$(date +%s000)',
    "placeOrderCount": 10,
    "cancelOrderCount": 5,
    "fillCount": 3,
    "durationMs": 3600000,
    "periodPnl": 12.34,
    "currentPosition": 0.001,
    "accountBalance": 1000.00
  }'
```

**预期输出**：
```
OK
```

### 测试 2：查看播报服务器日志

在播报服务器上：
```bash
ssh ubuntu@43.133.205.129
sudo journalctl -u stats-server -n 50
```

应该看到：
```
[StatsServer] 收到数据: bot-1 @ 2024-01-17T12:00:00.000Z
```

---

## 📊 预期行为

### 自动上报时间表

| 时间 | 行为 |
|------|------|
| 每小时 00:00 | Client 端自动上报过去一小时的统计数据 |
| 每小时 02:00 | Server 端汇总所有数据并发送到钉钉 |

### 统计的数据

- ✅ **挂单次数**：调用 `placeOrder` 等函数的次数
- ✅ **撤单次数**：调用 `cancelOrder` 的次数
- ✅ **成交次数**：订单从活跃状态消失的次数
- ✅ **运行时长**：从启动到上报的时间
- ✅ **周期盈亏**：当前的未实现盈亏
- ✅ **当前仓位**：当前持仓数量
- ✅ **账户余额**：账户总余额

---

## 🔍 故障排查

### 问题 1：看不到统计日志

**可能原因**：
- `.env` 配置错误
- 代码没有更新

**解决方案**：
```bash
# 检查配置
cat .env | grep STATS

# 重新拉取代码
git pull origin main

# 重启 Bot
```

### 问题 2：无法连接到播报服务器

**可能原因**：
- 播报服务器未运行
- 端口未开放
- 网络问题

**解决方案**：
```bash
# 测试连通性
curl http://43.133.205.129:3000/health

# 如果失败，检查播报服务器
ssh ubuntu@43.133.205.129 "sudo systemctl status stats-server"

# 检查端口是否开放
telnet 43.133.205.129 3000
```

### 问题 3：钉钉没有收到消息

**可能原因**：
- 还没到播报时间（每小时 02 分）
- 钉钉 Token 配置错误
- 关键词设置错误

**解决方案**：
```bash
# 在播报服务器上查看日志
ssh ubuntu@43.133.205.129
sudo journalctl -u stats-server -f

# 等待下一个整点的 02 分
```

### 问题 4：Bot 启动后立即崩溃

**可能原因**：
- 统计代码有 Bug
- 依赖未安装

**解决方案**：
```bash
# 查看错误日志
bun run src/index.tsx --strategy grid 2>&1 | tee bot.log

# 如果是统计系统导致的，可以临时禁用
nano .env
# 将 ENABLE_STATS=true 改为 ENABLE_STATS=false
```

---

## 🎯 多服务器配置

如果你有多个交易服务器，每个都需要配置：

### 服务器 1
```bash
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=grid-bot-hk
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

### 服务器 2
```bash
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=maker-bot-sg
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

### 服务器 3
```bash
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=trend-bot-us
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

**钉钉播报示例**：
```
📊 **每小时交易统计报表** (14:00)

| Bot名称 | 挂单 | 撤单 | 成交 | 盈亏 | 仓位 | 余额 |
|---------|------|------|------|------|------|------|
| grid-bot-hk | 120 | 45 | 38 | +12.34 | 0.0010 | 1000.00 |
| maker-bot-sg | 95 | 30 | 28 | -5.67 | -0.0005 | 850.50 |
| trend-bot-us | 150 | 60 | 45 | +23.45 | 0.0015 | 1200.00 |
|---------|------|------|------|------|------|------|
| **合计** | **365** | **135** | **111** | **+30.12** | - | - |
```

---

## 📝 常用命令

```bash
# 查看配置
cat .env | grep STATS

# 更新代码
git pull origin main

# 启动 Bot
bun run src/index.tsx --strategy grid

# 测试连通性
curl http://43.133.205.129:3000/health

# 手动发送测试数据
curl -X POST http://43.133.205.129:3000/stats \
  -H "Content-Type: application/json" \
  -d '{"botName":"test","timestamp":1705449600000,"placeOrderCount":10,"cancelOrderCount":5,"fillCount":3,"durationMs":3600000,"periodPnl":12.34,"currentPosition":0.001,"accountBalance":1000.00}'
```

---

## ✅ 配置完成检查清单

- [ ] 拉取最新代码（`git pull origin main`）
- [ ] 配置 `.env` 文件（添加 `ENABLE_STATS=true` 等）
- [ ] 测试网络连通性（`curl http://43.133.205.129:3000/health`）
- [ ] 启动 Bot
- [ ] 查看启动日志（确认看到 `[StatsCollector]` 日志）
- [ ] 等待下一个整点的 02 分查看钉钉播报

---

## 🎉 完成！

配置完成后，你的交易 Bot 会：
- ✅ 自动统计所有交易数据
- ✅ 每小时整点自动上报到播报服务器
- ✅ 不影响交易逻辑（零干扰）
- ✅ 统计失败不会导致 Bot 崩溃

钉钉会在每小时的 02 分收到漂亮的统计报表！📊

有任何问题随时查看日志或联系我！🚀
