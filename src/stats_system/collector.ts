/**
 * 统计收集器 (Client 端)
 * 单例模式，内存中统计当前小时的交易数据
 * 零干扰设计：所有方法都是同步的，不会阻塞主线程
 */

export interface HourlyStats {
  botName: string;
  timestamp: number; // 统计时段的起始时间戳（小时整点）
  placeOrderCount: number; // 挂单次数
  cancelOrderCount: number; // 撤单次数
  fillCount: number; // 成交次数
  durationMs: number; // 持续时长（毫秒）
  periodPnl: number; // 周期盈亏
  currentPosition: number; // 当前仓位
  accountBalance: number; // 账户余额
}

class StatsCollector {
  private enabled: boolean = false;
  private botName: string = "unknown";
  
  // 当前小时的统计数据
  private currentHourStart: number = 0;
  private placeOrderCount: number = 0;
  private cancelOrderCount: number = 0;
  private fillCount: number = 0;
  private startTime: number = 0;
  
  // 快照数据（由外部定期更新）
  private periodPnl: number = 0;
  private currentPosition: number = 0;
  private accountBalance: number = 0;
  
  // 统计周期开始时的基准订单 ID（用于排除上个周期遗留的订单）
  private baselineOrderIds: Set<string> = new Set();

  /**
   * 初始化收集器
   */
  init(enabled: boolean, botName: string): void {
    this.enabled = enabled;
    this.botName = botName;
    if (this.enabled) {
      this.startTime = Date.now();
      this.currentHourStart = this.getHourStart(this.startTime);
      console.log("[StatsCollector] 已启用，Bot名称: " + this.botName);
    }
  }

  /**
   * 获取当前小时的起始时间戳
   */
  private getHourStart(timestamp: number): number {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    date.setSeconds(0, 0);
    return date.getTime();
  }

  /**
   * 记录挂单事件
   */
  logPlaceOrder(): void {
    if (!this.enabled) return;
    this.placeOrderCount++;
  }

  /**
   * 记录撤单事件
   */
  logCancelOrder(): void {
    if (!this.enabled) return;
    this.cancelOrderCount++;
  }

  /**
   * 记录成交事件
   */
  logFill(): void {
    if (!this.enabled) return;
    this.fillCount++;
  }

  /**
   * 更新快照数据（由策略引擎定期调用）
   */
  updateSnapshot(pnl: number, position: number, balance: number): void {
    if (!this.enabled) return;
    this.periodPnl = pnl;
    this.currentPosition = position;
    this.accountBalance = balance;
  }

  /**
   * 获取当前统计数据并重置计数器
   */
  getStatsAndReset(): HourlyStats | null {
    if (!this.enabled) return null;
    
    const now = Date.now();
    // 修复：使用当前小时的时间戳，以便 Server 端实时累加
    const hourStart = this.getHourStart(now);
    
    const stats: HourlyStats = {
      botName: this.botName,
      timestamp: hourStart, 
      placeOrderCount: this.placeOrderCount,
      cancelOrderCount: this.cancelOrderCount,
      fillCount: this.fillCount,
      durationMs: now - this.startTime,
      periodPnl: this.periodPnl,
      currentPosition: this.currentPosition,
      accountBalance: this.accountBalance,
    };

    // 重置计数器
    this.placeOrderCount = 0;
    this.cancelOrderCount = 0;
    this.fillCount = 0;
    this.currentHourStart = hourStart;
    this.startTime = now;
    this.baselineOrderIds.clear();

    return stats;
  }

  /**
   * 设置统计周期开始时的基准订单 ID
   */
  setBaselineOrders(orderIds: string[]): void {
    if (!this.enabled) return;
    this.baselineOrderIds = new Set(orderIds);
  }
  
  /**
   * 检查订单是否是基准订单
   */
  isBaselineOrder(orderId: string): boolean {
    return this.baselineOrderIds.has(orderId);
  }
  
  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// 导出单例
export const collector = new StatsCollector();
