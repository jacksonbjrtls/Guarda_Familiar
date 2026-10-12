import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DeviceRecord {
  token: string;
  name: string;
  model: string;
  battery: number;
  isCharging: boolean;
  coords: { lat: number; lng: number };
  accuracy: number;
  address: string;
  lastSync: string;
  timestamp: number;
  online: boolean;
  parentesco?: string;
  phone?: string;
}

interface SSEClient {
  id: string;
  res: Response;
  tokenFilter?: string | null;
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory state for real-time synchronization
const devices = new Map<string, DeviceRecord>();
const sseClients: SSEClient[] = [];

// Broadcast helper for SSE
function broadcast(type: string, payload: any, targetToken?: string) {
  const eventPayload = JSON.stringify({ type, payload, timestamp: Date.now() });
  const message = `data: ${eventPayload}\n\n`;

  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      // General events (device paired, alerts) or matching token clients
      const isGeneralEvent = type === 'DEVICE_PAIRED' || type === 'SOS_ALERT' || type === 'CHECK_IN_ALERT';
      const tokenMatches = !targetToken || !client.tokenFilter || 
        client.tokenFilter.toLowerCase() === (targetToken || '').toLowerCase();

      if (isGeneralEvent || tokenMatches) {
        client.res.write(message);
      }
    } catch (err) {
      console.warn('Failed to write to SSE client, removing:', client.id);
      sseClients.splice(i, 1);
    }
  }
}

// Keepalive ping for SSE connections every 15s
setInterval(() => {
  for (let i = sseClients.length - 1; i >= 0; i--) {
    const client = sseClients[i];
    try {
      client.res.write(': ping\n\n');
    } catch {
      sseClients.splice(i, 1);
    }
  }
}, 15000);

// API Endpoints
// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    activeClients: sseClients.length,
    activeDevices: devices.size,
    appUrl: process.env.APP_URL || null,
    timestamp: Date.now(),
  });
});

// App configuration
app.get('/api/config', (_req: Request, res: Response) => {
  res.json({
    appUrl: process.env.APP_URL || null,
    nodeEnv: process.env.NODE_ENV || 'development',
  });
});

