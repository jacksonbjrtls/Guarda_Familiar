export type MemberRole = 'child' | 'parent';

export interface DeviceInfo {
  model: string;
  batteryLevel: number;
  isCharging: boolean;
  networkType: '5G' | '4G LTE' | 'Wi-Fi' | 'Offline';
  soundMode: 'Normal' | 'Silencioso' | 'Vibrar';
  gpsAccuracyMeters: number;
  lastSync: string;
  isDeviceLocked: boolean;
  screenTimeLockActive: boolean;
  powerSavingMode: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CurrentLocation extends Coordinates {
  address: string;
  speedKmH: number;
  altitudeM?: number;
  currentZoneName?: string;
  statusText: string;
  lastUpdated: string;
}

export interface SafeZone {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  radiusMeters: number;
  color: string;
  iconType: 'home' | 'school' | 'park' | 'sports' | 'family';
  notifyOnEntry: boolean;
  notifyOnExit: boolean;
}

export interface LocationHistoryPoint {
  id: string;
  time: string;
  timestamp: number;
  title: string;
  address: string;
  lat: number;
  lng: number;
  durationMinutes: number;
  type: 'stay' | 'transit';
  speedKmH?: number;
  distanceKm?: number;
  zoneId?: string;
}

export interface AppControlItem {
  id: string;
  name: string;
  category: 'Redes Sociais' | 'Jogos' | 'Streaming' | 'Mensagens' | 'Educação';
  icon: string;
  isBlocked: boolean;
  dailyLimitMinutes: number;
  usedMinutesToday: number;
  alwaysAllowed?: boolean;
}

export interface AudioSessionLog {
  id: string;
  timestamp: string;
  durationSeconds: number;
  decibelAvg: number;
  summary: string;
  notes: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: MemberRole;
  age?: number;
  relationship: string;
  avatarColor: string;
  avatarInitials: string;
  phone?: string;
  device: DeviceInfo;
  currentLocation: CurrentLocation;
  safeZones: SafeZone[];
  screenTime: {
    usedMinutesToday: number;
    dailyLimitMinutes: number;
    downtimeActive: boolean;
    downtimeStart: string; // e.g. "21:30"
    downtimeEnd: string;   // e.g. "06:30"
    schoolModeActive: boolean;
    schoolStart: string;   // e.g. "07:30"
    schoolEnd: string;     // e.g. "12:30"
  };
  apps: AppControlItem[];
  history: LocationHistoryPoint[];
  audioLogs: AudioSessionLog[];
}

export interface SecurityAlert {
  id: string;
  memberId: string;
  memberName: string;
  timestamp: string;
  dateKey: string;
  type: 'GEOFENCE_EXIT' | 'GEOFENCE_ENTRY' | 'LOW_BATTERY' | 'SCREEN_TIME_LIMIT' | 'SOS' | 'AUDIO_CHECK' | 'APP_BLOCKED' | 'DEVICE_LOCKED';
  title: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  read: boolean;
  location?: Coordinates;
}
