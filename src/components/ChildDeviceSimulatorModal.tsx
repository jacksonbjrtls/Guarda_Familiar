import React, { useState } from 'react';
import { FamilyMember } from '../types';
import { 
  ShieldAlert, 
  Phone, 
  Battery, 
  Wifi, 
  Clock, 
  Lock, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Smartphone
} from 'lucide-react';
import { playEmergencyAlertSound, playNotificationChime } from '../utils/audio';

interface ChildDeviceSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  onTriggerSOS: () => void;
  onRequestExtraTime: () => void;
}

export const ChildDeviceSimulatorModal: React.FC<ChildDeviceSimulatorModalProps> = ({
  isOpen,
  onClose,
  currentMember,
  onTriggerSOS,
  onRequestExtraTime,
}) => {
  const [sosSent, setSosSent] = useState(false);
  const [extraTimeRequested, setExtraTimeRequested] = useState(false);

  const { device, screenTime } = currentMember;
  const isLocked = device.isDeviceLocked;

  const handleSOSPress = () => {
    playEmergencyAlertSound();
    onTriggerSOS();
    setSosSent(true);
    setTimeout(() => setSosSent(false), 5000);
  };

  const handleRequestTime = () => {
    playNotificationChime();
    onRequestExtraTime();
    setExtraTimeRequested(true);
    setTimeout(() => setExtraTimeRequested(false), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="bg-slate-900 rounded-3xl p-3.5 shadow-2xl border border-slate-700 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150 text-white max-h-[92vh] overflow-y-auto">
        {/* Device Frame Header */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Smartphone className="w-4 h-4 text-indigo-400" />
            <span>Simulador: {currentMember.name.split(' ')[0]}</span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
          >
            ✕
          </button>
        </div>

        {/* Mobile Phone Screen Simulator Box */}
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 relative overflow-hidden min-h-[460px] flex flex-col justify-between">
          {/* Top Status Bar */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-4">
            <span>17:28</span>
            <div className="w-16 h-3 bg-slate-900 rounded-full mx-auto" /> {/* Speaker cutout */}
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3 text-slate-300" />
              <span>{device.batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 text-slate-300" />
            </div>
          </div>

          {/* Locked Overlay if device locked */}
          {isLocked ? (
            <div className="my-auto text-center p-6 bg-rose-950/40 border border-rose-800/60 rounded-2xl">
              <div className="w-14 h-14 bg-rose-600/20 border border-rose-500 rounded-full flex items-center justify-center mx-auto mb-3 text-rose-400">
                <Lock className="w-7 h-7" />
              </div>
              <h4 className="font-bold text-base text-rose-300 mb-1">Aparelho em Bloqueio Parental</h4>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                Seus pais ativaram o modo de descanso ou foco escolar. O uso de jogos e redes está bloqueado.
              </p>
              <button
                onClick={handleSOSPress}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Chamada de Emergência SOS</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 my-auto">
              {/* App Status Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-2 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-sm text-slate-100">Guardião da Família Ativo</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Localização compartilhada com seus pais com segurança.
                </p>

                {/* Screen time pill */}
                <div className="mt-3 p-2.5 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tempo de Tela Hoje:</span>
                  <span className="font-mono font-bold text-indigo-400">
                    {Math.max(0, screenTime.dailyLimitMinutes - screenTime.usedMinutesToday)} min restantes
                  </span>
                </div>
              </div>

              {/* SOS Emergency Button */}
              <div className="text-center">
                <button
                  onClick={handleSOSPress}
                  className={`w-full py-4 rounded-2xl font-extrabold text-sm transition-all shadow-xl flex items-center justify-center gap-2 ${
                    sosSent
                      ? 'bg-emerald-600 text-white animate-pulse'
                      : 'bg-rose-600 hover:bg-rose-700 active:scale-95 text-white ring-4 ring-rose-600/20'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span>{sosSent ? 'ALERTA SOS ENVIADO AOS PAIS!' : 'BOTÃO DE EMERGÊNCIA SOS'}</span>
                </button>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Envia sua localização exata e toca alarme nos celulares dos seus pais imediatamente.
                </p>
              </div>

              {/* Quick Family Call buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => playNotificationChime()}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ligar p/ Papai</span>
                </button>

                <button
                  onClick={() => playNotificationChime()}
                  className="p-3 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Ligar p/ Mamãe</span>
                </button>
              </div>

              {/* Request Extra Time */}
              <button
                onClick={handleRequestTime}
                disabled={extraTimeRequested}
                className="w-full py-2 bg-slate-900/60 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-300 font-medium transition-colors"
              >
                {extraTimeRequested ? '✓ Pedido de +15 min enviado aos pais!' : 'Pedir +15 min de tela aos pais'}
              </button>
            </div>
          )}

          {/* Home indicator bar */}
          <div className="w-24 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
        </div>
      </div>
    </div>
  );
};
