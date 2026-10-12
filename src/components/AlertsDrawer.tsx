import React, { useState } from 'react';
import { SecurityAlert } from '../types';
import { 
  Bell, 
  ShieldAlert, 
  MapPin, 
  BatteryWarning, 
  Clock, 
  Ban, 
  Check, 
  CheckCheck, 
  AlertTriangle,
  X,
  Volume2
} from 'lucide-react';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SecurityAlert[];
  onMarkAsRead: (alertId: string) => void;
  onMarkAllAsRead: () => void;
  onFocusAlertLocation?: (lat: number, lng: number) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onMarkAsRead,
  onMarkAllAsRead,
  onFocusAlertLocation,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredAlerts = alerts.filter(a => (filter === 'unread' ? !a.read : true));
  const unreadCount = alerts.filter(a => !a.read).length;

  const getAlertIcon = (type: SecurityAlert['type'], severity: SecurityAlert['severity']) => {
    switch (type) {
      case 'SOS':
        return <ShieldAlert className="w-4 h-4 text-rose-600" />;
      case 'GEOFENCE_EXIT':
        return <MapPin className="w-4 h-4 text-amber-600" />;
      case 'GEOFENCE_ENTRY':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'LOW_BATTERY':
        return <BatteryWarning className="w-4 h-4 text-rose-600" />;
      case 'APP_BLOCKED':
        return <Ban className="w-4 h-4 text-indigo-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-md bg-white h-full shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Alertas de Segurança</h3>
              <p className="text-xs text-slate-500">
                {unreadCount > 0 ? `${unreadCount} novos avisos não lidos` : 'Todos os alertas em dia'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold p-1"
                title="Marcar todas como lidas"
              >
                Ler todas
              </button>
            )}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-700 rounded-full"
              aria-label="Fechar gaveta de alertas"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors min-h-[36px] ${
              filter === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({alerts.length})
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors min-h-[36px] ${
              filter === 'unread'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Não lidos ({unreadCount})
          </button>
        </div>

        {/* Alerts List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-safe">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              <CheckCheck className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Nenhum alerta recente para exibir.
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  alert.read
                    ? 'bg-white border-slate-200 opacity-80'
                    : alert.severity === 'critical'
                    ? 'bg-rose-50/60 border-rose-300 shadow-xs'
                    : 'bg-indigo-50/40 border-indigo-200 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-md bg-white border border-slate-200">
                      {getAlertIcon(alert.type, alert.severity)}
                    </div>
                    <span className="font-bold text-slate-900 text-xs">{alert.title}</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                    {alert.timestamp}
                  </span>
                </div>

                <p className="text-xs text-slate-600 mt-1 pl-7 leading-relaxed">{alert.description}</p>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 pl-7 text-xs">
                  <span className="text-slate-500 text-[11px]">
                    Membro: <strong>{alert.memberName}</strong>
                  </span>

                  <div className="flex items-center gap-2">
                    {alert.location && onFocusAlertLocation && (
                      <button
                        onClick={() => {
                          onFocusAlertLocation(alert.location!.lat, alert.location!.lng);
                          onClose();
                        }}
                        className="text-xs font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <MapPin className="w-3 h-3" />
                        Ver no mapa
                      </button>
                    )}

                    {!alert.read && (
                      <button
                        onClick={() => onMarkAsRead(alert.id)}
                        className="text-[11px] text-slate-400 hover:text-slate-700"
                      >
                        Marcar como lido
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
