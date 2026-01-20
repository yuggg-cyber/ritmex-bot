# 统计播报服务器部署教程（超详细小白版）

> 本教程假设你完全没有 Linux 经验，会一步步教你如何部署。

---

## 第一部分：购买和配置腾讯云服务器

### 步骤 1：购买腾讯云服务器

#### 1.1 登录腾讯云
1. 打开浏览器，访问 https://cloud.tencent.com/
2. 点击右上角「登录」，用微信扫码登录

#### 1.2 进入云服务器购买页面
1. 登录后，点击顶部菜单「产品」
2. 在左侧找到「计算」→「云服务器」
3. 点击「立即选购」

#### 1.3 选择配置
按照以下配置选择（**重要**）：

**计费模式**：
- 选择「按量计费」（灵活，随时可以删除）

**地域和可用区**：
- 地域：选择离你近的地方（比如「中国香港」或「新加坡」）
- 可用区：随便选一个

**实例**：
- 机型：「标准型 S5」
- 规格：「1核2GB」（最低配置就够用）

**镜像**：
- 选择「公共镜像」
- 操作系统：选择「Ubuntu」
- 版本：选择「Ubuntu Server 22.04 LTS 64位」

**存储**：
- 系统盘：「高性能云硬盘 50GB」（默认即可）

**网络**：
- 带宽计费模式：「按使用流量」
- 带宽上限：「1Mbps」（够用了）

**安全组**：
- ⚠️ **重要**：勾选「新建安全组」
- 勾选「放通22、80、443、3389端口和ICMP协议」

**登录方式**：
- 选择「设置密码」
- 输入一个密码（**一定要记住！**）
- 例如：`MyPassword123!`

#### 1.4 确认购买
1. 勾选「同意服务条款」
2. 点击「立即购买」
3. 等待 1-2 分钟，服务器创建完成

---

### 步骤 2：查看服务器信息

#### 2.1 进入控制台
1. 点击顶部「控制台」
2. 左侧菜单找到「云服务器」
3. 点击「实例」

#### 2.2 记录服务器信息
你会看到一台服务器，记录以下信息：

- **实例 ID**：例如 `ins-xxxxxxxx`（不重要）
- **公网 IP**：例如 `43.123.45.67`（**重要！记下来！**）
- **状态**：应该显示「运行中」

**示例**：
```
公网 IP: 43.123.45.67
登录密码: MyPassword123!
用户名: ubuntu
```

---

### 步骤 3：开放 3000 端口（重要！）

#### 3.1 进入安全组配置
1. 在服务器列表中，点击你的服务器名称
2. 点击顶部「安全组」标签
3. 点击安全组名称（例如 `sg-xxxxxxxx`）

#### 3.2 添加入站规则
1. 点击「入站规则」标签
2. 点击「添加规则」按钮
3. 填写以下信息：

| 字段 | 填写内容 |
|------|---------|
| 类型 | 自定义 |
| 来源 | 0.0.0.0/0 |
| 协议端口 | TCP:3000 |
| 策略 | 允许 |
| 备注 | 统计服务器端口 |

4. 点击「完成」
5. 点击「保存」

#### 3.3 验证规则
确认入站规则列表中有以下端口：
- ✅ TCP:22（SSH 登录）
- ✅ TCP:3000（统计服务器）

---

## 第二部分：连接到服务器

### 步骤 4：安装 SSH 客户端

#### Windows 用户

**方法一：使用 Windows 自带的 PowerShell**
1. 按 `Win + X`
2. 选择「Windows PowerShell」或「终端」
3. 跳到步骤 5

**方法二：使用 MobaXterm（推荐）**
1. 下载 MobaXterm：https://mobaxterm.mobatek.net/download.html
2. 选择「Home Edition」→「Download now」
3. 下载「Installer edition」
4. 安装并打开

#### Mac/Linux 用户
1. 按 `Command + 空格`
2. 输入「终端」或「Terminal」
3. 打开终端

