import React from 'react';
import { DeviceInfo } from '../types';
import { 
  Battery, 
  BatteryCharging, 
  BatteryWarning, 
  Wifi, 
  Volume2, 
  VolumeX, 
  Radio, 
  Smartphone,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface BatteryStatusCardProps {
  device: DeviceInfo;
  memberName: string;
  onTogglePowerSaving?: () => void;
  onSendBatteryReminder?: () => void;
}

export const BatteryStatusCard: React.FC<BatteryStatusCardProps> = ({
  device,
  memberName,
  onTogglePowerSaving,
  onSendBatteryReminder,
}) => {
  const isLow = device.batteryLevel <= 20;
  const isCritical = device.batteryLevel <= 10;

  // Determine battery color class
  const getBatteryColor = () => {
    if (device.isCharging) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (isCritical) return 'text-rose-600 bg-rose-50 border-rose-200';
    if (isLow) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-slate-800 bg-slate-50 border-slate-200';
  };

  const getProgressColor = () => {
    if (device.isCharging) return 'bg-emerald-500';
    if (isCritical) return 'bg-rose-500';
    if (isLow) return 'bg-amber-500';
    return 'bg-indigo-600';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Diagnóstico do Dispositivo</h3>
        </div>
        <span className="text-xs text-slate-500 font-mono tabular-nums">{device.lastSync}</span>
      </div>

      {/* Battery Gauge */}
      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            {device.isCharging ? (
              <BatteryCharging className="w-5 h-5 text-emerald-600" />
            ) : isLow ? (
              <BatteryWarning className="w-5 h-5 text-rose-600" />
            ) : (
              <Battery className="w-5 h-5 text-slate-700" />
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold font-mono tabular-nums text-slate-900 tracking-tight">
                  {device.batteryLevel}%
                </span>
                {device.isCharging && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-emerald-600" /> Carregando
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {device.isCharging
                  ? 'Conectado à tomada'
                  : isLow
                  ? 'Bateria baixa! Notifique para recarregar'
                  : 'Nível seguro de bateria'}
              </p>
            </div>
          </div>

          {isLow && onSendBatteryReminder && (
            <button
              onClick={onSendBatteryReminder}
              className="px-3 py-1.5 text-xs font-medium bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg transition-colors whitespace-nowrap"
            >
              Lembrar Filho
            </button>
          )}
        </div>

        {/* Battery Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${getProgressColor()}`}
            style={{ width: `${Math.max(5, device.batteryLevel)}%` }}
          />
        </div>
      </div>

      {/* Device Specifications Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-4">
        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <span className="text-slate-400 block mb-0.5">Modelo</span>
          <span className="font-semibold text-slate-800 truncate block">{device.model}</span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <span className="text-slate-400 block mb-0.5">Rede & Dados</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-slate-500" />
            {device.networkType}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <span className="text-slate-400 block mb-0.5">Modo de Som</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1">
            {device.soundMode === 'Silencioso' ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
            )}
            {device.soundMode}
          </span>
        </div>

        <div className="p-2.5 rounded-lg border border-slate-100 bg-white">
          <span className="text-slate-400 block mb-0.5">Precisão GPS</span>
          <span className="font-semibold text-slate-800 flex items-center gap-1 font-mono tabular-nums">
            <Radio className="w-3.5 h-3.5 text-indigo-600" />
            ±{device.gpsAccuracyMeters} metros
          </span>
        </div>
      </div>

      {/* Safety Actions */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Localização contínua ativa</span>
        </div>

        {onTogglePowerSaving && (
          <button
            onClick={onTogglePowerSaving}
            className={`text-xs font-medium px-2.5 py-1 rounded-md transition-colors ${
              device.powerSavingMode
                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                : 'text-slate-600 hover:text-slate-900 bg-slate-100'
            }`}
          >
            {device.powerSavingMode ? 'Economia: Ativa' : 'Ativar Economia'}
          </button>
        )}
      </div>
    </div>
  );
};
