# 统计系统集成指南

## 📋 概述

本文档提供了将分布式统计系统集成到 ritmex-bot 的完整指南。统计系统采用**零侵入**设计，不会影响现有交易逻辑。

---

## 🔧 环境配置

在 `.env` 文件中添加以下配置：

```bash
# 统计系统配置
ENABLE_STATS=true                          # 是否启用统计系统
STATS_ROLE=CLIENT                          # 角色：CLIENT 或 SERVER
BOT_NAME=bot-1                             # Bot 名称（用于区分不同实例）
STATS_SERVER_URL=http://localhost:3000/stats  # Server 端接收地址
STATS_SERVER_PORT=3000                     # Server 端监听端口（仅 SERVER 角色需要）
DINGTALK_TOKEN=your_dingtalk_token_here    # 钉钉机器人 Token（仅 SERVER 角色需要）
```

---

## 📍 插桩位置

### 1. 初始化统计系统

**文件**: `src/cli/strategy-runner.ts`  
**位置**: 在 `startStrategy` 函数的开头（第 33 行之后）

```typescript
import { initStatsSystem } from "../stats_system";

export async function startStrategy(strategyId: StrategyId, options: RunnerOptions = {}): Promise<void> {
  // 初始化统计系统
  initStatsSystem();
  
  const runner = STRATEGY_FACTORIES[strategyId];
  if (!runner) {
    throw new Error(`Unsupported strategy: ${strategyId}`);
  }
  await runner(options);
}
```

---

### 2. 记录挂单事件

**文件**: `src/core/order-coordinator.ts`  
**位置**: 在 `placeOrder` 函数成功返回前（第 186 行之后）

```typescript
import { collector } from "../stats_system";

export async function placeOrder(
  // ... 参数省略
): Promise<AsterOrder | undefined> {
  // ... 原有逻辑
  try {
    const order = await routeLimitOrder({
      // ... 参数省略
    });
    pendings[type] = String(order.orderId);
    log("order", `挂限价单: ${side} @ ${priceNum} 数量 ${quantity} reduceOnly=${reduceOnly}${opts?.slPrice ? ` sl=${opts.slPrice}` : ""}`);
    
    // 🔴 插桩：记录挂单事件
    collector.logPlaceOrder();
    
    return order;
  } catch (err) {
    // ... 错误处理
  }
}
```

**同样的插桩逻辑**需要添加到以下函数：
- `placeMarketOrder` (第 236 行之后)
- `placeStopLossOrder` (第 302 行之后)
- `placeTrailingStopOrder` (第 360 行之后)

---

### 3. 记录撤单事件

**文件**: `src/core/order-coordinator.ts`  
**位置**: 在 `deduplicateOrders` 函数撤单成功后（第 119 行之后）

```typescript
export async function deduplicateOrders(
  // ... 参数省略
): Promise<void> {
  // ... 原有逻辑
  try {
    lockOperating(locks, timers, pendings, type, log);
    await adapter.cancelOrders({ symbol, orderIdList });
    log("order", `去重撤销重复 ${type} 单: ${orderIdList.join(",")}`);
    
    // 🔴 插桩：记录撤单事件（批量撤单，按数量计数）
    for (let i = 0; i < orderIdList.length; i++) {
      collector.logCancelOrder();
    }
  } catch (err) {
    // ... 错误处理
  }
}
```

**注意**: 如果策略引擎中有其他直接调用 `adapter.cancelOrder` 或 `adapter.cancelOrders` 的地方，也需要添加类似的插桩。

---

### 4. 记录成交事件

**文件**: `src/strategy/grid-engine.ts` (以 Grid 策略为例)  
**位置**: 在 `watchOrders` 回调中检测订单消失时（第 301-316 行附近）

```typescript
import { collector } from "../stats_system";

safeSubscribe<AsterOrder[]>(
  this.exchange.watchOrders.bind(this.exchange),
  (orders) => {
    this.openOrders = Array.isArray(orders)
      ? orders.filter((order) => order.symbol === this.config.symbol)
      : [];
    this.synchronizeLocks(orders);
    this.ordersVersion += 1;
    
    // 🔴 插桩：检测订单消失（可能是成交）
    const currentIds = new Set(this.openOrders.map(o => String(o.orderId)));
    for (const prevId of this.prevActiveIds) {
      if (!currentIds.has(prevId)) {
        // 订单消失，记录为成交
        collector.logFill();
      }
    }
    this.prevActiveIds = currentIds;
    
    if (!this.feedArrived.orders) {
      this.feedArrived.orders = true;
      log("info", "订单快照已同步");
      this.startupCancelPromise = this.cancelAllExistingOrdersOnStartup();
    }
    this.feedStatus.orders = true;
    this.tryLockSidesOnce();
    this.tryHandleInitialClose();
    this.emitUpdate();
  },
  log,
  {
    subscribeFail: (error) => `订阅订单失败: ${extractMessage(error)}`,
    processFail: (error) => `订单推送处理异常: ${extractMessage(error)}`,
  }
);
```