// SSE Stream for real-time push updates between parent and monitored device
app.get('/api/sync/stream', (req: Request, res: Response) => {
  const token = req.query.token as string | undefined;
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  // Initial handshake
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId, timestamp: Date.now() })}\n\n`);

  // If a specific token was requested and device exists, send immediate snapshot
  if (token && devices.has(token)) {
    const existing = devices.get(token);
    res.write(`data: ${JSON.stringify({ type: 'DEVICE_UPDATE', payload: existing, timestamp: Date.now() })}\n\n`);
  } else if (!token) {
    // Send all known active devices to parent
    const allDevices = Array.from(devices.values());
    if (allDevices.length > 0) {
      res.write(`data: ${JSON.stringify({ type: 'INITIAL_STATE', payload: allDevices, timestamp: Date.now() })}\n\n`);
    }
  }

  const client: SSEClient = { id: clientId, res, tokenFilter: token || null };
  sseClients.push(client);

  req.on('close', () => {
    const index = sseClients.findIndex(c => c.id === clientId);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// Instant Pairing handshake (called when child scans QR code or opens link)
app.post('/api/sync/pair', (req: Request, res: Response) => {
  const {
    token,
    name = 'Filho Conectado',
    model = 'Smartphone Android',
    battery = 85,
    isCharging = false,
    coords,
    accuracy = 5,
    address = 'Localização ao vivo via satélite GPS',
    parentesco = 'Filho',
    phone = '',
  } = req.body || {};

  if (!token) {
    res.status(400).json({ error: 'Token é obrigatório para pareamento' });
    return;
  }

  // Ensure coords is always a valid { lat, lng } object
  const validCoords = (coords && typeof coords.lat === 'number' && typeof coords.lng === 'number')
    ? coords
    : { lat: -23.5645, lng: -46.6720 };

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const deviceRecord: DeviceRecord = {
    token,
    name,
    model,
    battery: typeof battery === 'number' ? battery : 85,
    isCharging: Boolean(isCharging),
    coords: validCoords,
    accuracy: typeof accuracy === 'number' ? accuracy : 5,
    address: address || 'Localização ao vivo via satélite GPS',
    lastSync: timeStr,
    timestamp: Date.now(),
    online: true,
    parentesco: parentesco || 'Filho',
    phone: phone || '',
  };

  devices.set(token, deviceRecord);

  // Instantly broadcast DEVICE_PAIRED and DEVICE_UPDATE to all parents listening
  broadcast('DEVICE_PAIRED', deviceRecord, token);
  broadcast('DEVICE_UPDATE', deviceRecord, token);

  console.log(`[INSTANT PAIR] Dispositivo pareado com sucesso: ${name} (${model}) - Token: ${token}`);

  res.json({
    success: true,
    message: 'Dispositivo pareado instantaneamente com o painel dos pais',
    device: deviceRecord,
  });
});

// Continuous GPS and device telemetry update
app.post('/api/sync/device', (req: Request, res: Response) => {
  const { token, coords, battery, isCharging, model, name, accuracy, address } = req.body || {};

  if (!token) {
    res.status(400).json({ error: 'Token obrigatório' });
    return;
  }

  const existing = devices.get(token) || {
    token,
    name: name || 'Filho Conectado',
    model: model || 'Smartphone',
    battery: battery || 80,
    isCharging: isCharging ?? false,
    coords: coords || { lat: -23.5645, lng: -46.6720 },
    accuracy: accuracy || 10,
    address: address || 'Localização Atual',
    lastSync: 'Agora',
    timestamp: Date.now(),
    online: true,
  };

  const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const updatedRecord: DeviceRecord = {
    ...existing,
    ...(coords ? { coords } : {}),
    ...(battery !== undefined ? { battery } : {}),
    ...(isCharging !== undefined ? { isCharging } : {}),
    ...(model ? { model } : {}),
    ...(name ? { name } : {}),
    ...(accuracy !== undefined ? { accuracy } : {}),
    ...(address ? { address } : {}),
    lastSync: timeStr,
    timestamp: Date.now(),
    online: true,
  };

  devices.set(token, updatedRecord);
  broadcast('DEVICE_UPDATE', updatedRecord, token);

  res.json({ success: true, timestamp: Date.now() });
});

// Alerts (SOS button or Check-in "Cheguei Bem")
app.post('/api/sync/alert', (req: Request, res: Response) => {
  const { type, token, name, coords, time, address } = req.body || {};

  const alertPayload = {
    type: type || 'SOS_ALERT',
    token,
    name,
    coords,
    time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    address,
    timestamp: Date.now(),
  };

  broadcast(type || 'SOS_ALERT', alertPayload, token);

  res.json({ success: true, alertSent: true });
});

// Parent commands (e.g. Ring remote sound siren, lock screen, refresh GPS)
app.post('/api/sync/command', (req: Request, res: Response) => {
  const { type, token, payload } = req.body || {};

  broadcast(type || 'PARENT_COMMAND', { ...(payload || {}), token }, token);

  res.json({ success: true, commandBroadcast: true });
});

// Single device status endpoint (for quick polling fallback)
app.get('/api/sync/status/:token', (req: Request, res: Response) => {
  const { token } = req.params;
  const device = devices.get(token);

  if (!device) {
    res.json({ paired: false, online: false });
    return;
  }

  const isRecent = Date.now() - device.timestamp < 60000;
  res.json({
    paired: true,
    online: isRecent,
    device,
  });
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite dev server middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Guardião Familiar rodando na porta ${PORT} (${isProduction ? 'produção' : 'desenvolvimento'})`);
  });
}

startServer();
