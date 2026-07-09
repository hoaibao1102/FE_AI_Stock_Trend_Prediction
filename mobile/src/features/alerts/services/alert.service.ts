import { createApiClient } from '@/shared/services/api.service';
import { useAuthStore } from '@/stores/auth.store';
import type { AlertItem, AlertType, AlertStatus, CreateAlertPayload } from '../types';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

export async function getAlerts(): Promise<AlertItem[]> {
  const token = useAuthStore.getState().session?.accessToken;
  const api = createApiClient();

  const res = await api.get<ApiResponse<AlertItem[]>>('/api/alerts', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status === 401) throw new Error('Please log in to view alerts');
  if (res.status < 200 || res.status >= 300)
    throw new Error(res.data?.message || 'Failed to load alerts');
  return res.data?.data ?? [];
}

export async function getAlertsByStock(symbol: string): Promise<AlertItem[]> {
  const all = await getAlerts();
  return all.filter((a) => a.symbol === symbol.toUpperCase());
}

export async function createAlert(data: CreateAlertPayload): Promise<AlertItem> {
  const token = useAuthStore.getState().session?.accessToken;
  const api = createApiClient();

  const res = await api.post<ApiResponse<AlertItem>>('/api/alerts', data, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (res.status === 400)
    throw new Error(res.data?.message || 'Alert limit exceeded or validation failed');
  if (res.status === 404)
    throw new Error(res.data?.message || 'Stock symbol not found');
  if (!res.data?.success || !res.data?.data)
    throw new Error(res.data?.message || 'Failed to create alert');
  return res.data.data;
}

export async function updateAlert(
  id: string,
  data: { threshold?: number; status?: AlertStatus },
): Promise<AlertItem> {
  const token = useAuthStore.getState().session?.accessToken;
  const api = createApiClient();

  const res = await api.put<ApiResponse<AlertItem>>(`/api/alerts/${id}`, data, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.data?.success || !res.data?.data)
    throw new Error(res.data?.message || 'Failed to update alert');
  return res.data.data;
}

export async function deleteAlert(id: string): Promise<void> {
  const token = useAuthStore.getState().session?.accessToken;
  const api = createApiClient();

  const res = await api.delete<ApiResponse<null>>(`/api/alerts/${id}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  if (!res.data?.success)
    throw new Error(res.data?.message || 'Failed to delete alert');
}

/** Toggle ACTIVE ↔ DISABLED. For TRIGGERED, pass 'ACTIVE' to reset. */
export async function toggleAlert(
  id: string,
  currentStatus: AlertStatus,
): Promise<AlertItem> {
  const nextStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
  return updateAlert(id, { status: nextStatus });
}

/** Validate threshold is positive. For PRICE_ABOVE/BELOW, min 1000. For VOLUME_SPIKE, min 1.0. */
export function validateThreshold(
  alertType: AlertType,
  value: string,
): string | null {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return 'Threshold must be a positive number';
  if (
    (alertType === 'PRICE_ABOVE' || alertType === 'PRICE_BELOW') &&
    num < 1000
  )
    return 'Price threshold min 1,000 VND';
  if (alertType === 'VOLUME_SPIKE' && num < 1)
    return 'Volume multiplier min 1.0x';
  return null;
}