---

### 步骤 5：连接到服务器

#### 5.1 输入连接命令
在终端中输入（**替换成你的 IP**）：

```bash
ssh ubuntu@43.123.45.67
```

**解释**：
- `ssh`：连接命令
- `ubuntu`：用户名（腾讯云默认是 ubuntu）
- `43.123.45.67`：你的服务器公网 IP

#### 5.2 第一次连接的提示
如果是第一次连接，会显示：
```
The authenticity of host '43.123.45.67' can't be established.
Are you sure you want to continue connecting (yes/no)?
```

**输入 `yes` 并按回车**

#### 5.3 输入密码
会提示：
```
ubuntu@43.123.45.67's password:
```

**输入你在购买时设置的密码**（例如 `MyPassword123!`）

⚠️ **注意**：输入密码时屏幕不会显示任何字符，这是正常的！输完直接按回车。

#### 5.4 连接成功
如果看到类似这样的提示符，说明连接成功：
```
ubuntu@VM-0-1-ubuntu:~$
```

**恭喜！你已经连接到服务器了！**

---

## 第三部分：部署统计服务器

### 步骤 6：运行一键部署脚本

#### 6.1 复制并执行命令
在终端中**复制粘贴**以下命令，然后按回车：

```bash
curl -fsSL https://raw.githubusercontent.com/yuggg-cyber/ritmex-bot/main/deploy_server.sh | bash
```

**解释**：
- 这个命令会自动下载部署脚本并运行
- 脚本会自动安装所有需要的软件

#### 6.2 等待安装完成
你会看到类似这样的输出：
```
==========================================
  统计汇总服务器一键部署脚本
==========================================

[1/7] 检查系统环境...
[2/7] 安装系统依赖...
[3/7] 安装 Bun 运行时...
[4/7] 检查代码仓库...
[5/7] 配置环境变量...
[6/7] 配置防火墙...
[7/7] 创建系统服务...
```

**等待 3-5 分钟**，直到看到：
```
==========================================
  ✅ 部署完成！
==========================================
```

#### 6.3 如果中途需要输入
- 如果提示 `Do you want to continue? [Y/n]`，输入 `Y` 并回车
- 如果提示 `按 Enter 继续`，直接按回车

---

### 步骤 7：配置钉钉机器人

#### 7.1 创建钉钉群机器人

**在手机或电脑上操作**：

1. 打开钉钉
2. 创建一个新群（或使用现有群）
3. 进入群聊，点击右上角「...」（更多）
4. 点击「群设置」
5. 点击「智能群助手」
6. 点击「添加机器人」
7. 选择「自定义」（通过 Webhook 接入自定义服务）
8. 点击「添加」

**配置机器人**：
- 机器人名称：`交易统计播报`
- 安全设置：选择「自定义关键词」
- 关键词：输入 `统计`（**必须是这个词**）
- 点击「完成」

**复制 Webhook 地址**：
会显示一个 Webhook 地址，例如：
```
https://oapi.dingtalk.com/robot/send?access_token=abcd1234567890xyz
```

**提取 Token**：
从 `access_token=` 后面复制 Token，例如：
```
abcd1234567890xyz
```

**⚠️ 记下这个 Token！**

#### 7.2 配置环境变量

回到服务器终端，输入：

```bash
nano ~/ritmex-bot/.env
```

**解释**：
- `nano`：文本编辑器
- `~/ritmex-bot/.env`：配置文件路径

#### 7.3 编辑配置文件

你会看到类似这样的内容：
```bash
# 统计系统配置
ENABLE_STATS=true
STATS_ROLE=SERVER
STATS_SERVER_PORT=3000
DINGTALK_TOKEN=
```

**操作步骤**：
1. 用方向键移动光标到 `DINGTALK_TOKEN=` 后面
2. 粘贴你的钉钉 Token（右键粘贴或 `Ctrl+Shift+V`）
3. 最终应该像这样：
   ```bash
   DINGTALK_TOKEN=abcd1234567890xyz
   ```

