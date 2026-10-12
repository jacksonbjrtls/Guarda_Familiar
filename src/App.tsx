import React, { useState, useEffect, useCallback } from 'react';
import { INITIAL_MEMBERS, INITIAL_ALERTS } from './data/initialData';
import { FamilyMember, SecurityAlert, SafeZone, Coordinates, AudioSessionLog } from './types';
import { Navigation } from './components/Navigation';
import { FamilyMemberSelector } from './components/FamilyMemberSelector';
import { MapTracker } from './components/MapTracker';
import { BatteryStatusCard } from './components/BatteryStatusCard';
import { SafeZonesManager } from './components/SafeZonesManager';
import { LocationHistoryView } from './components/LocationHistoryView';
import { ScreenTimeManager } from './components/ScreenTimeManager';
import { AmbientAudioModal } from './components/AmbientAudioModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { MemberFormModal } from './components/MemberFormModal';
import { ManageFamilyModal } from './components/ManageFamilyModal';
import { QRCodePairingModal } from './components/QRCodePairingModal';
import { MonitoredDeviceView } from './components/MonitoredDeviceView';
import { ChildDeviceSimulatorModal } from './components/ChildDeviceSimulatorModal';
import { AndroidNativeModal } from './components/AndroidNativeModal';
import { playEmergencyAlertSound, playNotificationChime } from './utils/audio';
import { connectRealtimeStream, sendCommand } from './services/realtimeSync';
import { 
  Shield, 
  MapPin, 
  Battery, 
  Hourglass, 
  Mic, 
  Radio, 
  Smartphone, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Volume2
} from 'lucide-react';

