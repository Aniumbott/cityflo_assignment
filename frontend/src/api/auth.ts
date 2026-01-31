import type { LoginResponse, MeResponse, RefreshResponse } from '../types';
import api from './axios';

export async function loginApi(username: string, password: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { username, password });
  return data;
}

export async function refreshTokenApi(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await api.post<RefreshResponse>('/auth/refresh', { refreshToken });
  return data;
}

export async function getMeApi(): Promise<MeResponse> {
  const { data } = await api.get<MeResponse>('/auth/me');
  return data;
}
