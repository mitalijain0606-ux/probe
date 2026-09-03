import { http } from './http';
import type { ApiSuccess, User } from '@/types/api';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  token: string;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { data } = await http.post<ApiSuccess<AuthResponse>>('/auth/register', payload);
  return data.data;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await http.post<ApiSuccess<AuthResponse>>('/auth/login', payload);
  return data.data;
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

export async function me(): Promise<User> {
  const { data } = await http.get<ApiSuccess<User>>('/auth/me');
  return data.data;
}
