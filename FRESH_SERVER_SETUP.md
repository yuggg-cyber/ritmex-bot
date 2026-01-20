# 全新交易服务器完整配置教程

## 📋 适用场景

- ✅ 全新的 Ubuntu 服务器（推荐 Ubuntu 22.04 LTS）
- ✅ 从零开始配置交易环境
- ✅ 需要部署 ritmex-bot 交易机器人
- ✅ 需要启用统计系统

---

## 🎯 配置流程概览

```
1. 连接到服务器
2. 更新系统
3. 安装 Bun 运行时
4. 安装 Git
5. 克隆代码仓库
6. 配置环境变量（包括统计系统）
7. 安装依赖
8. 启动交易 Bot
9. 验证统计功能
```

**预计时间**：15-20 分钟

---

## 🚀 详细步骤

### 第一步：连接到服务器

```bash
ssh ubuntu@你的服务器IP
# 例如: ssh ubuntu@123.456.789.10
```

**首次连接提示**：
```
The authenticity of host '...' can't be established.
Are you sure you want to continue connecting (yes/no)?
```
输入 `yes` 并按 Enter。

---

### 第二步：更新系统

```bash
sudo apt update && sudo apt upgrade -y
```

**说明**：更新系统软件包，确保安全性。

**预计时间**：2-5 分钟

---

### 第三步：安装 Bun 运行时

```bash
curl -fsSL https://bun.sh/install | bash
```

**预期输出**：
```
######################################################################## 100.0%
bun was installed successfully to ~/.bun/bin/bun
```

**配置环境变量**：
```bash
# 添加到 shell 配置
echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc

# 重新加载配置
source ~/.bashrc
```

**验证安装**：
```bash
bun --version
```

应该显示版本号，例如：`1.0.20`

---

### 第四步：安装 Git

```bash
sudo apt install git -y
```

**验证安装**：
```bash
git --version
```

应该显示版本号，例如：`git version 2.34.1`

---

### 第五步：克隆代码仓库

```bash
# 克隆你的 ritmex-bot 仓库
git clone https://github.com/yuggg-cyber/ritmex-bot.git

# 进入项目目录
cd ritmex-bot
```

**验证**：
```bash
ls -la
```

应该看到项目文件：
```
src/
.env.example
package.json
README.md
...
```

---

### 第六步：配置环境变量

#### 6.1 复制示例配置文件

```bash
cp .env.example .env
```

#### 6.2 编辑配置文件

```bash
nano .env
```

#### 6.3 配置交易所 API

找到以下配置并填写你的 API 信息：

```bash
# 交易所配置（必填）
EXCHANGE=binance
API_KEY=你的API_KEY
API_SECRET=你的API_SECRET

# 交易对（必填）
SYMBOL=BTCUSDT

# 策略配置（根据你的策略调整）
STRATEGY=grid
```

#### 6.4 添加统计系统配置

在文件**末尾**添加：

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
| `ENABLE_STATS` | 是否启用统计 | `true` |
| `STATS_ROLE` | 角色类型 | `CLIENT` |
| `BOT_NAME` | Bot 名称（自定义） | `bot-1`, `grid-bot-hk` 等 |
| `STATS_SERVER_URL` | 播报服务器地址 | `http://43.133.205.129:3000/stats` |

**⚠️ 重要提示**：
- `BOT_NAME` 可以自定义，建议用有意义的名字
- 如果有多个交易服务器，每个用不同的 `BOT_NAME`
- `STATS_SERVER_URL` 必须包含 `/stats` 路径

#### 6.5 保存并退出

- 按 `Ctrl + O` 保存
- 按 `Enter` 确认
- 按 `Ctrl + X` 退出

---

### 第七步：安装依赖

```bash
bun install
```

**预期输出**：
```
bun install v1.0.20
 + 123 packages installed [1.23s]
```

**预计时间**：30 秒 - 2 分钟

---

### 第八步：测试网络连通性

