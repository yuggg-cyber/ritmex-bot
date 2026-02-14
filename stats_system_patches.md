# 统计系统补丁代码

以下是需要在原有文件中插入的**最小化补丁代码**。每个补丁都标注了精确的插入位置。

---

## 补丁 1: 初始化统计系统

**文件**: `src/cli/strategy-runner.ts`  
**位置**: 第 33 行之后（`startStrategy` 函数开头）

```typescript
// 在文件顶部添加导入
import { initStatsSystem } from "../stats_system";

// 在 startStrategy 函数开头添加初始化
export async function startStrategy(strategyId: StrategyId, options: RunnerOptions = {}): Promise<void> {
  initStatsSystem(); // 🔴 新增：初始化统计系统
  
  const runner = STRATEGY_FACTORIES[strategyId];
  // ... 后续代码不变
}
```

---

## 补丁 2: 记录挂单事件

**文件**: `src/core/order-coordinator.ts`  
**位置**: 在文件顶部添加导入

```typescript
import { collector } from "../stats_system";
```

### 2.1 placeOrder 函数

**位置**: 第 186 行之后

```typescript
    log("order", `挂限价单: ${side} @ ${priceNum} 数量 ${quantity} reduceOnly=${reduceOnly}${opts?.slPrice ? ` sl=${opts.slPrice}` : ""}`);
    collector.logPlaceOrder(); // 🔴 新增
    return order;
```

### 2.2 placeMarketOrder 函数

**位置**: 第 235 行之后

```typescript
    log("order", `市价单: ${side} 数量 ${quantity} reduceOnly=${reduceOnly}`);
    collector.logPlaceOrder(); // 🔴 新增
    return order;
```

### 2.3 placeStopLossOrder 函数

**位置**: 第 302 行之后

```typescript
    log("stop", `挂止损单: ${side} STOP_MARKET @ ${normalizedStop}`);
    collector.logPlaceOrder(); // 🔴 新增
    return order;
```

### 2.4 placeTrailingStopOrder 函数

**位置**: 第 360 行之后（需要先找到这个函数的 log 语句）

```typescript
    log("stop", `挂动态止盈单: ${side} @ ${normalizedActivation} 回调率 ${callbackRate}`);
    collector.logPlaceOrder(); // 🔴 新增
    return order;
```

---

## 补丁 3: 记录撤单事件

**文件**: `src/core/order-coordinator.ts`  
**位置**: 第 119 行之后（`deduplicateOrders` 函数）

```typescript
    await adapter.cancelOrders({ symbol, orderIdList });
    log("order", `去重撤销重复 ${type} 单: ${orderIdList.join(",")}`);
    for (let i = 0; i < orderIdList.length; i++) { // 🔴 新增
      collector.logCancelOrder(); // 🔴 新增
    } // 🔴 新增
  } catch (err) {
```

---

## 补丁 4: 记录成交事件（Grid 策略示例）

**文件**: `src/strategy/grid-engine.ts`

### 4.1 添加导入

**位置**: 文件顶部

```typescript
import { collector } from "../stats_system";
```

### 4.2 添加成员变量

**位置**: GridEngine 类的成员变量区域（约第 95 行附近）

```typescript
  private prevActiveIds: Set<string> = new Set<string>(); // 🔴 新增：用于检测订单消失
```

### 4.3 检测成交事件

**位置**: `bootstrap()` 方法中的 `watchOrders` 回调（约第 301-306 行）

```typescript
    safeSubscribe<AsterOrder[]>(
      this.exchange.watchOrders.bind(this.exchange),
      (orders) => {
        this.openOrders = Array.isArray(orders)
          ? orders.filter((order) => order.symbol === this.config.symbol)
          : [];
        
        // 🔴 新增：检测订单消失（成交）
        const currentIds = new Set(this.openOrders.map(o => String(o.orderId)));
        for (const prevId of this.prevActiveIds) {
          if (!currentIds.has(prevId)) {
            collector.logFill();
          }
        }
        this.prevActiveIds = currentIds;
        // 🔴 新增结束
        
        this.synchronizeLocks(orders);
        this.ordersVersion += 1;
        // ... 后续代码不变
      },
```

---

## 补丁 5: 更新快照数据（Grid 策略示例）

**文件**: `src/strategy/grid-engine.ts`  
**位置**: `bootstrap()` 方法中的 `watchAccount` 回调（约第 276-280 行）

```typescript
    safeSubscribe<AsterAccountSnapshot>(
      this.exchange.watchAccount.bind(this.exchange),
      (snapshot) => {
        this.accountSnapshot = snapshot;
        this.position = getPosition(snapshot, this.config.symbol);
        
        // 🔴 新增：更新统计快照
        const pnl = this.position?.unrealizedPnl || 0;
        const position = this.position?.positionAmt || 0;
        const balance = snapshot.totalWalletBalance || 0;
        collector.updateSnapshot(pnl, position, balance);
        // 🔴 新增结束
        
        if (!this.feedArrived.account) {
          this.feedArrived.account = true;
          log("info", "账户快照已同步");
        }
        // ... 后续代码不变
      },
```

---

## 其他策略引擎的补丁

**需要应用补丁 4 和补丁 5 的文件**:
- `src/strategy/maker-engine.ts`
- `src/strategy/offset-maker-engine.ts`
- `src/strategy/liquidity-maker-engine.ts`
- `src/strategy/maker-points-engine.ts`
- `src/strategy/trend-engine.ts`
- `src/strategy/guardian-engine.ts`
- `src/strategy/basis-arb-engine.ts`

**插桩位置**: 在各自的 `bootstrap()` 或构造函数中找到 `watchOrders` 和 `watchAccount` 的订阅回调，应用相同的逻辑。

---

## 验证清单

- [ ] 已在 `.env` 中配置统计系统参数
- [ ] 已应用补丁 1（初始化）
- [ ] 已应用补丁 2（挂单事件）
- [ ] 已应用补丁 3（撤单事件）
- [ ] 已应用补丁 4（成交事件）到所有策略引擎
- [ ] 已应用补丁 5（快照更新）到所有策略引擎
- [ ] 已测试 Client 端启动无报错
- [ ] 已测试 Server 端启动并接收数据
- [ ] 已测试钉钉机器人播报

---

## 注意事项

1. **所有补丁都是单行或少量行的插入**，不修改任何现有逻辑
2. **collector 的所有方法都是同步的**，不会阻塞主线程
3. **如果统计系统未启用**（`ENABLE_STATS=false`），所有 `collector.logXXX()` 调用都会立即返回，零开销
4. **补丁代码可以安全地合并到主分支**，不会影响未启用统计的用户
