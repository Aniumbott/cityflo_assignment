import api from './axios';
import type {
  NotificationListResponse,
  MarkNotificationReadResponse,
  MarkAllReadResponse,
} from '../types';

export async function listNotifications(params?: {
  page?: number;
  limit?: number;
}): Promise<NotificationListResponse> {
  const { data } = await api.get<NotificationListResponse>('/notifications', { params });
  return data;
}

export async function markNotificationRead(id: string): Promise<MarkNotificationReadResponse> {
  const { data} = await api.patch<MarkNotificationReadResponse>(`/notifications/${id}/read`);
  return data;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  const { data } = await api.patch<MarkAllReadResponse>('/notifications/read-all');
  return data;
}
