import { createApiClient } from '@/shared/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import type { AiReportData, AnalyseOneRequest, AnalyseOneResponse } from '@/features/stocks/types';
import Constants from 'expo-constants';

function getAiServiceBaseUrl(): string {
  const fromEnv =
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.EXPO_PUBLIC_AI_SERVICE_URL;
  const fromExtra =
    (Constants.expoConfig?.extra as Record<string, unknown> | undefined)
      ?.EXPO_PUBLIC_AI_SERVICE_URL;
  const value = (fromEnv ?? fromExtra ?? 'http://localhost:5100') as string;
  return value.replace(/\/+$/, '');
}

export async function analyseOneStock(
  payload: AnalyseOneRequest,
  signal?: AbortSignal,
): Promise<AnalyseOneResponse> {
  const token = useAuthStore.getState().session?.accessToken;
  const apiClient = createApiClient();

  const response = await apiClient.post<AnalyseOneResponse>(
    `${getAiServiceBaseUrl()}/api/ai-reports/analyse-one`,
    payload,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
      timeout: 300_000,
    },
  );

  const body = response.data;
  if (response.status === 401) throw new Error('Phiên đăng nhập hết hạn.');
  if (response.status === 403) throw new Error('Bạn không có quyền phân tích mã này.');
  if (response.status === 404) throw new Error('Không tìm thấy dữ liệu cho mã này.');
  if (response.status >= 400 || body.code === 0) {
    throw new Error(body?.message ?? 'Không thể phân tích.');
  }
  return body;
}

export type HistoryListItem = {
  id: string;
  report_id: string;
  symbol: string;
  exchange: string;
  company: string | null;
  provider: string;
  model: string;
  total_score: number | null;
  score: number | null;
  data_confidence: number | null;
  decision_label: string | null;
  status: string | null;
  created_at: string;
  generated_at: string | null;
};

export type HistoryListResponse = {
  code?: number;
  message?: string;
  data?: {
    items: HistoryListItem[];
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
};

export async function fetchHistory(params: {
  symbol?: string;
  page?: number;
  limit?: number;
}): Promise<HistoryListResponse> {
  const token = useAuthStore.getState().session?.accessToken;
  const apiClient = createApiClient();

  const response = await apiClient.get<HistoryListResponse>(
    `${getAiServiceBaseUrl()}/api/ai-reports/history`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      params: { symbol: params.symbol, page: params.page ?? 1, limit: params.limit ?? 20 },
    },
  );

  if (response.status >= 400) {
    throw new Error(response.data?.message ?? 'Không thể tải lịch sử phân tích.');
  }
  return response.data;
}

export type HistoryDetailResponse = {
  code?: number;
  message?: string;
  data?: {
    id: string;
    report_id: string;
    report_json: { data?: AiReportData };
  };
};

export async function fetchHistoryDetail(historyId: string): Promise<HistoryDetailResponse> {
  const token = useAuthStore.getState().session?.accessToken;
  const apiClient = createApiClient();

  const response = await apiClient.get<HistoryDetailResponse>(
    `${getAiServiceBaseUrl()}/api/ai-reports/history/${historyId}`,
    {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  );

  if (response.status >= 400) {
    throw new Error(response.data?.message ?? 'Không thể tải chi tiết báo cáo.');
  }
  return response.data;
}
