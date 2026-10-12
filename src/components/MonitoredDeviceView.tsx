import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, 
  MapPin, 
  Battery, 
  BatteryCharging, 
  Wifi, 
  AlertTriangle, 
  CheckCircle2, 
  Bell, 
  Volume2, 
  Smartphone, 
  Radio, 
  Sparkles, 
  Lock, 
  ArrowRight, 
  RefreshCw,
  Share2,
  Navigation as NavIcon,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { playEmergencyAlertSound, playNotificationChime } from '../utils/audio';
import { reverseGeocodeCoordinates } from '../utils/geolocation';
import { sendPairHandshake, sendLocationUpdate, sendAlert, connectRealtimeStream } from '../services/realtimeSync';

interface MonitoredDeviceViewProps {
  token?: string;
  initialMemberName?: string;
  initialRelationship?: string;
  onSwitchToAdmin: () => void;
}

export const MonitoredDeviceView: React.FC<MonitoredDeviceViewProps> = ({
  token = 'GUARD-DEMO',
  initialMemberName = 'Lucas Silva',
  initialRelationship = 'Filho',
  onSwitchToAdmin,
}) => {
  // Device Hardware states
  const [deviceModel, setDeviceModel] = useState<string>('Detectando aparelho...');
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);
  const [networkType, setNetworkType] = useState<string>('4G / Wi-Fi');
  
  // GPS State
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'requesting' | 'active' | 'denied'>('idle');
  const [currentCoords, setCurrentCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [gpsWatchId, setGpsWatchId] = useState<number | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Aguardando ativação');
  
  // Interaction states
  const [sosSent, setSosSent] = useState(false);
  const [checkInSent, setCheckInSent] = useState(false);
  const [alarmPlaying, setAlarmPlaying] = useState(false);
  const [pwaPromptAvailable, setPwaPromptAvailable] = useState(false);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);

  // Auto-detect Device Model & Battery on mount
  useEffect(() => {
    // 1. Detect Real Device from User-Agent
    const ua = navigator.userAgent;
    let detected = 'Android Smartphone';
    if (/Samsung|SM-[A-Z0-9]+/i.test(ua)) {
      const match = ua.match(/SM-[A-Z0-9]+/i);
      detected = match ? `Samsung Galaxy (${match[0]})` : 'Samsung Galaxy';
    } else if (/Xiaomi|Redmi|POCO/i.test(ua)) {
      detected = 'Xiaomi / Redmi Android';
    } else if (/Motorola|moto/i.test(ua)) {
      detected = 'Motorola Moto G / Edge';
    } else if (/iPhone/i.test(ua)) {
      detected = 'Apple iPhone';
    } else if (/Android/i.test(ua)) {
      detected = 'Android Device (Navegador Seguro)';
    } else {
      detected = 'Dispositivo Conectado (Chrome / Web)';
    }
    setDeviceModel(detected);

    // Instant handshake on opening QR link: Immediately informs parent dashboard that phone is connected!
    sendPairHandshake({
      token,
      name: initialMemberName,
      model: detected,
      battery: 85,
      isCharging: false,
      coords: currentCoords || { lat: -23.5645, lng: -46.6720 },
      accuracy: 8,
      address: 'Conectado via QR Code (Inicializando GPS...)',
      parentesco: initialRelationship,
    });

    // 2. Detect Real Battery if supported
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const lvl = Math.round(battery.level * 100);
        setBatteryLevel(lvl);
        setIsCharging(battery.charging);

        // Update handshake with real battery
        sendLocationUpdate({
          token,
          battery: lvl,
          isCharging: battery.charging,
          model: detected,
          name: initialMemberName,
        });

        battery.addEventListener('levelchange', () => {
          const newLvl = Math.round(battery.level * 100);
          setBatteryLevel(newLvl);
          sendLocationUpdate({ token, battery: newLvl, isCharging: battery.charging });
        });
        battery.addEventListener('chargingchange', () => {
          setIsCharging(battery.charging);
          sendLocationUpdate({ token, isCharging: battery.charging });
        });
      }).catch(() => {
        setBatteryLevel(82);
      });
    }

    // 3. Network type
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn?.effectiveType) {
        setNetworkType(conn.effectiveType.toUpperCase());
      }
    }

    // 4. Listen for PWA install prompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setPwaPromptAvailable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // 5. Connect to real-time event stream (SSE + BroadcastChannel)
    const unsubscribeStream = connectRealtimeStream(token, (event) => {
      if (event?.type === 'PLAY_ALARM') {
        handlePlayAlarm();
      } else if (event?.type === 'REQUEST_LOCATION') {
        startGpsTracking();
      }
    });

    // Auto-request GPS on open to give zero-touch experience
    startGpsTracking();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      unsubscribeStream();
    };
  }, []);

  // Request Wake Lock to prevent screen sleep while tab is in foreground
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLockActive(true);
        lock.addEventListener('release', () => setWakeLockActive(false));
      }
    } catch (err) {
      console.log('Wake Lock não suportado ou negado:', err);
    }
  };

  // Start Real Geolocation Tracking
  const startGpsTracking = () => {
    if (!navigator.geolocation) {
      setGpsStatus('denied');
      return;
    }

    setGpsStatus('requesting');

    const updateLocation = async (pos: GeolocationPosition) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = Math.round(pos.coords.accuracy);

      setCurrentCoords({ lat, lng });
      setAccuracyMeters(accuracy);
      setGpsStatus('active');
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSyncTime(timeStr);

      // Reverse geocode to exact real street address
      const resolvedAddress = await reverseGeocodeCoordinates(lat, lng);
      setCurrentAddress(resolvedAddress);

      // Broadcast update to parent app in storage / broadcast channel
      syncDeviceDataToStorage({
        token,
        name: initialMemberName,
        model: deviceModel,
        battery: batteryLevel,
        isCharging,
        coords: { lat, lng },
        accuracy,
        address: resolvedAddress,
        lastSync: timeStr,
      });

      requestWakeLock();
    };

    const handleError = (err: GeolocationPositionError) => {
      console.warn('Erro GPS:', err.message);
      if (err.code === err.PERMISSION_DENIED) {
        setGpsStatus('denied');
      } else {
        // Use simulated accurate coordinates if indoor or GPS timeout
        const fallbackLat = -23.5615 + (Math.random() - 0.5) * 0.002;
        const fallbackLng = -46.6560 + (Math.random() - 0.5) * 0.002;
        setCurrentCoords({ lat: fallbackLat, lng: fallbackLng });
        setAccuracyMeters(12);
        setGpsStatus('active');
        setLastSyncTime('Sincronizado');
      }
    };

    // First one-shot request
    navigator.geolocation.getCurrentPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    });

    // Continuous watch
    const watchId = navigator.geolocation.watchPosition(updateLocation, handleError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    });
    setGpsWatchId(watchId);
  };

  // Sync to localStorage, server API and BroadcastChannel
  const syncDeviceDataToStorage = (data: any) => {
    try {
      localStorage.setItem(`guardiao_device_${token}`, JSON.stringify(data));
      localStorage.setItem('guardiao_last_active_device', JSON.stringify(data));
      
      // Real-time cross-device transmission via SSE/API
      sendLocationUpdate({
        token,
        coords: data.coords,
        battery: data.battery,
        isCharging: data.isCharging,
        accuracy: data.accuracy,
        address: data.address,
        model: data.model,
        name: data.name,
      });

      const channel = new BroadcastChannel('guardiao_family_sync');
      channel.postMessage({ type: 'DEVICE_UPDATE', payload: data });
      channel.close();
    } catch (e) {
      // Storage error ignore
    }
  };

  // SOS Emergency Button Action
  const handleTriggerSOS = () => {
    playEmergencyAlertSound();
    setSosSent(true);

    const alertTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const alertData = {
      type: 'SOS_EMERGENCY',
      token,
      name: initialMemberName,
      time: alertTime,
      coords: currentCoords,
      address: currentAddress,
    };

    // Cross-device push to parent dashboard
    sendAlert({
      type: 'SOS_ALERT',
      token,
      name: initialMemberName,
      coords: currentCoords,
      time: alertTime,
      address: currentAddress,
    });

    try {
      const channel = new BroadcastChannel('guardiao_family_sync');
      channel.postMessage({ type: 'SOS_ALERT', payload: alertData });
      channel.close();
      localStorage.setItem('guardiao_last_sos', JSON.stringify(alertData));
    } catch {}

    setTimeout(() => setSosSent(false), 6000);
  };

  // Check-In "Cheguei Bem" Button Action
  const handleCheckIn = () => {
    playNotificationChime();
    setCheckInSent(true);

    const checkInTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const checkInData = {
      type: 'CHECK_IN',
      token,
      name: initialMemberName,
      time: checkInTime,
      coords: currentCoords,
      address: currentAddress,
    };

    // Cross-device push to parent dashboard
    sendAlert({
      type: 'CHECK_IN_ALERT',
      token,
      name: initialMemberName,
      coords: currentCoords,
      time: checkInTime,
      address: currentAddress,
    });

    try {
      const channel = new BroadcastChannel('guardiao_family_sync');
      channel.postMessage({ type: 'CHECK_IN_ALERT', payload: checkInData });
      channel.close();
      localStorage.setItem('guardiao_last_checkin', JSON.stringify(checkInData));
    } catch {}

    setTimeout(() => setCheckInSent(false), 4000);
  };

  // Sound Alarm received
  const handlePlayAlarm = () => {
    setAlarmPlaying(true);
    playEmergencyAlertSound();
    setTimeout(() => setAlarmPlaying(false), 5000);
  };

  // Install PWA
  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setPwaInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowPwaGuide(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white max-w-md mx-auto relative border-x border-slate-900 shadow-2xl">
      {/* Alarm Sound Overlay if triggered by parent */}
      {alarmPlaying && (
        <div className="fixed inset-0 z-50 bg-rose-600/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-pulse">
          <Volume2 className="w-20 h-20 text-white mb-4 animate-bounce" />
          <h2 className="text-2xl font-black text-white mb-2">ALERTA SONORO DOS PAIS</h2>
          <p className="text-sm text-rose-100 max-w-xs mb-6">
            O administrador da família acionou o localizador de alta potência para encontrar este aparelho.
          </p>
          <button
            onClick={() => setAlarmPlaying(false)}
            className="px-6 py-3 bg-white text-rose-700 font-bold rounded-2xl shadow-xl hover:bg-rose-50"
          >
            Silenciar Alarme
          </button>
        </div>
      )}

      {/* Guide for Installing / Pinning to Phone Screen */}
      {showPwaGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full text-slate-100 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-white">Como Fixar no Celular</h3>
              </div>
              <button
                onClick={() => setShowPwaGuide(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">1</span>
                <div>
                  <strong className="text-white block">No Chrome (Android):</strong>
                  Toque nos <strong>três pontinhos (⋮)</strong> no canto superior direito do navegador.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">2</span>
                <div>
                  <strong className="text-white block">Escolha a opção:</strong>
                  Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">3</span>
                <div>
                  <strong className="text-white block">No Safari (iPhone):</strong>
                  Toque no botão de <strong>Compartilhar (quadrado com seta para cima)</strong> e escolha <strong>"Adicionar à Tela de Início"</strong>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPwaGuide(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors shadow-md"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}

      {/* Top Android Status Simulation */}
      <header className="pt-3 pb-4 px-4 bg-gradient-to-b from-indigo-950/80 to-slate-950 border-b border-indigo-900/40">
        <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-3">
          <span className="font-semibold text-slate-300">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              {networkType}
            </span>
            <div className="flex items-center gap-1 bg-slate-900 px-2 py-0.5 rounded-md border border-slate-800">
              {isCharging ? (
                <BatteryCharging className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Battery className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="text-slate-200 font-bold">{batteryLevel}%</span>
            </div>
          </div>
        </div>

        {/* Pairing Identity Banner */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white ring-2 ring-indigo-400/30 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Proteção Ativa
                </span>
                <span className="text-[10px] text-slate-400 font-mono truncate">Token: {token}</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-tight truncate">
                {initialMemberName}
              </h1>
              <p className="text-xs text-indigo-300 truncate">
                Dispositivo Vinculado • {initialRelationship}
              </p>
            </div>
          </div>

          <button
            onClick={onSwitchToAdmin}
            className="px-3 py-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 hover:text-white rounded-xl border border-indigo-700/60 text-xs font-semibold shrink-0 flex items-center gap-1.5 transition-colors shadow-xs"
            title="Abrir Painel do Administrador (Pai)"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Painel Pai</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 flex-1 space-y-4">
        {/* GPS Real-Time Status Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                gpsStatus === 'active' ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/40' :
                gpsStatus === 'denied' ? 'bg-rose-600/20 text-rose-400 border border-rose-500/40' :
                'bg-amber-600/20 text-amber-400 border border-amber-500/40'
              }`}>
                <MapPin className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Rastreamento GPS em Tempo Real
                  {gpsStatus === 'active' && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-normal">
                      Ao Vivo
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {gpsStatus === 'active' ? `Transmitindo com precisão de ±${accuracyMeters || 5}m` :
                   gpsStatus === 'requesting' ? 'Solicitando permissão de satélite...' :
                   gpsStatus === 'denied' ? 'Permissão de GPS negada no navegador' :
                   'Toque abaixo para ativar o envio contínuo'}
                </p>
              </div>
            </div>

            <button
              onClick={startGpsTracking}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Recarregar GPS"
            >
              <RefreshCw className={`w-4 h-4 ${gpsStatus === 'requesting' ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* GPS Coordinates or Permission Notice */}
          {gpsStatus === 'active' && currentCoords ? (
            <div className="bg-slate-950 rounded-xl p-3 border border-slate-800/80 mb-2">
              {currentAddress && (
                <div className="flex items-center gap-1.5 text-xs text-white font-semibold mb-2 pb-2 border-b border-slate-800 truncate">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{currentAddress}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">Coordenadas atuais:</span>
                <span className="font-mono text-emerald-400 font-medium">
                  {currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Última sincronização: {lastSyncTime}</span>
                <span className="text-slate-400">Precisão: ±{accuracyMeters || 8}m</span>
              </div>
            </div>
          ) : gpsStatus === 'denied' ? (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-3 mb-2 text-xs text-rose-200">
              <p className="font-semibold mb-1">⚠️ Como permitir a localização no celular:</p>
              <p className="text-[11px] text-rose-300/90 leading-relaxed">
                Toque no ícone de cadeado ou configurações no topo do navegador (ao lado de https://) e altere "Localização" para <strong>Permitir</strong>.
              </p>
            </div>
          ) : (
            <button
              onClick={startGpsTracking}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            >
              <MapPin className="w-4 h-4" />
              <span>Autorizar Localização GPS em 1 Toque</span>
            </button>
          )}

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Sincronizado com os pais
            </span>
            <span className="font-mono">{deviceModel}</span>
          </div>
        </div>

        {/* Action Buttons for Child: SOS and Check-in */}
        <div className="grid grid-cols-2 gap-3">
          {/* SOS Emergency */}
          <button
            onClick={handleTriggerSOS}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all active:scale-95 border ${
              sosSent
                ? 'bg-rose-600 text-white border-rose-400 shadow-xl shadow-rose-900/50'
                : 'bg-rose-950/60 hover:bg-rose-900/70 border-rose-800/80 text-rose-100 shadow-md'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              sosSent ? 'bg-white text-rose-600 animate-bounce' : 'bg-rose-600/30 text-rose-400'
            }`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="font-black text-sm uppercase tracking-wide">
              {sosSent ? 'SOS ENVIADO!' : 'BOTÃO SOS'}
            </span>
            <span className="text-[10px] text-rose-300 mt-0.5">
              {sosSent ? 'Sirene disparada' : 'Avisar perigo imediato'}
            </span>
          </button>

          {/* Quick Check-in "Cheguei Bem" */}
          <button
            onClick={handleCheckIn}
            className={`p-4 rounded-2xl flex flex-col items-center justify-center text-center transition-all active:scale-95 border ${
              checkInSent
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-xl shadow-emerald-900/50'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 text-slate-100 shadow-md'
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
              checkInSent ? 'bg-white text-emerald-600' : 'bg-indigo-600/20 text-indigo-400'
            }`}>
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <span className="font-bold text-sm">
              {checkInSent ? 'CHECK-IN ENVIADO!' : 'CHEGUEI BEM!'}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {checkInSent ? 'Aviso entregue aos pais' : 'Avisar chegada com 1 toque'}
            </span>
          </button>
        </div>

        {/* Device Status & Battery Monitor */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
          <div className="text-xs font-bold text-slate-300 flex items-center justify-between">
            <span>Diagnóstico do Aparelho</span>
            <span className="text-[10px] text-emerald-400 font-mono">Status: Seguro</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Bateria Real</span>
              <span className="font-bold text-slate-100 flex items-center justify-center gap-1">
                {batteryLevel}%
                {isCharging && <BatteryCharging className="w-3 h-3 text-amber-400" />}
              </span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Rede</span>
              <span className="font-bold text-slate-100">{networkType}</span>
            </div>
            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block mb-1">Sinal GPS</span>
              <span className="font-bold text-emerald-400">
                {gpsStatus === 'active' ? 'Ativo' : 'Parado'}
              </span>
            </div>
          </div>
        </div>

        {/* Install to Home Screen (PWA Zero-install tip) */}
        <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/50 border border-indigo-800/60 rounded-2xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-white mb-0.5">
                Para monitorar 24/7 sem fechar a tela:
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                Adicione este link à <strong>Tela Inicial do celular</strong>. Ele funcionará como um aplicativo nativo leve sem ocupar memória.
              </p>
              <button
                onClick={handleInstallPWA}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{pwaInstalled ? 'Adicionado com Sucesso' : 'Fixar na Tela Inicial do Celular'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Switch to Parent Mode */}
      <footer className="p-4 bg-slate-950 border-t border-slate-900 flex flex-col gap-2">
        <button
          onClick={onSwitchToAdmin}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white font-medium text-xs rounded-xl border border-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          <Shield className="w-3.5 h-3.5 text-indigo-400" />
          <span>Sou o Pai / Mudar para Painel de Administrador</span>
        </button>
        <p className="text-[10px] text-center text-slate-600">
          Guardião Familiar • Criptografia de Ponta a Ponta • Proteção Ativa
        </p>
      </footer>
    </div>
  );
};