```bash
# 测试是否能连接到播报服务器
curl http://43.133.205.129:3000/health
```

**预期输出**：
```
OK
```

**如果失败**：
- ❌ 检查播报服务器是否运行
- ❌ 检查腾讯云安全组是否开放了 3000 端口
- ❌ 检查网络连接

---

### 第九步：启动交易 Bot

```bash
# 根据你的策略启动
bun run src/index.tsx --strategy grid

# 其他策略示例：
# bun run src/index.tsx --strategy maker
# bun run src/index.tsx --strategy trend
```

---

### 第十步：验证统计系统

查看 Bot 的启动日志，应该看到：

```
[StatsCollector] 统计系统已启用 (CLIENT 模式)
[StatsCollector] Bot 名称: bot-1
[StatsReporter] 播报服务器: http://43.133.205.129:3000/stats
[StatsReporter] 将在 XXXs 后首次上报（下一个整点）
```

**✅ 看到这些日志说明配置成功！**

**如果没有看到**：
- 检查 `.env` 文件中的 `ENABLE_STATS=true`
- 检查 `STATS_SERVER_URL` 是否正确
- 重启 Bot

---

## 🔧 使用 PM2 管理 Bot（推荐）

### 安装 PM2

```bash
sudo npm install -g pm2
```

### 启动 Bot

```bash
pm2 start "bun run src/index.tsx --strategy grid" --name trading-bot
```

### 查看状态

```bash
pm2 status
```

### 查看日志

```bash
pm2 logs trading-bot
```

### 设置开机自启动

```bash
pm2 save
pm2 startup
# 按照提示执行命令
```

### 常用命令

```bash
# 重启
pm2 restart trading-bot

# 停止
pm2 stop trading-bot

# 删除
pm2 delete trading-bot

# 查看详细信息
pm2 show trading-bot
```

---

## 📊 验证统计功能

### 方法 1：查看 Bot 日志

```bash
# 如果直接运行
# 日志会直接显示在终端

# 如果使用 PM2
pm2 logs trading-bot
```

应该看到：
```
[StatsCollector] 记录挂单事件
[StatsCollector] 记录成交事件
[StatsReporter] 上报统计数据成功
```

### 方法 2：手动发送测试数据

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

应该返回：`OK`

### 方法 3：查看播报服务器日志

```bash
ssh ubuntu@43.133.205.129
sudo journalctl -u stats-server -n 50
```

应该看到：
```
[StatsServer] 收到数据: bot-1 @ ...
```

---

## ⏰ 等待钉钉播报

### 播报时间
- **每小时 02 分**（例如 14:02、15:02、16:02）

### 钉钉消息示例

```
📊 **每小时交易统计报表** (14:00)

| Bot名称 | 挂单 | 撤单 | 成交 | 盈亏 | 仓位 | 余额 |
|---------|------|------|------|------|------|------|
| bot-1 | 120 | 45 | 38 | +12.34 | 0.0010 | 1000.00 |
|---------|------|------|------|------|------|------|
| **合计** | **120** | **45** | **38** | **+12.34** | - | - |

---
📌 **统计周期**: 13:00 - 14:00
⏱️ **运行时长**: 60 分钟
📊 **数据来源**: 1 个交易服务器
```

---

## 🔍 故障排查

### 问题 1：Bun 安装失败

**解决方案**：
```bash
# 手动下载安装
curl -fsSL https://bun.sh/install | bash

# 或使用备用源
wget https://github.com/oven-sh/bun/releases/latest/download/bun-linux-x64.zip
unzip bun-linux-x64.zip
sudo mv bun-linux-x64/bun /usr/local/bin/
```

### 问题 2：依赖安装失败

**解决方案**：
```bash
# 清除缓存
rm -rf node_modules
rm bun.lockb

# 重新安装
bun install
```

### 问题 3：无法连接到播报服务器

