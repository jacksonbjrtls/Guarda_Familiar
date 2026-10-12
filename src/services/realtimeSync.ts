// Real-time synchronization service for cross-device communication
// Connects parent dashboard and monitored devices via Server-Sent Events (SSE),
// HTTP POST telemetry endpoints, and local BroadcastChannel fallback.

export interface SyncEvent {
  type: 'CONNECTED' | 'INITIAL_STATE' | 'DEVICE_PAIRED' | 'DEVICE_UPDATE' | 'SOS_ALERT' | 'CHECK_IN_ALERT' | 'PARENT_COMMAND' | string;
  payload?: any;
  timestamp?: number;
}

export interface DevicePairData {
  token: string;
  name: string;
  model?: string;
  battery?: number;
  isCharging?: boolean;
  coords?: { lat: number; lng: number } | null;
  accuracy?: number;
  address?: string | null;
  parentesco?: string;
  phone?: string;
}

export interface DeviceUpdateData {
  token: string;
  coords?: { lat: number; lng: number } | null;
  battery?: number;
  isCharging?: boolean;
  accuracy?: number;
  address?: string | null;
  model?: string;
  name?: string;
}

export interface AlertData {
  type: 'SOS_ALERT' | 'CHECK_IN_ALERT' | string;
  token: string;
  name: string;
  coords?: { lat: number; lng: number } | null;
  time?: string;
  address?: string | null;
}

/**
 * Connect to real-time event stream.
 * Automatically handles SSE reconnection and listens to local BroadcastChannel.
 */
export function connectRealtimeStream(
  token: string | undefined,
  onEvent: (event: SyncEvent) => void
): () => void {
  let isClosed = false;
  let eventSource: EventSource | null = null;
  let broadcastChannel: BroadcastChannel | null = null;
  let pollInterval: any = null;
  let retryTimeout: any = null;

  // 1. Setup local BroadcastChannel
  try {
    broadcastChannel = new BroadcastChannel('guardiao_family_sync');
    broadcastChannel.onmessage = (e) => {
      if (e.data && !isClosed) {
        onEvent(e.data);
      }
    };
  } catch (err) {
    console.debug('BroadcastChannel unavailable:', err);
  }

  // 2. Setup Server-Sent Events (SSE) for cross-device real-time sync
  const connectSSE = () => {
    if (isClosed) return;

    try {
      const url = token ? `/api/sync/stream?token=${encodeURIComponent(token)}` : '/api/sync/stream';
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        // Connected to server stream
      };

      eventSource.onmessage = (e) => {
        if (isClosed) return;
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch {
          // ignore non-json ping
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }

        // Retry SSE after 2.5 seconds
        if (!isClosed) {
          retryTimeout = setTimeout(() => {
            connectSSE();
          }, 2500);
        }
      };
    } catch {
      // Fallback if EventSource fails
    }
  };

  connectSSE();

  // 3. Lightweight polling safety net for token-specific status (e.g. in pairing modal)
  if (token) {
    pollInterval = setInterval(async () => {
      if (isClosed) return;
      try {
        const res = await fetch(`/api/sync/status/${encodeURIComponent(token)}`);
        if (res.ok) {
          const data = await res.json();
          if (data?.paired && data?.device) {
            onEvent({
              type: 'DEVICE_UPDATE',
              payload: data.device,
              timestamp: Date.now(),
            });
          }
        }
      } catch {
        // network silent
      }
    }, 2000);
  }

  // Return unsubscribe cleanup function
  return () => {
    isClosed = true;
    if (retryTimeout) clearTimeout(retryTimeout);
    if (pollInterval) clearInterval(pollInterval);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
    if (broadcastChannel) {
      broadcastChannel.close();
      broadcastChannel = null;
    }
  };
}

/**
 * Send instant handshake when QR code is scanned or child app opens
 */
export async function sendPairHandshake(data: DevicePairData): Promise<boolean> {
  // Broadcast locally immediately
  try {
    const channel = new BroadcastChannel('guardiao_family_sync');
    channel.postMessage({ type: 'DEVICE_PAIRED', payload: data });
    channel.postMessage({ type: 'DEVICE_UPDATE', payload: data });
    channel.close();
  } catch {}

  // Send to server API
  try {
    const response = await fetch('/api/sync/pair', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    console.warn('Erro ao enviar handshake de pareamento para o servidor:', err);
    return false;
  }
}

/**
 * Send real-time GPS coordinates and battery telemetry
 */
export async function sendLocationUpdate(data: DeviceUpdateData): Promise<boolean> {
  // Broadcast locally
  try {
    const channel = new BroadcastChannel('guardiao_family_sync');
    channel.postMessage({ type: 'DEVICE_UPDATE', payload: data });
    channel.close();
  } catch {}

  // Send to server API
  try {
    const response = await fetch('/api/sync/device', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Send emergency SOS or check-in alert
 */
export async function sendAlert(data: AlertData): Promise<boolean> {
  // Broadcast locally
  try {
    const channel = new BroadcastChannel('guardiao_family_sync');
    channel.postMessage({ type: data.type, payload: data });
    channel.close();
  } catch {}

  // Send to server API
  try {
    const response = await fetch('/api/sync/alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Send command from parent to child device (e.g. ring siren, screen lock)
 */
export async function sendCommand(type: string, payload?: any): Promise<boolean> {
  // Broadcast locally
  try {
    const channel = new BroadcastChannel('guardiao_family_sync');
    channel.postMessage({ type, payload });
    channel.close();
  } catch {}

  // Send to server API
  try {
    const response = await fetch('/api/sync/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    return response.ok;
  } catch (err) {
    return false;
  }
}