#### 7.4 保存并退出

1. 按 `Ctrl + O`（字母 O，不是数字 0）
2. 会提示 `File Name to Write: .env`
3. 直接按 `Enter`
4. 按 `Ctrl + X` 退出编辑器

#### 7.5 验证配置

输入以下命令查看配置：
```bash
cat ~/ritmex-bot/.env
```

应该看到：
```bash
ENABLE_STATS=true
STATS_ROLE=SERVER
STATS_SERVER_PORT=3000
DINGTALK_TOKEN=abcd1234567890xyz
```

**确认 Token 已经填写！**

---

### 步骤 8：重启服务

#### 8.1 重启统计服务器

输入以下命令：
```bash
sudo systemctl restart stats-server
```

**解释**：
- `sudo`：使用管理员权限
- `systemctl restart`：重启服务
- `stats-server`：服务名称

#### 8.2 检查服务状态

输入：
```bash
sudo systemctl status stats-server
```

应该看到：
```
● stats-server.service - Stats Aggregation Server
     Loaded: loaded (/etc/systemd/system/stats-server.service; enabled)
     Active: active (running) since ...
```

**重点看 `Active: active (running)`**，说明服务正在运行！

按 `q` 退出状态查看。

---

## 第四部分：测试服务器

### 步骤 9：测试健康检查

#### 9.1 在服务器上测试

输入：
```bash
curl http://localhost:3000/health
```

应该返回：
```
OK
```

**如果看到 `OK`，说明服务正常运行！**

#### 9.2 在本地电脑测试

打开浏览器，访问（**替换成你的 IP**）：
```
http://43.123.45.67:3000/health
```

应该显示：
```
OK
```

**如果看到 `OK`，说明外网可以访问！**

#### 9.3 如果无法访问

**检查清单**：
1. ✅ 服务是否运行：`sudo systemctl status stats-server`
2. ✅ 端口是否开放：回到步骤 3 检查安全组
3. ✅ 防火墙是否配置：`sudo ufw status`

---

### 步骤 10：发送测试数据

#### 10.1 发送测试请求

在服务器终端输入：

```bash
curl -X POST http://localhost:3000/stats \
  -H "Content-Type: application/json" \
  -d '{
    "botName": "测试机器人",
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

应该返回：
```
OK
```

#### 10.2 查看日志

输入：
```bash
sudo journalctl -u stats-server -n 20
```

应该看到类似：
```
[StatsServer] 收到数据: 测试机器人 @ 2024-01-17T00:00:00.000Z
```

**说明服务器成功接收数据！**

---

## 第五部分：等待钉钉播报

### 步骤 11：了解播报时间

服务器会在**每小时的 02 分**自动播报，例如：
- 14:02
- 15:02
- 16:02

### 步骤 12：查看实时日志

如果你想看实时日志，输入：
```bash
sudo journalctl -u stats-server -f
```

**解释**：
- `-f`：实时跟踪日志（类似 `tail -f`）

按 `Ctrl + C` 退出日志查看。

### 步骤 13：等待钉钉消息

在下一个整点的 02 分，钉钉群会收到类似这样的消息：

```
📊 **每小时交易统计报表** (14:00)

