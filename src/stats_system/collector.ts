/**
 * 统计收集器 (Client 端)
 * 单例模式，内存中统计当前小时的交易数据
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
  
  private placeOrderCount: number = 0;
  private cancelOrderCount: number = 0;
  private fillCount: number = 0;
  private startTime: number = 0;
  
  private periodPnl: number = 0;
  private currentPosition: number = 0;
  private accountBalance: number = 0;
  
  private baselineOrderIds: Set<string> = new Set();

  init(enabled: boolean, botName: string): void {
    this.enabled = enabled;
    this.botName = botName;
    if (this.enabled) {
      this.startTime = Date.now();
      console.log("[StatsCollector] 已启用: " + this.botName);
    }
  }

  private getHourStart(timestamp: number): number {
    const date = new Date(timestamp);
    date.setMinutes(0, 0, 0);
    date.setSeconds(0, 0);
    return date.getTime();
  }

  logPlaceOrder(): void {
    if (!this.enabled) return;
    this.placeOrderCount++;
  }

  logCancelOrder(): void {
    if (!this.enabled) return;
    this.cancelOrderCount++;
  }

  logFill(): void {
    if (!this.enabled) return;
    this.fillCount++;
  }

  updateSnapshot(pnl: number, position: number, balance: number): void {
    if (!this.enabled) return;
    this.periodPnl = pnl;
    this.currentPosition = position;
    this.accountBalance = balance;
  }

  getStatsAndReset(): HourlyStats | null {
    if (!this.enabled) return null;
    
    const now = Date.now();
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
    this.startTime = now;
    this.baselineOrderIds.clear();

    return stats;
  }

  setBaselineOrders(orderIds: string[]): void {
    if (!this.enabled) return;
    this.baselineOrderIds = new Set(orderIds);
  }
  
  isBaselineOrder(orderId: string): boolean {
    return this.baselineOrderIds.has(orderId);
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
}

export const collector = new StatsCollector();
