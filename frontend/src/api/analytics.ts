import api from './axios';
import type { AnalyticsStatsResponse, AnalyticsParams } from '../types';

export async function getAnalyticsStats(params?: AnalyticsParams): Promise<AnalyticsStatsResponse> {
  const response = await api.get<AnalyticsStatsResponse>('/analytics/stats', { params });
  return response.data;
}