| Bot名称 | 挂单 | 撤单 | 成交 | 盈亏 | 仓位 | 余额 |
|---------|------|------|------|------|------|------|
| 测试机器人 | 10 | 5 | 3 | 12.34 | 0.0010 | 1000.00 |
|---------|------|------|------|------|------|------|
| **合计** | **10** | **5** | **3** | **12.34** | - | - |
```

**如果收到消息，说明部署成功！**

---

## 第六部分：常用操作

### 查看服务状态
```bash
sudo systemctl status stats-server
```

### 重启服务
```bash
sudo systemctl restart stats-server
```

### 停止服务
```bash
sudo systemctl stop stats-server
```

### 启动服务
```bash
sudo systemctl start stats-server
```

### 查看实时日志
```bash
sudo journalctl -u stats-server -f
```

### 查看最近 50 条日志
```bash
sudo journalctl -u stats-server -n 50
```

### 更新代码
```bash
cd ~/ritmex-bot
git pull
sudo systemctl restart stats-server
```

### 修改配置
```bash
nano ~/ritmex-bot/.env
# 修改后保存（Ctrl+O, Enter, Ctrl+X）
sudo systemctl restart stats-server
```

### 断开服务器连接
```bash
exit
```

---

## 第七部分：配置 Client 端（交易服务器）

### 步骤 14：在交易服务器上配置

现在 Server 端（播报服务器）已经部署好了，你需要在**运行交易 Bot 的服务器**上配置 Client 端。

#### 14.1 编辑 .env 文件

在交易服务器上，编辑 `.env` 文件：
```bash
nano .env
```

#### 14.2 添加配置

在文件末尾添加：
```bash
# 统计系统配置
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://43.123.45.67:3000/stats
```

**⚠️ 注意**：
- 将 `43.123.45.67` 替换成你的**播报服务器**的公网 IP
- `BOT_NAME` 可以自定义，用于区分不同的 Bot

#### 14.3 保存并退出

按 `Ctrl+O`，`Enter`，`Ctrl+X`

#### 14.4 插入统计代码

按照 `stats_system_patches.md` 中的指示，在代码中插入统计探针。

#### 14.5 重启交易 Bot

重启你的交易程序，统计系统会自动开始工作。

---

## 第八部分：故障排查

### 问题 1：无法连接到服务器

**症状**：`ssh: connect to host 43.123.45.67 port 22: Connection refused`

**解决方案**：
1. 检查服务器是否运行：在腾讯云控制台查看状态
2. 检查 IP 是否正确
3. 检查安全组是否开放 22 端口

---

### 问题 2：密码错误

**症状**：`Permission denied, please try again.`

**解决方案**：
1. 确认密码是否正确
2. 在腾讯云控制台重置密码：
   - 进入实例详情
   - 点击「重置密码」
   - 重启实例

---

### 问题 3：无法访问 3000 端口

**症状**：浏览器访问 `http://43.123.45.67:3000/health` 超时

**解决方案**：
1. 检查服务是否运行：`sudo systemctl status stats-server`
2. 检查安全组是否开放 3000 端口（回到步骤 3）
3. 检查防火墙：`sudo ufw status`

---

### 问题 4：服务启动失败

**症状**：`sudo systemctl status stats-server` 显示 `failed`

**解决方案**：
```bash
# 查看详细错误
sudo journalctl -u stats-server -n 50

# 常见原因：
# 1. 配置文件路径错误
# 2. Bun 未安装
# 3. 代码未下载
```

---

### 问题 5：没有收到钉钉消息

**症状**：服务正常运行，但钉钉没有收到消息

**解决方案**：
1. 检查 `DINGTALK_TOKEN` 是否正确：`cat ~/ritmex-bot/.env`
2. 检查钉钉机器人的关键词设置（必须包含「统计」）
3. 查看日志：`sudo journalctl -u stats-server -f`
4. 手动发送测试数据（步骤 10）

---

## 总结

### 你已经完成了：

✅ 购买并配置腾讯云服务器  
✅ 开放 3000 端口  
✅ 连接到服务器  
✅ 部署统计汇总服务器  
✅ 配置钉钉机器人  
✅ 测试服务正常运行  

### 下一步：

1. 在交易服务器上配置 Client 端
2. 插入统计代码
3. 等待每小时的播报

---

## 需要帮助？

如果遇到问题：
1. 查看日志：`sudo journalctl -u stats-server -f`
2. 检查配置：`cat ~/ritmex-bot/.env`
3. 测试连通性：`curl http://localhost:3000/health`

**祝你部署顺利！🚀**
