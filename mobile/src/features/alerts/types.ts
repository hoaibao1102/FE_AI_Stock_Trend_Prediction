export type AlertType = 'PRICE_ABOVE' | 'PRICE_BELOW' | 'VOLUME_SPIKE';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'DISABLED';

export type AlertItem = {
  id: string;
  symbol: string;
  company_name: string;
  alert_type: AlertType;
  threshold: number;
  status: AlertStatus;
  triggered_at: string | null;
  triggered_value: number | null;
  latest_price: { close_price: number; volume: number } | null;
  created_at: string;
  updated_at: string;
};

export type CreateAlertPayload = {
  symbol: string;
  alert_type: AlertType;
  threshold: number;
};

export type UpdateAlertPayload = {
  threshold?: number;
  status?: 'ACTIVE' | 'DISABLED';
};

export const PLAN_LIMITS = {
  FREE: { max_alert_stocks: 2, max_alerts_per_stock: 2 },
  PRO: { max_alert_stocks: 50, max_alerts_per_stock: 10 },
} as const;