**解决方案**：
```bash
# 测试网络
ping 43.133.205.129

# 测试端口
telnet 43.133.205.129 3000

# 检查播报服务器状态
ssh ubuntu@43.133.205.129 "sudo systemctl status stats-server"
```

### 问题 4：Bot 启动后崩溃

**解决方案**：
```bash
# 查看详细错误
bun run src/index.tsx --strategy grid 2>&1 | tee bot.log

# 检查配置
cat .env

# 临时禁用统计系统
nano .env
# 将 ENABLE_STATS=true 改为 ENABLE_STATS=false
```

### 问题 5：看不到统计日志

**解决方案**：
```bash
# 检查配置
cat .env | grep STATS

# 确认代码是最新的
git pull origin main

# 重启 Bot
pm2 restart trading-bot
```

---

## 📝 完整配置文件示例

### .env 文件示例

```bash
# ==========================================
# 交易所配置
# ==========================================
EXCHANGE=binance
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here

# ==========================================
# 交易配置
# ==========================================
SYMBOL=BTCUSDT
STRATEGY=grid

# 网格策略配置
GRID_UPPER_PRICE=50000
GRID_LOWER_PRICE=40000
GRID_QUANTITY=0.001
GRID_COUNT=10

# ==========================================
# 风控配置
# ==========================================
MAX_POSITION=0.1
STOP_LOSS_PERCENT=5

# ==========================================
# 统计系统配置
# ==========================================
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://43.133.205.129:3000/stats
```

---

## ✅ 配置完成检查清单

- [ ] 系统更新完成
- [ ] Bun 安装成功（`bun --version`）
- [ ] Git 安装成功（`git --version`）
- [ ] 代码克隆成功（`cd ritmex-bot && ls`）
- [ ] `.env` 文件配置完成
- [ ] 依赖安装成功（`bun install`）
- [ ] 网络连通性测试通过（`curl http://43.133.205.129:3000/health`）
- [ ] Bot 启动成功
- [ ] 看到统计日志（`[StatsCollector]`）
- [ ] PM2 配置完成（可选）

---

## 🎯 多服务器部署

如果你有多个交易服务器，每个都按照这个教程配置，只需修改：

### 服务器 1
```bash
BOT_NAME=grid-bot-1
```

### 服务器 2
```bash
BOT_NAME=grid-bot-2
```

### 服务器 3
```bash
BOT_NAME=maker-bot-1
```

钉钉会自动汇总所有 Bot 的数据！

---

## 🔐 安全建议

### 1. 使用 SSH 密钥登录
```bash
# 在本地生成密钥
ssh-keygen -t rsa -b 4096

# 复制公钥到服务器
ssh-copy-id ubuntu@你的服务器IP
```

### 2. 禁用密码登录
```bash
sudo nano /etc/ssh/sshd_config
# 找到 PasswordAuthentication 改为 no
sudo systemctl restart sshd
```

### 3. 配置防火墙
```bash
sudo ufw allow 22/tcp
sudo ufw enable
```

### 4. 定期更新系统
```bash
sudo apt update && sudo apt upgrade -y
```

---

## 📞 需要帮助？

### 查看日志
```bash
# Bot 日志（PM2）
pm2 logs trading-bot

# 播报服务器日志
ssh ubuntu@43.133.205.129 "sudo journalctl -u stats-server -f"

# 系统日志
sudo journalctl -xe
```

### 常用命令速查

```bash
# 查看配置
cat .env | grep STATS

# 测试连通性
curl http://43.133.205.129:3000/health

# 重启 Bot
pm2 restart trading-bot

# 查看进程
pm2 status

# 查看资源使用
htop
```

---

## 🎉 完成！

配置完成后，你的交易服务器会：
- ✅ 自动运行交易策略
- ✅ 自动统计交易数据
- ✅ 每小时自动上报到播报服务器
- ✅ 不影响交易逻辑
- ✅ 服务器重启后自动恢复

钉钉会在每小时的 02 分收到统计报表！📊

有任何问题随时查看日志或联系我！🚀
