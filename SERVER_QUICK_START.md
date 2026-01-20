# 服务器部署快速开始（5 分钟版）

## 🚀 超快速部署

如果你想快速部署，只需要 3 个命令：

### 1. 连接到服务器
```bash
ssh ubuntu@你的服务器IP
```

### 2. 下载并运行一键部署脚本
```bash
curl -fsSL https://raw.githubusercontent.com/yuggg-cyber/ritmex-bot/main/deploy_server.sh | bash
```

### 3. 配置钉钉 Token
```bash
nano ~/ritmex-bot/.env
```
填写 `DINGTALK_TOKEN=你的token`，然后按 `Ctrl+O` 保存，`Ctrl+X` 退出。

### 4. 重启服务
```bash
sudo systemctl restart stats-server
```

完成！🎉

---

## 📋 详细步骤

如果一键脚本失败，或者你想手动部署，请查看完整教程：
- **完整教程**: `SERVER_DEPLOYMENT_GUIDE.md`

---

## 🔧 常用命令速查

```bash
# 查看服务状态
sudo systemctl status stats-server

# 查看实时日志
sudo journalctl -u stats-server -f

# 重启服务
sudo systemctl restart stats-server

# 停止服务
sudo systemctl stop stats-server

# 测试健康检查
curl http://localhost:3000/health

# 更新代码
cd ~/ritmex-bot && git pull && sudo systemctl restart stats-server
```

---

## 🧪 测试发送数据

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

---

## 📊 获取钉钉 Token

1. 打开钉钉，进入群聊
2. 群设置 → 智能群助手 → 添加机器人 → 自定义
3. 机器人名称：`交易统计播报`
4. 安全设置：自定义关键词 → 输入 `统计`
5. 复制 Webhook 中的 `access_token` 部分

例如 Webhook 是：
```
https://oapi.dingtalk.com/robot/send?access_token=abcd1234567890xyz
```

那么 Token 就是：`abcd1234567890xyz`

---

## ⚠️ 别忘了

1. ✅ 在腾讯云控制台的**安全组**中开放 **3000 端口**
2. ✅ 配置 `.env` 文件中的 `DINGTALK_TOKEN`
3. ✅ 重启服务使配置生效

---

## 🎯 下一步

Server 端部署完成后，需要在**交易服务器**（运行 Bot 的机器）上配置 Client 端：

在交易服务器的 `.env` 中添加：
```bash
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://你的Server服务器IP:3000/stats
```

然后按照 `stats_system_patches.md` 插入统计代码。

---

## 📞 遇到问题？

查看完整教程：`SERVER_DEPLOYMENT_GUIDE.md`
