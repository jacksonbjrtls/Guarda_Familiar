import React, { useState } from 'react';
import { FamilyMember, AppControlItem } from '../types';
import { 
  Hourglass, 
  Lock, 
  Unlock, 
  Moon, 
  GraduationCap, 
  Sliders, 
  ShieldCheck, 
  Clock, 
  AlertCircle,
  Plus,
  Check,
  Ban,
  Smartphone
} from 'lucide-react';
import { playNotificationChime } from '../utils/audio';

interface ScreenTimeManagerProps {
  currentMember: FamilyMember;
  onToggleAppBlocked: (appId: string) => void;
  onUpdateAppLimit: (appId: string, limitMinutes: number) => void;
  onToggleImmediateDeviceLock: () => void;
  onUpdateDailyLimit: (minutes: number) => void;
  onToggleSchoolMode: () => void;
  onToggleDowntime: () => void;
}

export const ScreenTimeManager: React.FC<ScreenTimeManagerProps> = ({
  currentMember,
  onToggleAppBlocked,
  onUpdateAppLimit,
  onToggleImmediateDeviceLock,
  onUpdateDailyLimit,
  onToggleSchoolMode,
  onToggleDowntime,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<string>('todos');

  const { screenTime, apps, device } = currentMember;
  const isLocked = device.isDeviceLocked;

  const usedPercentage = Math.min(
    100,
    Math.round((screenTime.usedMinutesToday / (screenTime.dailyLimitMinutes || 1)) * 100)
  );

  const categories = ['todos', 'Redes Sociais', 'Jogos', 'Streaming', 'Mensagens', 'Educação'];

  const filteredApps = apps.filter(app => {
    if (categoryFilter === 'todos') return true;
    return app.category === categoryFilter;
  });

  const formatHoursMinutes = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours === 0) return `${minutes} min`;
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Hourglass className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Tempo de Tela e Bloqueio</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Gerencie limites e bloqueie jogos para {currentMember.name.split(' ')[0]}.
          </p>
        </div>

        {/* Instant Lock Button (Mobile Full Width) */}
        <button
          onClick={() => {
            onToggleImmediateDeviceLock();
            playNotificationChime();
          }}
          className={`w-full sm:w-auto px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs min-h-[44px] ${
            isLocked
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white'
          }`}
        >
          {isLocked ? (
            <>
              <Unlock className="w-4 h-4" />
              <span>Desbloquear Aparelho Agora</span>
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              <span>Bloquear Aparelho Imediatamente</span>
            </>
          )}
        </button>
      </div>

      {/* Screen Time Usage Overview */}
      <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <span className="text-xs text-slate-500">Uso Total Hoje</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {formatHoursMinutes(screenTime.usedMinutesToday)}
              </span>
              <span className="text-xs text-slate-500">
                de <strong className="font-mono text-slate-700">{formatHoursMinutes(screenTime.dailyLimitMinutes)}</strong> permitidos
              </span>
            </div>
          </div>

          {/* Quick daily limit buttons */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <span className="text-xs text-slate-500 mr-1 hidden md:inline">Ajustar Limite:</span>
            {[120, 180, 240].map((mins) => (
              <button
                key={mins}
                onClick={() => onUpdateDailyLimit(mins)}
                className={`px-2.5 py-1 text-xs rounded-md border font-mono tabular-nums transition-colors ${
                  screenTime.dailyLimitMinutes === mins
                    ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {formatHoursMinutes(mins)}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              usedPercentage >= 90 ? 'bg-rose-500' : usedPercentage >= 70 ? 'bg-amber-500' : 'bg-indigo-600'
            }`}
            style={{ width: `${usedPercentage}%` }}
          />
        </div>
        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1 font-mono">
          <span>{usedPercentage}% do limite diário utilizado</span>
          <span>
            {screenTime.dailyLimitMinutes - screenTime.usedMinutesToday > 0
              ? `Resta ${formatHoursMinutes(screenTime.dailyLimitMinutes - screenTime.usedMinutesToday)}`
              : 'Limite excedido'}
          </span>
        </div>
      </div>

      {/* Routine Schedules: School Mode & Bedtime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* School Mode */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs block">Modo Horário Escolar</span>
              <p className="text-xs text-slate-500 truncate">
                {screenTime.schoolStart} às {screenTime.schoolEnd} (Bloqueia jogos e redes)
              </p>
            </div>
          </div>

          <button
            onClick={onToggleSchoolMode}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              screenTime.schoolModeActive
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {screenTime.schoolModeActive ? 'Ativado' : 'Desativado'}
          </button>
        </div>

        {/* Bedtime / Downtime */}
        <div className="p-3.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-slate-900 text-xs block">Hora de Dormir</span>
              <p className="text-xs text-slate-500 truncate">
                {screenTime.downtimeStart} às {screenTime.downtimeEnd} (Tela desativada à noite)
              </p>
            </div>
          </div>

          <button
            onClick={onToggleDowntime}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors shrink-0 ${
              screenTime.downtimeActive
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {screenTime.downtimeActive ? 'Ativado' : 'Desativado'}
          </button>
        </div>
      </div>

      {/* Per-App Blocker Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <h4 className="font-bold text-slate-900 text-xs">Controle de Aplicativos Individuais</h4>

          {/* Category Filter Pills (Functional Filter Buttons) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg transition-colors whitespace-nowrap capitalize ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Apps List Grid */}
        <div className="space-y-2.5">
          {filteredApps.map((app) => (
            <div
              key={app.id}
              className={`p-3 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                app.isBlocked
                  ? 'border-rose-200 bg-rose-50/40'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                    app.isBlocked
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {app.name.substring(0, 2).toUpperCase()}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm truncate">{app.name}</span>
                    <span className="text-xs text-slate-500">· {app.category}</span>
                    {app.alwaysAllowed && (
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Sempre Liberado
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                    <span>Usado hoje: {formatHoursMinutes(app.usedMinutesToday)}</span>
                    <span>·</span>
                    <span>Limite: {formatHoursMinutes(app.dailyLimitMinutes)}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {/* Adjust Limit */}
                <select
                  value={app.dailyLimitMinutes}
                  onChange={(e) => onUpdateAppLimit(app.id, Number(e.target.value))}
                  disabled={app.alwaysAllowed}
                  aria-label={`Limite diário para ${app.name}`}
                  className="text-xs font-mono tabular-nums bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-hidden disabled:opacity-50"
                >
                  <option value={15}>15 min/dia</option>
                  <option value={30}>30 min/dia</option>
                  <option value={45}>45 min/dia</option>
                  <option value={60}>1 hora/dia</option>
                  <option value={90}>1h 30m/dia</option>
                  <option value={120}>2 horas/dia</option>
                </select>

                {/* Block / Unblock Toggle */}
                <button
                  onClick={() => onToggleAppBlocked(app.id)}
                  disabled={app.alwaysAllowed}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                    app.isBlocked
                      ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                      : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {app.isBlocked ? (
                    <>
                      <Ban className="w-3.5 h-3.5" />
                      <span>Bloqueado</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 text-slate-400" />
                      <span>Liberado</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
