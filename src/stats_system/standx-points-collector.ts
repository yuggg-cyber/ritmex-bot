/**
 * StandX 积分查询收集器
 * 负责查询 StandX API 获取各项积分数据
 * 采用异步非阻塞设计，确保不影响主业务
 */

export interface StandxPointsData {
  botName: string;
  timestamp: number;
  tradingPoints: number;      // 交易积分（已缩放）
  makerPoints: number;         // 挂单积分（已缩放）
  makerUptimeHours: number;    // 做市时长（小时）
  perpsPoints: number;         // 存款积分（已缩放）
}

/**
 * API 端点映射
 */
const STANDX_ENDPOINTS = {
  TRADING_CAMPAIGN: "https://api.standx.com/v1/offchain/trading-campaign/points",
  MAKER_CAMPAIGN: "https://api.standx.com/v1/offchain/maker-campaign/points",
  MAKER_UPTIME: "https://perps.standx.com/api/maker/uptime",
  PERPS_CAMPAIGN: "https://api.standx.com/v1/offchain/perps-campaign/points",
};

/**
 * 单位缩放因子
 * 根据实际测试得出的转换规则
 */
const SCALE_FACTORS = {
  TRADING: 1_000_000,           // 交易积分 ÷ 1,000,000
  MAKER: 1_000_000_000,         // 挂单积分 ÷ 1,000,000,000
  PERPS: 1_000_000_000,         // 存款积分 ÷ 1,000,000,000
};

class StandxPointsCollector {
  private token: string = "";
  private enabled: boolean = false;

  /**
   * 初始化收集器
   */
  init(): void {
    this.token = process.env.STANDX_TOKEN || "";
    this.enabled = !!this.token;

    if (this.enabled) {
      console.log("[StandxPointsCollector] 已启用，Token 长度: " + this.token.length);
      this.checkTokenExpiry();
    } else {
      console.log("[StandxPointsCollector] 未启用（未配置 STANDX_TOKEN）");
    }
  }

  /**
   * 检查 Token 有效期
   */
  private checkTokenExpiry(): void {
    const createDate = process.env.STANDX_TOKEN_CREATE_DATE;
    const validityDays = Number(process.env.STANDX_TOKEN_VALIDITY_DAYS) || 30;

    if (createDate) {
      const created = new Date(createDate);
      const expiry = new Date(created.getTime() + validityDays * 24 * 60 * 60 * 1000);
      const now = new Date();
      const daysLeft = Math.floor((expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

      if (daysLeft <= 0) {
        console.warn("[StandxPointsCollector] ⚠️  Token 已过期！请重新生成。");
      } else if (daysLeft <= 3) {
        console.warn("[StandxPointsCollector] ⚠️  Token 将在 " + daysLeft + " 天后过期，请及时更新。");
      } else {
        console.log("[StandxPointsCollector] Token 有效期剩余: " + daysLeft + " 天");
      }
    }
  }

  /**
   * 查询所有积分数据
   * @returns 积分数据对象，失败时返回 null
   */
  async fetchPoints(): Promise<StandxPointsData | null> {
    if (!this.enabled) return null;

    try {
      // 按顺序查询四个接口，每个接口之间延迟 1 秒
      const tradingPoints = await this.fetchTradingCampaign();
      await this.delay(1000);

      const makerPoints = await this.fetchMakerCampaign();
      await this.delay(1000);

      const makerUptimeHours = await this.fetchMakerUptime();
      await this.delay(1000);

      const perpsPoints = await this.fetchPerpsCampaign();

      const pointsData: StandxPointsData = {
        botName: process.env.BOT_NAME || "UnknownBot",
        timestamp: Date.now(),
        tradingPoints,
        makerPoints,
        makerUptimeHours,
        perpsPoints,
      };

      console.log("[StandxPointsCollector] 查询成功: 交易=" + tradingPoints.toFixed(2) + 
                  ", 挂单=" + makerPoints.toFixed(2) + 
                  ", 时长=" + makerUptimeHours.toFixed(2) + 
                  ", 存款=" + perpsPoints.toFixed(2));

      return pointsData;
    } catch (error: any) {
      console.error("[StandxPointsCollector] 查询失败:", error.message);
      return null;
    }
  }

  /**
   * 查询交易积分
   */
  private async fetchTradingCampaign(): Promise<number> {
    const data = await this.fetchAPI(STANDX_ENDPOINTS.TRADING_CAMPAIGN);
    const totalPoint = data?.total_point || 0;
    return totalPoint / SCALE_FACTORS.TRADING;
  }

  /**
   * 查询挂单积分
   */
  private async fetchMakerCampaign(): Promise<number> {
    const data = await this.fetchAPI(STANDX_ENDPOINTS.MAKER_CAMPAIGN);
    const totalPoint = data?.total_point || 0;
    return totalPoint / SCALE_FACTORS.MAKER;
  }

  /**
   * 查询做市时长
   */
  private async fetchMakerUptime(): Promise<number> {
    const data = await this.fetchAPI(STANDX_ENDPOINTS.MAKER_UPTIME);
    return data?.total_eligible_hours || 0;
  }

  /**
   * 查询存款积分
   */
  private async fetchPerpsCampaign(): Promise<number> {
    const data = await this.fetchAPI(STANDX_ENDPOINTS.PERPS_CAMPAIGN);
    const totalPoint = data?.total_point || 0;
    return totalPoint / SCALE_FACTORS.PERPS;
  }

  /**
   * 通用 API 请求方法
   */
  private async fetchAPI(url: string): Promise<any> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": "Bearer " + this.token,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5 秒超时
    });

    if (!response.ok) {
      throw new Error("HTTP " + response.status + " for " + url);
    }

    return await response.json();
  }

  /**
   * 延迟函数
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 检查是否已启用
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}

// 导出单例
export const standxCollector = new StandxPointsCollector();
