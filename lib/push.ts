// PRD §6.12 Web Push 客户端注册——VAPID。
// 检查浏览器支持，请求权限，订阅 push，POST 到 /api/push/subscribe。

export type PushStatus = 'unsupported' | 'denied' | 'granted' | 'subscribed';

export async function getPushStatus(): Promise<PushStatus> {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return 'unsupported';
  if (Notification.permission === 'denied') return 'denied';
  if (Notification.permission !== 'granted') return 'unsupported';
  // 检查是否已有订阅
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub ? 'subscribed' : 'granted';
  } catch {
    return 'unsupported';
  }
}

export async function registerPush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === 'undefined') return { ok: false, error: 'unsupported' };
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, error: 'unsupported' };
  }

  // 1. 请求通知权限
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, error: 'denied' };
  }

  // 2. 获取 VAPID public key
  const res = await fetch('/api/push/subscribe');
  const { vapidPublicKey } = await res.json();
  if (!vapidPublicKey) {
    return { ok: false, error: 'not_configured' };
  }

  // 3. 订阅
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
  });

  // 4. POST 订阅到服务端
  const subJSON = sub.toJSON();
  await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscription: {
        endpoint: subJSON.endpoint,
        keys: subJSON.keys ?? {},
      },
    }),
  });

  return { ok: true };
}

export async function unregisterPush(): Promise<{ ok: boolean }> {
  if (typeof window === 'undefined') return { ok: false };
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
  } catch {
    // ignore
  }
  return { ok: true };
}

// VAPID key 转换：base64url → Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}
