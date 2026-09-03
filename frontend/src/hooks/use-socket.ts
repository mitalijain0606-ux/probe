import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/auth-context';
import type { CheckStatus, ErrorType, MonitoredUrl } from '@/types/api';

interface CheckCompletedPayload {
  urlId: string;
  status: CheckStatus;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorType: ErrorType;
  checkedAt: string;
}

export function useSocket(): void {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('uho_token');
    if (!token) return;

    const socket = io('/', {
      path: '/socket.io',
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.on('url:check-completed', (payload: CheckCompletedPayload) => {
      queryClient.setQueryData<MonitoredUrl[]>(['urls'], (current) => {
        if (!current) return current;
        return current.map((item) =>
          item.id === payload.urlId
            ? {
                ...item,
                currentStatus: payload.status,
                currentStatusCode: payload.statusCode,
                currentResponseTimeMs: payload.responseTimeMs,
                lastErrorType: payload.errorType,
                lastCheckedAt: payload.checkedAt,
              }
            : item,
        );
      });
      queryClient.invalidateQueries({ queryKey: ['url', payload.urlId] });
      queryClient.invalidateQueries({ queryKey: ['url-history', payload.urlId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, queryClient]);
}
