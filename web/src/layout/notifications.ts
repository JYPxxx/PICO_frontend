import { useCallback, useEffect, useState } from 'react';
import { api, unwrap } from '../api/client';
import type { components } from '../api/schema';
import { useAuth } from '../auth/AuthContext';

// 알림: GET /api/notifications, 개별 조회 시 자동 읽음(GET /api/notifications/{id}), PATCH /api/notifications/read-all
export type Notification = components['schemas']['NotificationResponse'];

const POLL_MS = 30_000;

/** 로그인한 동안 화면을 옮길 때(key가 바뀔 때), 창으로 돌아올 때, 화면이 보이는 동안 30초마다 새로 받는다. */
export function useNotifications(key: string) {
  const { loggedIn } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const reload = useCallback(async () => {
    if (!loggedIn) return setItems([]);
    const list = await unwrap<Notification[]>(api.GET('/api/notifications', { params: { query: { page: 0, size: 50 } } })).catch(() => null);
    if (list) setItems(list);
  }, [loggedIn]);
  useEffect(() => {
    void reload();
  }, [reload, key]);
  useEffect(() => {
    if (!loggedIn) return;
    const refresh = () => {
      if (document.visibilityState === 'visible') void reload();
    };
    const timer = window.setInterval(refresh, POLL_MS); // 숨겨진 탭에서는 요청하지 않는다
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [loggedIn, reload]);

  async function open(n: Notification) {
    setItems((all) => all.map((x) => (x.notificationId === n.notificationId ? { ...x, readAt: x.readAt ?? new Date().toISOString() } : x)));
    await unwrap(api.GET('/api/notifications/{notificationId}', { params: { path: { notificationId: n.notificationId } } })).catch(() => null);
  }
  async function readAll() {
    await unwrap(api.PATCH('/api/notifications/read-all')).catch(() => null);
    await reload();
  }
  return { items, unread: items.filter((n) => !n.readAt).length, open, readAll, reload };
}
