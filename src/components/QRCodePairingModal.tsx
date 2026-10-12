import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { FamilyMember } from '../types';
import { 
  QrCode, 
  Smartphone, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Cpu, 
  Battery, 
  MapPin, 
  PhoneCall,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Zap,
  Users
} from 'lucide-react';
import { playNotificationChime } from '../utils/audio';
import { connectRealtimeStream, sendPairHandshake } from '../services/realtimeSync';

interface QRCodePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemberPaired: (newMember: FamilyMember) => void;
}

export const QRCodePairingModal: React.FC<QRCodePairingModalProps> = ({
  isOpen,
  onClose,
  onMemberPaired,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pairingToken] = useState(() => `GUARD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Customization fields for the new member
  const [childName, setChildName] = useState('Lucas Silva');
  const [relationship, setRelationship] = useState('Filho');
  const [phoneNumber, setPhoneNumber] = useState('(11) 98765-4321');
  const [selectedDevicePreset, setSelectedDevicePreset] = useState('Samsung Galaxy A54 5G');
  const [activeTab, setActiveTab] = useState<'qrcode' | 'explanation'>('qrcode');
  const [usePublicUrl, setUsePublicUrl] = useState(true);

  // Simulation steps state
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [scanStep, setScanStep] = useState<number>(0);
  const [scannedResult, setScannedResult] = useState<{
    model: string;
    battery: number;
    os: string;
    phone: string;
    coords: { lat: number; lng: number };
  } | null>(null);

  // Direct link for the child's smartphone to open
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://guardiao-familiar.app';
  const pairingUrl = `${currentOrigin}/?conectar=1&token=${pairingToken}&nome=${encodeURIComponent(childName)}&parentesco=${encodeURIComponent(relationship)}&tel=${encodeURIComponent(phoneNumber)}`;

  // Listen for live pairing from real mobile device via SSE and cross-device API
  useEffect(() => {
    if (!isOpen) return;

    const unsubscribe = connectRealtimeStream(pairingToken, (event) => {
      const isPairEvent = event.type === 'DEVICE_PAIRED' || event.type === 'DEVICE_UPDATE';
      if (isPairEvent && event.payload) {
        const payload = event.payload;
        if (payload.token === pairingToken || !scannedResult) {
          const detectedModel = payload.model || selectedDevicePreset || 'Android Smartphone';
          const detectedBattery = payload.battery || 85;
          const detectedOS = 'Android Web GPS Client';
          const detectedCoords = payload.coords || { lat: -23.5645, lng: -46.6720 };
          const formattedPhone = phoneNumber.trim() || '(11) 98123-4567';

          setScannedResult({
            model: detectedModel,
            battery: detectedBattery,
            os: detectedOS,
            phone: formattedPhone,
            coords: detectedCoords,
          });

          const initials = (payload.name || childName)
            .trim()
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0].toUpperCase())
            .join('') || 'DF';

          const newPairedMember: FamilyMember = {
            id: `member-qr-${Date.now()}`,
            name: payload.name || childName.trim() || 'Filho Conectado',
            role: 'child',
            relationship,
            age: 12,
            avatarColor: 'bg-emerald-600',
            avatarInitials: initials,
            phone: formattedPhone,
            device: {
              model: detectedModel,
              batteryLevel: detectedBattery,
              isCharging: payload.isCharging || false,
              networkType: '5G',
              soundMode: 'Normal',
              gpsAccuracyMeters: payload.accuracy || 4,
              lastSync: 'Conectado em tempo real via QR Code',
              isDeviceLocked: false,
              screenTimeLockActive: false,
              powerSavingMode: false,
            },
            currentLocation: {
              lat: detectedCoords.lat,
              lng: detectedCoords.lng,
              address: payload.address || 'Localização GPS em Tempo Real (Aparelho Físico)',
              speedKmH: 0,
              currentZoneName: 'Transmitindo ao Vivo',
              statusText: 'Vinculado via QR Code (Zero Instalação)',
              lastUpdated: 'Agora mesmo',
            },
            safeZones: [
              {
                id: `zone-home-${Date.now()}`,
                name: 'Casa',
                address: 'Residência da Família',
                lat: detectedCoords.lat,
                lng: detectedCoords.lng,
                radiusMeters: 200,
                color: '#10b981',
                iconType: 'home',
                notifyOnEntry: true,
                notifyOnExit: true,
              },
            ],
            screenTime: {
              dailyLimitMinutes: 180,
              usedMinutesToday: 20,
              downtimeActive: false,
              downtimeStart: '21:30',
              downtimeEnd: '06:30',
              schoolModeActive: true,
              schoolStart: '07:30',
              schoolEnd: '12:30',
            },
            apps: [
              {
                id: `app-yt-${Date.now()}`,
                name: 'YouTube',
                category: 'Streaming',
                icon: 'Youtube',
                isBlocked: false,
                dailyLimitMinutes: 45,
                usedMinutesToday: 15,
              },
              {
                id: `app-roblox-${Date.now()}`,
                name: 'Roblox',
                category: 'Jogos',
                icon: 'Gamepad2',
                isBlocked: false,
                dailyLimitMinutes: 30,
                usedMinutesToday: 10,
              },
              {
                id: `app-wa-${Date.now()}`,
                name: 'WhatsApp',
                category: 'Mensagens',
                icon: 'MessageSquare',
                isBlocked: false,
                dailyLimitMinutes: 120,
                usedMinutesToday: 5,
                alwaysAllowed: true,
              },
            ],
            history: [
              {
                id: `hist-qr-${Date.now()}`,
                time: 'Agora mesmo',
                timestamp: Date.now(),
                title: 'Ativação Instantânea por QR Code',
                address: payload.address || 'Transmissão GPS Conectada',
                lat: detectedCoords.lat,
                lng: detectedCoords.lng,
                durationMinutes: 1,
                type: 'stay',
              },
            ],
            audioLogs: [],
          };

          playNotificationChime();
          onMemberPaired(newPairedMember);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, pairingToken, childName, relationship, phoneNumber, onMemberPaired, scannedResult, selectedDevicePreset]);

  // Generate QR Code on canvas
  useEffect(() => {
    if (isOpen && canvasRef.current && activeTab === 'qrcode') {
      QRCode.toCanvas(
        canvasRef.current,
        pairingUrl,
        {
          width: 200,
          margin: 1.5,
          color: {
            dark: '#1e1b4b', // deep indigo
            light: '#ffffff',
          },
        },
        (error) => {
          if (error) console.error('Erro ao renderizar QR Code:', error);
        }
      );
    }
  }, [isOpen, pairingUrl, activeTab]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pairingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Simulate remote device scanning the QR Code
  const handleSimulateDeviceScan = () => {
    setIsSimulatingScan(true);
    setScanStep(1);

    setTimeout(() => {
      setScanStep(2); // Detecting hardware and browser
    }, 800);

    setTimeout(() => {
      setScanStep(3); // Capturing GPS and Battery
    }, 1600);

    setTimeout(() => {
      // Detected specs from device
      const detectedModel = selectedDevicePreset || 'Samsung Galaxy A54 5G';
      const detectedBattery = Math.floor(75 + Math.random() * 20);
      const detectedOS = 'Android 14 (One UI 6.1)';
      const detectedCoords = { lat: -23.5645, lng: -46.6720 };
      const formattedPhone = phoneNumber.trim() || '(11) 98123-4567';

      setScannedResult({
        model: detectedModel,
        battery: detectedBattery,
        os: detectedOS,
        phone: formattedPhone,
        coords: detectedCoords,
      });

      // Synchronize with server backend and other devices
      sendPairHandshake({
        token: pairingToken,
        name: childName.trim() || 'Filho Conectado',
        model: detectedModel,
        battery: detectedBattery,
        coords: detectedCoords,
        accuracy: 4,
        address: 'Rua Bela Cintra, Cerqueira César, São Paulo - SP',
        parentesco: relationship,
        phone: formattedPhone,
      });

      const initials = childName
        .trim()
        .split(' ')
        .slice(0, 2)
        .map(n => n[0].toUpperCase())
        .join('') || 'FL';

      // Automatically register the paired member
      const newPairedMember: FamilyMember = {
        id: `member-qr-${Date.now()}`,
        name: childName.trim() || 'Filho Conectado',
        role: 'child',
        relationship,
        age: 11,
        avatarColor: 'bg-emerald-600',
        avatarInitials: initials,
        phone: formattedPhone,
        device: {
          model: detectedModel,
          batteryLevel: detectedBattery,
          isCharging: false,
          networkType: '5G',
          soundMode: 'Normal',
          gpsAccuracyMeters: 4,
          lastSync: 'Conectado agora via QR Code',
          isDeviceLocked: false,
          screenTimeLockActive: false,
          powerSavingMode: false,
        },
        currentLocation: {
          lat: detectedCoords.lat,
          lng: detectedCoords.lng,
          address: 'Rua Bela Cintra, Cerqueira César, São Paulo - SP',
          speedKmH: 0,
          currentZoneName: 'Próximo à Escola',
          statusText: 'Vinculado via QR Code (Zero Instalação)',
          lastUpdated: 'Agora mesmo',
        },
        safeZones: [
          {
            id: `zone-home-${Date.now()}`,
            name: 'Casa da Família',
            address: 'Rua dos Pinheiros, 450, Pinheiros, SP',
            lat: -23.5678,
            lng: -46.6854,
            radiusMeters: 180,
            color: '#10B981',
            iconType: 'home',
            notifyOnEntry: true,
            notifyOnExit: true,
          },
          {
            id: `zone-school-${Date.now()}`,
            name: 'Escola Municipal',
            address: 'Av. Rebouças, 1200, Pinheiros, SP',
            lat: -23.5645,
            lng: -46.6720,
            radiusMeters: 250,
            color: '#3B82F6',
            iconType: 'school',
            notifyOnEntry: true,
            notifyOnExit: true,
          },
        ],
        screenTime: {
          usedMinutesToday: 30,
          dailyLimitMinutes: 180,
          downtimeActive: false,
          downtimeStart: '21:30',
          downtimeEnd: '06:30',
          schoolModeActive: true,
          schoolStart: '07:30',
          schoolEnd: '12:30',
        },
        apps: [
          {
            id: `app-yt-${Date.now()}`,
            name: 'YouTube',
            category: 'Streaming',
            icon: 'Youtube',
            isBlocked: false,
            dailyLimitMinutes: 45,
            usedMinutesToday: 15,
          },
          {
            id: `app-roblox-${Date.now()}`,
            name: 'Roblox',
            category: 'Jogos',
            icon: 'Gamepad2',
            isBlocked: false,
            dailyLimitMinutes: 30,
            usedMinutesToday: 10,
          },
          {
            id: `app-wa-${Date.now()}`,
            name: 'WhatsApp',
            category: 'Mensagens',
            icon: 'MessageSquare',
            isBlocked: false,
            dailyLimitMinutes: 120,
            usedMinutesToday: 5,
            alwaysAllowed: true,
          },
        ],
        history: [
          {
            id: `hist-qr-${Date.now()}`,
            time: 'Agora mesmo',
            timestamp: Date.now(),
            title: 'Ativação Instantânea por QR Code',
            address: 'Rua Bela Cintra, São Paulo',
            lat: detectedCoords.lat,
            lng: detectedCoords.lng,
            durationMinutes: 5,
            type: 'stay',
          },
        ],
        audioLogs: [],
      };

      playNotificationChime();
      onMemberPaired(newPairedMember);
      setIsSimulatingScan(false);
      setScanStep(4); // Finished
    }, 2400);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-4 sm:p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[92vh] flex flex-col pb-safe">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pareamento Instantâneo por QR Code</h3>
              <p className="text-[11px] text-slate-500">Ative o celular apontando a câmera</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl mb-3 shrink-0 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'qrcode'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Gerar QR Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('explanation')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeTab === 'explanation'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            <span>Precisa Instalar App?</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {activeTab === 'qrcode' ? (
            <>
              {/* Member Pre-Configuration Inputs */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 space-y-2.5 text-xs">
                <span className="font-bold text-slate-800 text-[11px] block uppercase tracking-wider">
                  1. Quem vai usar este celular?
                </span>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">Nome do Filho(a)</label>
                    <input
                      type="text"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      placeholder="Ex: Lucas Silva"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">Parentesco</label>
                    <select
                      value={relationship}
                      onChange={(e) => setRelationship(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Filho">Filho</option>
                      <option value="Filha">Filha</option>
                      <option value="Sobrinho(a)">Sobrinho(a)</option>
                      <option value="Enteado(a)">Enteado(a)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">Nº Celular (Chip)</label>
                    <input
                      type="text"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="(11) 98765-4321"
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-medium focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-600 font-semibold block mb-1">Modelo do Celular</label>
                    <select
                      value={selectedDevicePreset}
                      onChange={(e) => setSelectedDevicePreset(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="Samsung Galaxy A54 5G">Galaxy A54 5G</option>
                      <option value="Samsung Galaxy A15">Galaxy A15</option>
                      <option value="Motorola Moto G84">Moto G84</option>
                      <option value="Xiaomi Redmi Note 13">Redmi Note 13</option>
                      <option value="iPhone 13">iPhone 13</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* QR Code Canvas Card or Instant Success State */}
              {scannedResult ? (
                <div className="bg-gradient-to-b from-emerald-50 to-white border-2 border-emerald-500 rounded-2xl p-4 text-center shadow-lg space-y-3 animate-in zoom-in-95">
                  <div className="flex items-center justify-between bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                      </span>
                      <span>CONEXÃO INSTANTÂNEA CONFIRMADA!</span>
                    </div>
                    <span className="text-[10px] bg-emerald-800/80 px-2 py-0.5 rounded-full font-mono">AO VIVO</span>
                  </div>

                  <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 text-emerald-600 mx-auto flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>

                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {childName || 'Dependente'} cadastrado(a) com sucesso!
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      O aparelho físico acabou de se conectar e está transmitindo localização e bateria ao vivo!
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">Aparelho Detectado:</span>
                      <strong className="text-slate-900 font-bold flex items-center gap-1 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="truncate">{scannedResult.model}</span>
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block font-semibold">Bateria Inicial:</span>
                      <strong className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <Battery className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        {scannedResult.battery}%
                      </strong>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-emerald-100">
                      <span className="text-[10px] text-slate-500 block font-semibold">Localização GPS:</span>
                      <span className="text-slate-800 font-medium text-[11px] flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">
                          {scannedResult.coords ? `${scannedResult.coords.lat.toFixed(4)}, ${scannedResult.coords.lng.toFixed(4)} • Sinal Ativo` : 'Localização ao Vivo'}
                        </span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Concluir e Ver no Mapa do Pai Agora</span>
                  </button>
                </div>
              ) : (
                <div className="bg-gradient-to-b from-indigo-50/50 to-slate-50 border border-indigo-100 rounded-2xl p-3 text-center flex flex-col items-center justify-center shadow-xs">
                  <div className="w-full mb-2.5 p-2 bg-indigo-50/90 border border-indigo-200 text-indigo-950 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
                      <span className="font-semibold text-[11px] text-left leading-tight">
                        Aguardando leitura do QR Code... <span className="text-indigo-600 font-bold block sm:inline">Conexão instantânea ativada</span>
                      </span>
                    </div>
                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold shrink-0">Radar Ativo</span>
                  </div>

                  <span className="text-[11px] font-bold text-indigo-900 mb-2">
                    2. Aponte a câmera do celular para este QR Code:
                  </span>

                  <div className="p-2.5 bg-white rounded-2xl border border-slate-200/90 shadow-md mb-2 relative">
                    <canvas ref={canvasRef} className="mx-auto rounded-xl" />
                  </div>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-indigo-900 font-mono font-bold bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200">
                    <span>Token: {pairingToken}</span>
                  </div>

                  {/* Direct Link Preview & Copy */}
                  <div className="mt-2.5 w-full text-left bg-white/90 p-2.5 rounded-xl border border-indigo-100 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                      <span>Link Direto para o Celular:</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600">
                      <span className="truncate flex-1 select-all">{pairingUrl}</span>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="px-2 py-0.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-[10px] shrink-0 flex items-center gap-1 shadow-2xs"
                      >
                        {copiedLink ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                        <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      💡 Se a câmera do celular não ler ou der erro de acesso, você pode enviar esse link pelo WhatsApp ou colar direto no navegador do celular.
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-600 mt-2 font-medium">
                    Ao ler o QR com a câmera nativa, o celular do filho abre o link seguro que detecta o aparelho instantaneamente.
                  </p>
                </div>
              )}

              {/* Actions: Copy Link & Simulate Scanning */}
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 px-3 border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link de Ativação'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSimulateDeviceScan}
                  disabled={isSimulatingScan || scannedResult !== null}
                  className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  {isSimulatingScan ? (
                    <>
                      <Radio className="w-3.5 h-3.5 animate-spin" />
                      <span>
                        {scanStep === 1 && 'Câmera lendo QR...'}
                        {scanStep === 2 && 'Detectando Hardware...'}
                        {scanStep === 3 && 'Capturando GPS & Bateria...'}
                      </span>
                    </>
                  ) : scannedResult ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Aparelho Ativado e Cadastrado!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Simular Leitura da Câmera</span>
                    </>
                  )}
                </button>
              </div>

              {/* Direct Open in Mobile Preview / Tab */}
              <a
                href={pairingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-3 border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Ver Como Fica na Tela do Celular (Testar no Navegador)</span>
              </a>
            </>
          ) : (
            /* Educational Explanation Tab: Does the child need to install anything? */
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-indigo-950 text-xs">
                      É possível monitorar SEM instalar nada no celular dele?
                    </h4>
                    <p className="text-[11px] text-indigo-900/90 mt-1 leading-relaxed">
                      <strong>Sim, parcialmente!</strong> Ao escanear o QR Code com a câmera do celular, o navegador nativo (Chrome/Samsung Internet) abre uma página segura que já captura dados essenciais imediatamente sem precisar ir até a Google Play Store.
                    </p>
                  </div>
                </div>
              </div>

              {/* What works with ZERO installation */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <span className="font-bold text-emerald-900 flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  O que funciona SEM instalar nenhum aplicativo:
                </span>

                <ul className="space-y-1.5 text-[11px] text-slate-700 pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Localização GPS em tempo real:</strong> Capturada via sensor GPS do celular (precisão de ~5 metros) com autorização em 1 toque na página.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Nível e status da bateria:</strong> Lido automaticamente pela <em>Battery Status API</em> do Android.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Modelo e Sistema:</strong> Detectado automaticamente pelo hardware (Samsung, Motorola, Xiaomi, Android 14).</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Alarme sonoro remoto:</strong> Dispara som no volume máximo para encontrar o aparelho perdido.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span><strong>Ouvir áudio ambiente:</strong> O microfone pode ser ativado na sessão para checar barulhos ao redor.</span>
                  </li>
                </ul>
              </div>

              {/* What requires the Native Android Companion */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
                <span className="font-bold text-amber-900 flex items-center gap-1.5 text-xs">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  O que o Android EXIGE app complementar para fazer:
                </span>

                <ul className="space-y-1.5 text-[11px] text-slate-700 pl-1">
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <span><strong>Bloquear outros apps (Roblox, TikTok, etc.):</strong> Por segurança contra vírus, o Android impede que navegadores web fechem outros aplicativos instalados. Isso requer permissão de <em>Acessibilidade</em> ou <em>Device Admin</em>.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <span><strong>Rastreamento 24h com tela desligada no bolso:</strong> O navegador hiberna abas em segundo plano após alguns minutos para economizar bateria. Um serviço nativo de fundo (<em>WorkManager</em>) mantém o GPS ativo 24 horas.</span>
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">⚠</span>
                    <span><strong>Número do chip SIM automático:</strong> As operadoras e o Android exigem a permissão nativa <em>READ_PHONE_NUMBERS</em> para ler o número sem digitação.</span>
                  </li>
                </ul>
              </div>

              <div className="p-2.5 bg-slate-100 rounded-xl text-[11px] text-slate-600">
                💡 <strong>Solução ideal:</strong> O pareamento via QR Code ativa o filho instantaneamente. Quando quiser controle rígido de bloquear apps específicos, basta instalar o app complementar nativo gerado no botão de Android no topo.
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 mt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-colors"
          >
            {scannedResult ? 'Ir para o Mapa e Ver Filho' : 'Fechar Janela'}
          </button>
        </div>
      </div>
    </div>
  );
};