**需要添加的成员变量**:
```typescript
export class GridEngine {
  // ... 其他成员
  private prevActiveIds: Set<string> = new Set<string>(); // 🔴 新增
}
```

**同样的逻辑**需要添加到其他策略引擎：
- `maker-engine.ts`
- `offset-maker-engine.ts`
- `liquidity-maker-engine.ts`
- `maker-points-engine.ts`
- `trend-engine.ts`
- `guardian-engine.ts`
- `basis-arb-engine.ts`

---

### 5. 更新快照数据

**文件**: `src/strategy/grid-engine.ts` (以 Grid 策略为例)  
**位置**: 在 `watchAccount` 回调中（第 276-297 行附近）

```typescript
import { collector } from "../stats_system";

safeSubscribe<AsterAccountSnapshot>(
  this.exchange.watchAccount.bind(this.exchange),
  (snapshot) => {
    this.accountSnapshot = snapshot;
    this.position = getPosition(snapshot, this.config.symbol);
    
    // 🔴 插桩：更新快照数据
    const pnl = this.position?.unrealizedPnl || 0;
    const position = this.position?.positionAmt || 0;
    const balance = snapshot.totalWalletBalance || 0;
    collector.updateSnapshot(pnl, position, balance);
    
    if (!this.feedArrived.account) {
      this.feedArrived.account = true;
      log("info", "账户快照已同步");
    }
    this.feedStatus.account = true;
    this.emitUpdate();
  },
  log,
  {
    subscribeFail: (error) => `订阅账户失败: ${extractMessage(error)}`,
    processFail: (error) => `账户推送处理异常: ${extractMessage(error)}`,
  }
);
```

**同样的逻辑**需要添加到其他策略引擎的 `watchAccount` 回调中。

---

## 🚀 启动方式

### Client 端（交易服务器）

```bash
# 配置 .env
ENABLE_STATS=true
STATS_ROLE=CLIENT
BOT_NAME=bot-1
STATS_SERVER_URL=http://192.168.1.100:3000/stats

# 启动交易策略（会自动初始化统计系统）
bun run src/index.tsx --strategy grid
```

### Server 端（汇总服务器）

```bash
# 配置 .env
ENABLE_STATS=true
STATS_ROLE=SERVER
STATS_SERVER_PORT=3000
DINGTALK_TOKEN=your_token_here

# 启动汇总服务器
bun run src/stats_system/server.ts
```

---

## 📊 数据流程

1. **Client 端**:
   - 在挂单/撤单/成交时，调用 `collector.logXXX()` 记录事件
   - 每小时整点（00:00），自动将统计数据 POST 到 Server
   - 发送后立即清零计数器

2. **Server 端**:
   - 接收各 Client 的统计数据，暂存在内存中
   - 每小时 02 分（XX:02:00），汇总所有数据
   - 生成 Markdown 表格，发送到钉钉机器人

---

## ⚠️ 注意事项

1. **零干扰原则**: 所有 `collector.logXXX()` 调用都是同步的，不会阻塞主线程
2. **容错设计**: 统计失败不会影响交易逻辑，所有错误都会被静默捕获
3. **最小修改**: 原有文件中只插入单行代码，不修改任何业务逻辑
4. **物理隔离**: 所有统计代码都在 `src/stats_system/` 目录下

---

## 🧪 测试

### 健康检查

```bash
# 检查 Server 是否正常运行
curl http://localhost:3000/health
```

### 手动上报测试

```bash
# 模拟 Client 上报数据
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

## 📝 总结

- ✅ 零侵入设计，不修改核心交易逻辑
- ✅ 旁路模式，统计失败不影响交易
- ✅ 分布式架构，支持多 Bot 实例
- ✅ 自动定时上报和播报
- ✅ 钉钉机器人集成

如有问题，请检查日志中的 `[StatsCollector]`、`[StatsReporter]` 和 `[StatsServer]` 前缀的输出。