export default function App() {
  // Members State
  const [members, setMembers] = useState<FamilyMember[]>(() => {
    const saved = localStorage.getItem('guardiao_family_members');
    return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
  });

  const [selectedMemberId, setSelectedMemberId] = useState<string>('child-1');

  // Real-time Connected Device Banner Feedback
  const [connectedDeviceBanner, setConnectedDeviceBanner] = useState<{
    id: string;
    name: string;
    model: string;
    battery: number;
    time: string;
  } | null>(null);

  // Alerts State
  const [alerts, setAlerts] = useState<SecurityAlert[]>(() => {
    const saved = localStorage.getItem('guardiao_security_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  // Navigation & UI States
  const [activeTab, setActiveTab] = useState<'map' | 'history' | 'zones' | 'screentime'>('map');
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [memberFormMode, setMemberFormMode] = useState<'add' | 'edit'>('add');
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isManageFamilyOpen, setIsManageFamilyOpen] = useState(false);
  const [isChildSimulatorOpen, setIsChildSimulatorOpen] = useState(false);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState(false);
  const [isQRPairingOpen, setIsQRPairingOpen] = useState(false);

  // Check if opened directly via QR Code scan or URL parameters
  const [isMonitoredMode, setIsMonitoredMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.has('conectar') || params.has('token') || window.location.pathname.includes('conectar');
  });

  const [monitoredParams] = useState(() => {
    if (typeof window === 'undefined') return { token: 'GUARD-DEMO', nome: 'Lucas Silva', parentesco: 'Filho' };
    const params = new URLSearchParams(window.location.search);
    return {
      token: params.get('token') || 'GUARD-LIVE',
      nome: params.get('nome') || 'Filho Conectado',
      parentesco: params.get('parentesco') || 'Filho',
    };
  });

  // Map & Route selection state
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(null);
  const [showFullDayRoute, setShowFullDayRoute] = useState(false);

  // Banner / Toast Feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync with localStorage
  useEffect(() => {
    localStorage.setItem('guardiao_family_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('guardiao_security_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // Current selected member
  const currentMember = members.find(m => m.id === selectedMemberId) || members[0];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Cross-device synchronization with child's phone via SSE & server API
  useEffect(() => {
    const unsubscribe = connectRealtimeStream(undefined, (event) => {
      const { type, payload } = event || {};
      
      if (type === 'DEVICE_PAIRED' && payload) {
        playNotificationChime();
        showToast(`🟢 Dispositivo conectado instantaneamente: ${payload?.name || 'Dependente'} (${payload?.model || 'Celular'})!`);
        
        const fallbackId = payload.token ? `member-qr-${payload.token}` : `member-qr-${Date.now()}`;
        let finalChosenId = fallbackId;

        // Update or add member with live state
        setMembers(prevMembers => {
          const matchIndex = prevMembers.findIndex(m => 
            (payload.token && (m.id === payload.token || m.id.includes(payload.token))) ||
            (payload.name && m.name.toLowerCase().trim() === payload.name.toLowerCase().trim()) ||
            (payload.model && m.device.model === payload.model)
          );

          if (matchIndex !== -1) {
            finalChosenId = prevMembers[matchIndex].id;
            return prevMembers.map((m, idx) => {
              if (idx !== matchIndex) return m;
              return {
                ...m,
                device: {
                  ...m.device,
                  batteryLevel: payload.battery !== undefined ? payload.battery : m.device.batteryLevel,
                  isCharging: payload.isCharging ?? m.device.isCharging,
                  model: payload.model || m.device.model,
                  lastSync: 'Conectado agora em tempo real',
                },
                currentLocation: {
                  ...m.currentLocation,
                  ...(payload.coords ? { lat: payload.coords.lat, lng: payload.coords.lng } : {}),
                  address: payload.address || m.currentLocation.address,
                  lastUpdated: 'Agora mesmo',
                  statusText: '🟢 Conexão instantânea ao vivo',
                },
              };
            });
          }

          // Member was not in the list: automatically register them!
          finalChosenId = fallbackId;
          const initials = (payload.name || 'Filho')
            .trim()
            .split(' ')
            .slice(0, 2)
            .map((n: string) => n[0].toUpperCase())
            .join('') || 'FC';

          const validCoords = payload.coords || { lat: -23.5645, lng: -46.6720 };

          const newMember: FamilyMember = {
            id: fallbackId,
            name: payload.name || 'Filho Conectado',
            role: 'child',
            relationship: payload.parentesco || 'Filho',
            age: 12,
            avatarColor: 'bg-emerald-600',
            avatarInitials: initials,
            phone: payload.phone || '',
            device: {
              model: payload.model || 'Smartphone Android',
              batteryLevel: payload.battery !== undefined ? payload.battery : 85,
              isCharging: payload.isCharging ?? false,
              networkType: '5G',
              soundMode: 'Normal',
              gpsAccuracyMeters: payload.accuracy || 4,
              lastSync: 'Conectado agora em tempo real via QR Code',
              isDeviceLocked: false,
              screenTimeLockActive: false,
              powerSavingMode: false,
            },
            currentLocation: {
              lat: validCoords.lat,
              lng: validCoords.lng,
              address: payload.address || 'Localização GPS em Tempo Real (Aparelho Físico)',
              speedKmH: 0,
              currentZoneName: 'Transmitindo ao Vivo',
              statusText: '🟢 Vinculado via QR Code (Zero Instalação)',
              lastUpdated: 'Agora mesmo',
            },
            safeZones: [
              {
                id: `zone-home-${Date.now()}`,
                name: 'Casa',
                address: 'Residência da Família',
                lat: validCoords.lat,
                lng: validCoords.lng,
                radiusMeters: 250,
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
              { id: '1', name: 'WhatsApp', category: 'Mensagens', icon: 'MessageCircle', usedMinutesToday: 10, isBlocked: false, dailyLimitMinutes: 120 },
              { id: '2', name: 'YouTube', category: 'Streaming', icon: 'Video', usedMinutesToday: 15, isBlocked: false, dailyLimitMinutes: 60 },
              { id: '3', name: 'Roblox', category: 'Jogos', icon: 'Gamepad2', usedMinutesToday: 0, isBlocked: false, dailyLimitMinutes: 45 },
            ],
            history: [
              {
                id: `hist-qr-${Date.now()}`,
                time: 'Agora mesmo',
                timestamp: Date.now(),
                title: 'Ativação Instantânea por QR Code',
                address: payload.address || 'Transmissão GPS Conectada',
                lat: validCoords.lat,
                lng: validCoords.lng,
                durationMinutes: 1,
                type: 'stay',
              },
            ],
            audioLogs: [],
          };

          return [...prevMembers, newMember];
        });

        // Instantly select this newly registered or updated member and switch to live map!
        setSelectedMemberId(finalChosenId);
        setActiveTab('map');

        // Show permanent real-time banner on parent screen
        setConnectedDeviceBanner({
          id: finalChosenId,
          name: payload.name || 'Filho Conectado',
          model: payload.model || 'Smartphone Android',
          battery: payload.battery !== undefined ? payload.battery : 85,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        });

        // Record security alert
        const newAlert: SecurityAlert = {
          id: `alert-pair-${Date.now()}`,
          memberId: finalChosenId,
          memberName: payload?.name || 'Dependente Conectado',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateKey: 'Hoje',
          type: 'GEOFENCE_ENTRY',
          title: `🟢 Celular Cadastrado e Conectado: ${payload?.name || 'Dependente'}`,
          description: `O aparelho (${payload?.model || 'Smartphone'}) foi pareado com sucesso via QR Code. GPS ativo com precisão de ±${payload?.accuracy || 4}m e bateria em ${payload?.battery || 85}%.`,
          severity: 'info',
          read: false,
          location: payload?.coords || { lat: -23.5645, lng: -46.6720 },
        };
        setAlerts(prev => [newAlert, ...prev]);

      } else if (type === 'INITIAL_STATE' && Array.isArray(payload) && payload.length > 0) {
        // Sync any active server devices on parent load
        payload.forEach((srvDevice: any) => {
          if (!srvDevice) return;
          setMembers(prevMembers => {
            const matchIndex = prevMembers.findIndex(m => 
              (srvDevice.token && (m.id === srvDevice.token || m.id.includes(srvDevice.token))) ||
              (srvDevice.name && m.name.toLowerCase().trim() === srvDevice.name.toLowerCase().trim())
            );

            if (matchIndex !== -1) {
              return prevMembers.map((m, idx) => {
                if (idx !== matchIndex) return m;
                return {
                  ...m,
                  device: {
                    ...m.device,
                    batteryLevel: srvDevice.battery !== undefined ? srvDevice.battery : m.device.batteryLevel,
                    isCharging: srvDevice.isCharging ?? m.device.isCharging,
                    model: srvDevice.model || m.device.model,
                    lastSync: 'Ao vivo',
                  },
                  currentLocation: {
                    ...m.currentLocation,
                    ...(srvDevice.coords ? { lat: srvDevice.coords.lat, lng: srvDevice.coords.lng } : {}),
                    address: srvDevice.address || m.currentLocation.address,
                    lastUpdated: 'Agora mesmo',
                    statusText: '🟢 Conectado ao vivo',
                  },
                };
              });
            }

            // Auto-register server device in family if missing
            const newId = `member-qr-${srvDevice.token || Date.now()}`;
            const initials = (srvDevice.name || 'Filho')
              .trim()
              .split(' ')
              .slice(0, 2)
              .map((n: string) => n[0].toUpperCase())
              .join('') || 'FC';
            const validCoords = srvDevice.coords || { lat: -23.5645, lng: -46.6720 };

            const newMember: FamilyMember = {
              id: newId,
              name: srvDevice.name || 'Filho Conectado',
              role: 'child',
              relationship: srvDevice.parentesco || 'Filho',
              age: 12,
              avatarColor: 'bg-emerald-600',
              avatarInitials: initials,
              phone: srvDevice.phone || '',
              device: {
                model: srvDevice.model || 'Smartphone Android',
                batteryLevel: srvDevice.battery || 85,
                isCharging: srvDevice.isCharging ?? false,
                networkType: '5G',
                soundMode: 'Normal',
                gpsAccuracyMeters: srvDevice.accuracy || 4,
                lastSync: 'Ao vivo',
                isDeviceLocked: false,
                screenTimeLockActive: false,
                powerSavingMode: false,
              },
              currentLocation: {
                lat: validCoords.lat,
                lng: validCoords.lng,
                address: srvDevice.address || 'Localização GPS em Tempo Real',
                speedKmH: 0,
                currentZoneName: 'Transmitindo ao Vivo',
                statusText: '🟢 Vinculado via QR Code (Zero Instalação)',
                lastUpdated: 'Agora mesmo',
              },
              safeZones: [
                {
                  id: `zone-home-${Date.now()}`,
                  name: 'Casa',
                  address: 'Residência da Família',
                  lat: validCoords.lat,
                  lng: validCoords.lng,
                  radiusMeters: 250,
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
                { id: '1', name: 'WhatsApp', category: 'Mensagens', icon: 'MessageCircle', usedMinutesToday: 10, isBlocked: false, dailyLimitMinutes: 120 },
                { id: '2', name: 'YouTube', category: 'Streaming', icon: 'Video', usedMinutesToday: 15, isBlocked: false, dailyLimitMinutes: 60 },
                { id: '3', name: 'Roblox', category: 'Jogos', icon: 'Gamepad2', usedMinutesToday: 0, isBlocked: false, dailyLimitMinutes: 45 },
              ],
              history: [
                {
                  id: `hist-qr-${Date.now()}`,
                  time: 'Agora mesmo',
                  timestamp: Date.now(),
                  title: 'Ativação Instantânea por QR Code',
                  address: srvDevice.address || 'Transmissão GPS Conectada',
                  lat: validCoords.lat,
                  lng: validCoords.lng,
                  durationMinutes: 1,
                  type: 'stay',
                },
              ],
              audioLogs: [],
            };

            return [...prevMembers, newMember];
          });
        });

      } else if (type === 'SOS_ALERT') {
        playEmergencyAlertSound();
        showToast(`🚨 ALERTA SOS recebido de ${payload?.name || 'Dependente'}!`);
        const newAlert: SecurityAlert = {
          id: `sos-${Date.now()}`,
          memberId: payload?.token || 'alert-sos',
          memberName: payload?.name || 'Dependente',
          timestamp: payload?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateKey: 'Hoje',
          type: 'SOS',
          title: `🚨 BOTÃO DE PÂNICO ACIONADO por ${payload?.name || 'Dependente'}!`,
          description: `O dependente pressionou o botão SOS de emergência na tela do celular. Coordenadas: ${payload?.coords?.lat?.toFixed(4)}, ${payload?.coords?.lng?.toFixed(4)}.`,
          severity: 'critical',
          read: false,
        };
        setAlerts(prev => [newAlert, ...prev]);
        setIsAlertsOpen(true);
      } else if (type === 'CHECK_IN_ALERT') {
        playNotificationChime();
        showToast(`📍 CHECK-IN: ${payload?.name || 'Dependente'} avisou que chegou bem!`);
        const newAlert: SecurityAlert = {
          id: `checkin-${Date.now()}`,
          memberId: payload?.token || 'alert-checkin',
          memberName: payload?.name || 'Dependente',
          timestamp: payload?.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateKey: 'Hoje',
          type: 'GEOFENCE_ENTRY',
          title: `📍 Check-in de Chegada: ${payload?.name || 'Dependente'}`,
          description: `Aviso confirmado: O dependente tocou em "Cheguei Bem" no celular.`,
          severity: 'info',
          read: false,
        };
        setAlerts(prev => [newAlert, ...prev]);
      } else if (type === 'DEVICE_UPDATE' && payload) {
        // Real-time GPS and battery live transmission
        setMembers(prevMembers => {
          const matchIndex = prevMembers.findIndex(m => 
            (payload.token && (m.id === payload.token || m.id.includes(payload.token))) ||
            (payload.name && m.name.toLowerCase().trim() === payload.name.toLowerCase().trim())
          );

          if (matchIndex !== -1) {
            return prevMembers.map((m, idx) => {
              if (idx !== matchIndex) return m;
              return {
                ...m,
                device: {
                  ...m.device,
                  batteryLevel: payload.battery !== undefined ? payload.battery : m.device.batteryLevel,
                  isCharging: payload.isCharging !== undefined ? payload.isCharging : m.device.isCharging,
                  model: payload.model || m.device.model,
                  lastSync: 'Transmitindo agora em tempo real',
                },
                currentLocation: {
                  ...m.currentLocation,
                  ...(payload.coords ? { lat: payload.coords.lat, lng: payload.coords.lng } : {}),
                  address: payload.address || m.currentLocation.address,
                  lastUpdated: payload.lastSync || 'Agora (Ao Vivo)',
                  statusText: 'GPS ao vivo transmitido do aparelho',
                },
              };
            });
          }

          // If no matching member, auto-register this active transmitting device
          if (payload.token) {
            const newId = `member-qr-${payload.token}`;
            const initials = (payload.name || 'Filho')
              .trim()
              .split(' ')
              .slice(0, 2)
              .map((n: string) => n[0].toUpperCase())
              .join('') || 'FC';
            const validCoords = payload.coords || { lat: -23.5645, lng: -46.6720 };

            const newMember: FamilyMember = {
              id: newId,
              name: payload.name || 'Filho Conectado',
              role: 'child',
              relationship: payload.parentesco || 'Filho',
              age: 12,
              avatarColor: 'bg-emerald-600',
              avatarInitials: initials,
              phone: payload.phone || '',
              device: {
                model: payload.model || 'Smartphone Android',
                batteryLevel: payload.battery !== undefined ? payload.battery : 85,
                isCharging: payload.isCharging ?? false,
                networkType: '5G',
                soundMode: 'Normal',
                gpsAccuracyMeters: payload.accuracy || 4,
                lastSync: 'Transmitindo agora em tempo real',
                isDeviceLocked: false,
                screenTimeLockActive: false,
                powerSavingMode: false,
              },
              currentLocation: {
                lat: validCoords.lat,
                lng: validCoords.lng,
                address: payload.address || 'Localização GPS em Tempo Real',
                speedKmH: 0,
                currentZoneName: 'Transmitindo ao Vivo',
                statusText: '🟢 Vinculado via QR Code (Zero Instalação)',
                lastUpdated: 'Agora mesmo',
              },
              safeZones: [
                {
                  id: `zone-home-${Date.now()}`,
                  name: 'Casa',
                  address: 'Residência da Família',
                  lat: validCoords.lat,
                  lng: validCoords.lng,
                  radiusMeters: 250,
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
                { id: '1', name: 'WhatsApp', category: 'Mensagens', icon: 'MessageCircle', usedMinutesToday: 10, isBlocked: false, dailyLimitMinutes: 120 },
                { id: '2', name: 'YouTube', category: 'Streaming', icon: 'Video', usedMinutesToday: 15, isBlocked: false, dailyLimitMinutes: 60 },
                { id: '3', name: 'Roblox', category: 'Jogos', icon: 'Gamepad2', usedMinutesToday: 0, isBlocked: false, dailyLimitMinutes: 45 },
              ],
              history: [
                {
                  id: `hist-qr-${Date.now()}`,
                  time: 'Agora mesmo',
                  timestamp: Date.now(),
                  title: 'Ativação Instantânea por QR Code',
                  address: payload.address || 'Transmissão GPS Conectada',
                  lat: validCoords.lat,
                  lng: validCoords.lng,
                  durationMinutes: 1,
                  type: 'stay',
                },
              ],
              audioLogs: [],
            };

            return [...prevMembers, newMember];
          }

          return prevMembers;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Trigger Sound Alarm on child's device
  const handleTriggerSoundAlert = () => {
    playEmergencyAlertSound();
    showToast(`Alarme de alta intensidade emitido no aparelho de ${currentMember.name.split(' ')[0]}!`);

    // Broadcast across devices via realtime server and local channel
    sendCommand('PLAY_ALARM', { memberId: currentMember.id });

    const newAlert: SecurityAlert = {
      id: `alert-ring-${Date.now()}`,
      memberId: currentMember.id,
      memberName: currentMember.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateKey: 'Hoje',
      type: 'SOS',
      title: 'Alarme Sonoro Remoto Acionado',
      description: `Um alarme em volume máximo foi disparado para localizar o aparelho de ${currentMember.name.split(' ')[0]}.`,
      severity: 'info',
      read: false,
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  // Real-time location simulation update
  const handleLocationUpdate = useCallback((coords: Coordinates, address: string, speedKmH: number) => {
    setMembers(prevMembers =>
      prevMembers.map(m => {
        if (m.id !== currentMember.id) return m;

        // Check if now inside or outside safe zones
        let currentZoneName: string | undefined = undefined;
        let isInsideAnyZone = false;

        m.safeZones.forEach(zone => {
          const R = 6371e3;
          const φ1 = (coords.lat * Math.PI) / 180;
          const φ2 = (zone.lat * Math.PI) / 180;
          const Δφ = ((zone.lat - coords.lat) * Math.PI) / 180;
          const Δλ = ((zone.lng - coords.lng) * Math.PI) / 180;
          const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
          const distance = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));

          if (distance <= zone.radiusMeters) {
            currentZoneName = zone.name;
            isInsideAnyZone = true;
          }
        });

        // Trigger Geofence alert if exited
        if (m.currentLocation.currentZoneName && !isInsideAnyZone) {
          const exitAlert: SecurityAlert = {
            id: `alert-exit-${Date.now()}`,
            memberId: m.id,
            memberName: m.name,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateKey: 'Hoje',
            type: 'GEOFENCE_EXIT',
            title: 'Saída de Zona Segura',
            description: `${m.name.split(' ')[0]} saiu de "${m.currentLocation.currentZoneName}". Velocidade: ${speedKmH} km/h.`,
            severity: 'warning',
            read: false,
            location: coords,
          };
          setAlerts(prev => [exitAlert, ...prev]);
          playNotificationChime();
          showToast(`Aviso: ${m.name.split(' ')[0]} saiu da zona de segurança!`);
        }

        return {
          ...m,
          device: {
            ...m.device,
            batteryLevel: Math.max(12, m.device.batteryLevel - (speedKmH > 0 ? 1 : 0)),
            lastSync: 'Agora mesmo',
          },
          currentLocation: {
            ...m.currentLocation,
            lat: coords.lat,
            lng: coords.lng,
            address,
            speedKmH,
            currentZoneName,
            statusText: currentZoneName ? `Em "${currentZoneName}"` : `Em trânsito (${speedKmH} km/h)`,
            lastUpdated: 'Agora mesmo',
          },
        };
      })
    );
  }, [currentMember.id, currentMember.name]);

  // Add Safe Zone
  const handleAddSafeZone = (zoneData: Omit<SafeZone, 'id'>) => {
    const newZone: SafeZone = {
      ...zoneData,
      id: `zone-${Date.now()}`,
    };

    setMembers(prev =>
      prev.map(m => (m.id === currentMember.id ? { ...m, safeZones: [...m.safeZones, newZone] } : m))
    );
    showToast(`Zona "${zoneData.name}" criada com sucesso.`);
  };

  // Remove Safe Zone
  const handleRemoveSafeZone = (zoneId: string) => {
    setMembers(prev =>
      prev.map(m =>
        m.id === currentMember.id
          ? { ...m, safeZones: m.safeZones.filter(z => z.id !== zoneId) }
          : m
      )
    );
    showToast('Zona segura removida.');
  };

  // Toggle Safe Zone Entry/Exit notifications
  const handleToggleZoneAlert = (zoneId: string, alertType: 'entry' | 'exit') => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          safeZones: m.safeZones.map(z => {
            if (z.id !== zoneId) return z;
            return {
              ...z,
              notifyOnExit: alertType === 'exit' ? !z.notifyOnExit : z.notifyOnExit,
              notifyOnEntry: alertType === 'entry' ? !z.notifyOnEntry : z.notifyOnEntry,
            };
          }),
        };
      })
    );
  };

  // App Blocking & Screen Time handlers
  const handleToggleAppBlocked = (appId: string) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        const app = m.apps.find(a => a.id === appId);
        const willBeBlocked = app ? !app.isBlocked : false;

        if (willBeBlocked && app) {
          const blockAlert: SecurityAlert = {
            id: `alert-block-${Date.now()}`,
            memberId: m.id,
            memberName: m.name,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            dateKey: 'Hoje',
            type: 'APP_BLOCKED',
            title: `Aplicativo ${app.name} Bloqueado`,
            description: `O acesso a "${app.name}" foi bloqueado pelo responsável no celular de ${m.name.split(' ')[0]}.`,
            severity: 'info',
            read: false,
          };
          setAlerts(prevA => [blockAlert, ...prevA]);
        }

        return {
          ...m,
          apps: m.apps.map(a => (a.id === appId ? { ...a, isBlocked: willBeBlocked } : a)),
        };
      })
    );
    playNotificationChime();
  };

  const handleUpdateAppLimit = (appId: string, limitMinutes: number) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          apps: m.apps.map(a => (a.id === appId ? { ...a, dailyLimitMinutes: limitMinutes } : a)),
        };
      })
    );
    showToast('Limite diário de aplicativo atualizado.');
  };

  const handleToggleImmediateDeviceLock = () => {
    const willBeLocked = !currentMember.device.isDeviceLocked;
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          device: { ...m.device, isDeviceLocked: willBeLocked },
        };
      })
    );

    const alert: SecurityAlert = {
      id: `alert-lock-${Date.now()}`,
      memberId: currentMember.id,
      memberName: currentMember.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateKey: 'Hoje',
      type: 'DEVICE_LOCKED',
      title: willBeLocked ? 'Aparelho Bloqueado Remotamente' : 'Aparelho Desbloqueado',
      description: willBeLocked
        ? `O celular de ${currentMember.name.split(' ')[0]} foi travado pelo responsável.`
        : `O celular de ${currentMember.name.split(' ')[0]} foi liberado para uso.`,
      severity: willBeLocked ? 'warning' : 'info',
      read: false,
    };
    setAlerts(prev => [alert, ...prev]);
    showToast(willBeLocked ? 'Celular bloqueado com sucesso!' : 'Celular desbloqueado!');
  };

  const handleUpdateDailyLimit = (minutes: number) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          screenTime: { ...m.screenTime, dailyLimitMinutes: minutes },
        };
      })
    );
    showToast(`Tempo de tela ajustado para ${Math.floor(minutes / 60)}h ${minutes % 60 ? `${minutes % 60}m` : ''}.`);
  };

  const handleToggleSchoolMode = () => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          screenTime: { ...m.screenTime, schoolModeActive: !m.screenTime.schoolModeActive },
        };
      })
    );
    showToast('Modo Horário Escolar alterado.');
  };

  const handleToggleDowntime = () => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          screenTime: { ...m.screenTime, downtimeActive: !m.screenTime.downtimeActive },
        };
      })
    );
    showToast('Modo Hora de Dormir alterado.');
  };

  const handleSaveAudioLog = (log: AudioSessionLog) => {
    setMembers(prev =>
      prev.map(m => {
        if (m.id !== currentMember.id) return m;
        return {
          ...m,
          audioLogs: [log, ...m.audioLogs],
        };
      })
    );
    showToast('Amostra de áudio ambiente registrada.');
  };

  const handleSaveMember = (memberData: FamilyMember) => {
    const isExisting = members.some(m => m.id === memberData.id);
    if (isExisting) {
      setMembers(prev => prev.map(m => (m.id === memberData.id ? memberData : m)));
      showToast(`Dados de ${memberData.name} atualizados com sucesso!`);
    } else {
      setMembers(prev => [...prev, memberData]);
      setSelectedMemberId(memberData.id);
      showToast(`${memberData.name} foi adicionado(a) à família com sucesso!`);
    }
  };

  const handleDeleteMember = (memberId: string) => {
    if (members.length <= 1) {
      showToast('Atenção: A família deve conter pelo menos 1 membro.');
      return;
    }
    const memberToRemove = members.find(m => m.id === memberId);
    setMembers(prev => prev.filter(m => m.id !== memberId));

    if (selectedMemberId === memberId) {
      const remaining = members.filter(m => m.id !== memberId);
      if (remaining.length > 0) {
        setSelectedMemberId(remaining[0].id);
      }
    }

    showToast(`${memberToRemove ? memberToRemove.name : 'Membro'} foi excluído(a) da família.`);
  };

  const openAddMember = () => {
    setMemberFormMode('add');
    setEditingMember(null);
    setIsMemberFormOpen(true);
  };

  const openEditMember = (member: FamilyMember) => {
    setMemberFormMode('edit');
    setEditingMember(member);
    setIsMemberFormOpen(true);
  };

  const openManageFamily = () => {
    setIsManageFamilyOpen(true);
  };

  const handleMemberPairedFromQR = (newMember: FamilyMember) => {
    let finalId = newMember.id;
    setMembers(prev => {
      const matchIndex = prev.findIndex(m => 
        m.id === newMember.id || 
        (newMember.id && m.id.includes(newMember.id)) ||
        (newMember.name && m.name.toLowerCase().trim() === newMember.name.toLowerCase().trim())
      );
      if (matchIndex !== -1) {
        finalId = prev[matchIndex].id;
        return prev.map((m, idx) => idx === matchIndex ? { ...m, ...newMember, id: m.id } : m);
      }
      return [...prev, newMember];
    });
    setSelectedMemberId(finalId);
    setActiveTab('map');
    setConnectedDeviceBanner({
      id: finalId,
      name: newMember.name,
      model: newMember.device.model,
      battery: newMember.device.batteryLevel,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
    showToast(`🟢 Celular de ${newMember.name} pareado e ativo no mapa!`);

    const alert: SecurityAlert = {
      id: `alert-qr-${Date.now()}`,
      memberId: finalId,
      memberName: newMember.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateKey: 'Hoje',
      type: 'GEOFENCE_ENTRY',
      title: 'Aparelho Ativado via QR Code (Zero Instalação)',
      description: `${newMember.name} foi conectado com sucesso! Aparelho: ${newMember.device.model} (${newMember.phone || 'Sem telefone informado'}) com ${newMember.device.batteryLevel}% de bateria e GPS ativo.`,
      severity: 'info',
      read: false,
      location: { lat: newMember.currentLocation.lat, lng: newMember.currentLocation.lng },
    };
    setAlerts(prev => [alert, ...prev]);
  };

  // SOS Emergency triggered from child phone simulator
  const handleTriggerSOS = () => {
    const sosAlert: SecurityAlert = {
      id: `alert-sos-${Date.now()}`,
      memberId: currentMember.id,
      memberName: currentMember.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateKey: 'Hoje',
      type: 'SOS',
      title: '🚨 EMERGÊNCIA SOS ACIONADA!',
      description: `${currentMember.name.split(' ')[0]} apertou o botão de emergência SOS no celular! Localização: ${currentMember.currentLocation.address}`,
      severity: 'critical',
      read: false,
      location: { lat: currentMember.currentLocation.lat, lng: currentMember.currentLocation.lng },
    };
    setAlerts(prev => [sosAlert, ...prev]);
    setActiveTab('map');
    showToast(`🚨 ALERTA SOS CRÍTICO DE ${currentMember.name.toUpperCase()}!`);
  };

  // Child requests extra screen time
  const handleRequestExtraTime = () => {
    const requestAlert: SecurityAlert = {
      id: `alert-time-req-${Date.now()}`,
      memberId: currentMember.id,
      memberName: currentMember.name,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      dateKey: 'Hoje',
      type: 'SCREEN_TIME_LIMIT',
      title: 'Solicitação de +15 min de Tela',
      description: `${currentMember.name.split(' ')[0]} pediu mais 15 minutos de tempo de tela aos pais.`,
      severity: 'info',
      read: false,
    };
    setAlerts(prev => [requestAlert, ...prev]);
    showToast(`${currentMember.name.split(' ')[0]} pediu +15 min de tempo de tela.`);
  };

  const unreadAlertsCount = alerts.filter(a => !a.read).length;

  if (isMonitoredMode) {
    return (
      <MonitoredDeviceView
        token={monitoredParams.token}
        initialMemberName={monitoredParams.nome}
        initialRelationship={monitoredParams.parentesco}
        onSwitchToAdmin={() => {
          setIsMonitoredMode(false);
          if (typeof window !== 'undefined') {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 sm:py-6 flex justify-center text-slate-900 font-sans">
      {/* Smartphone Viewport Shell (Max width 440px on desktop, 100% on mobile) */}
      <div className="w-full max-w-md min-h-screen sm:min-h-[840px] sm:max-h-[920px] bg-slate-50 flex flex-col shadow-2xl sm:rounded-3xl border-x sm:border border-slate-200/90 relative overflow-x-hidden overflow-y-auto">
        
        {/* Android Simulated Status Bar (Visible on desktop preview) */}
        <div className="hidden sm:flex items-center justify-between px-5 pt-2 pb-1 text-[11px] font-mono text-slate-400 bg-white border-b border-slate-100 select-none shrink-0">
          <span className="font-semibold text-slate-600">17:45</span>
          <div className="w-20 h-3.5 bg-slate-100 rounded-full mx-auto" />
          <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
            <span>5G</span>
            <span>98%</span>
            <Battery className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Mobile Top App Bar */}
        <Navigation
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenAddMember={openAddMember}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onOpenAudioModal={() => setIsAudioModalOpen(true)}
          onOpenChildSimulator={() => setIsChildSimulatorOpen(true)}
          onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
          onOpenQRPairing={() => setIsQRPairingOpen(true)}
          unreadAlertsCount={unreadAlertsCount}
        />

        {/* Mobile Toast Banner Feedback */}
        {toastMessage && (
          <div className="absolute top-16 left-3 right-3 z-50 bg-slate-900/95 backdrop-blur-sm text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="flex items-center gap-2 truncate">
              <Info className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="truncate">{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white shrink-0 p-1">✕</button>
          </div>
        )}

        {/* Mobile Quick Mode Bar: Shows current device mode and allows 1-tap switch */}
        <div className="bg-indigo-50/90 border-b border-indigo-100/90 px-3.5 py-1.5 flex items-center justify-between text-[11px] shrink-0">
          <div className="flex items-center gap-1.5 text-indigo-950 font-bold">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Painel do Administrador (Pai)</span>
          </div>
          <button
            onClick={() => setIsMonitoredMode(true)}
            className="text-[10px] font-bold text-indigo-700 hover:text-indigo-900 bg-white hover:bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 shadow-2xs flex items-center gap-1 transition-colors"
            title="Mudar para tela do celular monitorado"
          >
            <Smartphone className="w-3 h-3 text-emerald-600" />
            <span>Ver Modo Celular Filho</span>
          </button>
        </div>

        {/* Real-time Connected Device Alert Banner */}
        {connectedDeviceBanner && (
          <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-3.5 py-2.5 mx-3 mt-2 rounded-2xl shadow-lg border border-emerald-400/50 flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-[11px] tracking-wide text-emerald-100">
                    🟢 APARELHO CADASTRADO E AO VIVO!
                  </span>
                  <span className="text-[9px] bg-emerald-950/40 text-emerald-200 px-1.5 py-0.5 rounded-full font-mono">
                    {connectedDeviceBanner.battery}% BAT
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-white truncate">
                  <strong>{connectedDeviceBanner.name}</strong> ({connectedDeviceBanner.model})
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedMemberId(connectedDeviceBanner.id);
                  setActiveTab('map');
                  setConnectedDeviceBanner(null);
                }}
                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg shadow-xs transition-colors whitespace-nowrap"
              >
                Ver no Mapa
              </button>
              <button
                type="button"
                onClick={() => setConnectedDeviceBanner(null)}
                className="p-1 text-emerald-200 hover:text-white"
                title="Fechar aviso"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Mobile Scrollable Body Content */}
        <main className="flex-1 px-3.5 py-3 space-y-3.5 pb-28">
          {/* Family Member Switcher Bar (Mobile Horizontal Carousel) */}
          <section>
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Família ({members.length})
              </span>
              <button
                type="button"
                onClick={openManageFamily}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
              >
                Gerenciar Membros
              </button>
            </div>

            <FamilyMemberSelector
              members={members}
              selectedMemberId={selectedMemberId}
              onSelectMember={(id) => {
                setSelectedMemberId(id);
                setSelectedHistoryIndex(null);
              }}
              onOpenAddMember={openAddMember}
              onOpenEditMember={openEditMember}
              onOpenManageFamily={openManageFamily}
              onOpenQRPairing={() => setIsQRPairingOpen(true)}
            />
          </section>

          {/* Screen 1: Live Map Tracking */}
          {activeTab === 'map' && (
            <div className="space-y-3.5">
              <MapTracker
                currentMember={currentMember}
                onLocationUpdate={handleLocationUpdate}
                onTriggerSoundAlert={handleTriggerSoundAlert}
                onAddNewSafeZoneAtLocation={(lat, lng) => {
                  handleAddSafeZone({
                    name: `Nova Zona (${currentMember.safeZones.length + 1})`,
                    address: 'Local demarcado no mapa',
                    lat,
                    lng,
                    radiusMeters: 200,
                    color: '#6366F1',
                    iconType: 'family',
                    notifyOnEntry: true,
                    notifyOnExit: true,
                  });
                }}
                selectedHistoryIndex={selectedHistoryIndex}
                showFullDayRoute={showFullDayRoute}
              />

              {/* Status and Diagnostics Strip */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-white shadow-xs flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 shrink-0">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-slate-900 block truncate">
                      {currentMember.currentLocation.currentZoneName
                        ? `Zona Segura: ${currentMember.currentLocation.currentZoneName}`
                        : 'Fora de Zona Segura'}
                    </span>
                    <span className="text-slate-500 text-[11px] truncate block">{currentMember.currentLocation.address}</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsAudioModalOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center gap-1 shrink-0 text-[11px]"
                >
                  <Mic className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Ouvir</span>
                </button>
              </div>

              {/* Battery and Device Diagnostics Card */}
              <BatteryStatusCard
                device={currentMember.device}
                memberName={currentMember.name}
                onTogglePowerSaving={() => {
                  setMembers(prev =>
                    prev.map(m =>
                      m.id === currentMember.id
                        ? {
                            ...m,
                            device: {
                              ...m.device,
                              powerSavingMode: !m.device.powerSavingMode,
                            },
                          }
                        : m
                    )
                  );
                  showToast('Modo de economia de energia alternado.');
                }}
                onSendBatteryReminder={() => {
                  showToast(`Lembrete de recarga enviado para o aparelho de ${currentMember.name.split(' ')[0]}!`);
                }}
              />
            </div>
          )}

          {/* Screen 2: Location History */}
          {activeTab === 'history' && (
            <div className="space-y-3.5">
              <LocationHistoryView
                currentMember={currentMember}
                onSelectHistoryPoint={(index) => {
                  setSelectedHistoryIndex(index);
                  setActiveTab('map');
                }}
                selectedPointIndex={selectedHistoryIndex}
                onToggleShowRoute={(show) => {
                  setShowFullDayRoute(show);
                  if (show) setActiveTab('map');
                }}
                showFullDayRoute={showFullDayRoute}
                onGoToLiveMapWithPoint={(lat, lng) => {
                  const matchedIdx = currentMember.history.findIndex(
                    h => Math.abs(h.lat - lat) < 0.002 && Math.abs(h.lng - lng) < 0.002
                  );
                  if (matchedIdx !== -1) {
                    setSelectedHistoryIndex(matchedIdx);
                  }
                  setActiveTab('map');
                }}
              />
            </div>
          )}

          {/* Screen 3: Safe Zones Manager */}
          {activeTab === 'zones' && (
            <div className="space-y-3.5">
              <SafeZonesManager
                currentMember={currentMember}
                onAddSafeZone={handleAddSafeZone}
                onRemoveSafeZone={handleRemoveSafeZone}
                onToggleZoneAlert={handleToggleZoneAlert}
              />
            </div>
          )}

          {/* Screen 4: Screen Time & App Blocker */}
          {activeTab === 'screentime' && (
            <div className="space-y-3.5">
              <ScreenTimeManager
                currentMember={currentMember}
                onToggleAppBlocked={handleToggleAppBlocked}
                onUpdateAppLimit={handleUpdateAppLimit}
                onToggleImmediateDeviceLock={handleToggleImmediateDeviceLock}
                onUpdateDailyLimit={handleUpdateDailyLimit}
                onToggleSchoolMode={handleToggleSchoolMode}
                onToggleDowntime={handleToggleDowntime}
              />
            </div>
          )}
        </main>
      </div>

      {/* Modals & Drawers */}
      <AmbientAudioModal
        isOpen={isAudioModalOpen}
        onClose={() => setIsAudioModalOpen(false)}
        currentMember={currentMember}
        onSaveAudioLog={handleSaveAudioLog}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onMarkAsRead={(id) => {
          setAlerts(prev => prev.map(a => (a.id === id ? { ...a, read: true } : a)));
        }}
        onMarkAllAsRead={() => {
          setAlerts(prev => prev.map(a => ({ ...a, read: true })));
        }}
        onFocusAlertLocation={(lat, lng) => {
          setActiveTab('map');
        }}
      />

      <MemberFormModal
        isOpen={isMemberFormOpen}
        mode={memberFormMode}
        initialMember={editingMember}
        onClose={() => setIsMemberFormOpen(false)}
        onSave={handleSaveMember}
        onDelete={handleDeleteMember}
        totalMembersCount={members.length}
      />

      <ManageFamilyModal
        isOpen={isManageFamilyOpen}
        onClose={() => setIsManageFamilyOpen(false)}
        members={members}
        selectedMemberId={selectedMemberId}
        onSelectMember={(id) => {
          setSelectedMemberId(id);
          setSelectedHistoryIndex(null);
        }}
        onOpenAddMember={openAddMember}
        onOpenEditMember={openEditMember}
        onDeleteMember={handleDeleteMember}
        onOpenQRPairing={() => setIsQRPairingOpen(true)}
      />

      <QRCodePairingModal
        isOpen={isQRPairingOpen}
        onClose={() => setIsQRPairingOpen(false)}
        onMemberPaired={handleMemberPairedFromQR}
      />

      <ChildDeviceSimulatorModal
        isOpen={isChildSimulatorOpen}
        onClose={() => setIsChildSimulatorOpen(false)}
        currentMember={currentMember}
        onTriggerSOS={handleTriggerSOS}
        onRequestExtraTime={handleRequestExtraTime}
      />

      <AndroidNativeModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />
    </div>
  );
}
