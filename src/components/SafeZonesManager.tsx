import React, { useState } from 'react';
import { SafeZone, FamilyMember } from '../types';
import { 
  Shield, 
  MapPin, 
  Plus, 
  Trash2, 
  Bell, 
  Check, 
  School, 
  Home, 
  Trees, 
  Dumbbell, 
  Users, 
  Navigation
} from 'lucide-react';

interface SafeZonesManagerProps {
  currentMember: FamilyMember;
  onAddSafeZone: (zone: Omit<SafeZone, 'id'>) => void;
  onRemoveSafeZone: (zoneId: string) => void;
  onToggleZoneAlert: (zoneId: string, alertType: 'entry' | 'exit') => void;
  onOpenMapAddMode?: () => void;
}

export const SafeZonesManager: React.FC<SafeZonesManagerProps> = ({
  currentMember,
  onAddSafeZone,
  onRemoveSafeZone,
  onToggleZoneAlert,
  onOpenMapAddMode,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [radiusMeters, setRadiusMeters] = useState(200);
  const [iconType, setIconType] = useState<SafeZone['iconType']>('home');
  const [notifyOnEntry, setNotifyOnEntry] = useState(true);
  const [notifyOnExit, setNotifyOnExit] = useState(true);

  // Compute approximate distance in meters (haversine)
  const calculateDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
  };

  const getIcon = (type: SafeZone['iconType']) => {
    switch (type) {
      case 'home':
        return <Home className="w-4 h-4 text-emerald-600" />;
      case 'school':
        return <School className="w-4 h-4 text-indigo-600" />;
      case 'park':
        return <Trees className="w-4 h-4 text-amber-600" />;
      case 'sports':
        return <Dumbbell className="w-4 h-4 text-sky-600" />;
      default:
        return <Users className="w-4 h-4 text-purple-600" />;
    }
  };

  const getColor = (type: SafeZone['iconType']) => {
    switch (type) {
      case 'home': return '#10B981';
      case 'school': return '#6366F1';
      case 'park': return '#F59E0B';
      case 'sports': return '#0EA5E9';
      default: return '#8B5CF6';
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Use current location as fallback default or offsets
    const lat = currentMember.currentLocation.lat + (Math.random() - 0.5) * 0.01;
    const lng = currentMember.currentLocation.lng + (Math.random() - 0.5) * 0.01;

    onAddSafeZone({
      name: name.trim(),
      address: address.trim() || 'Área demarcada pela família',
      lat,
      lng,
      radiusMeters,
      color: getColor(iconType),
      iconType,
      notifyOnEntry,
      notifyOnExit,
    });

    setName('');
    setAddress('');
    setRadiusMeters(200);
    setIsModalOpen(false);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Zonas Seguras (Cerca Eletrônica)</h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Receba notificações imediatas quando {currentMember.name.split(' ')[0]} entrar ou sair destas áreas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Criar Zona</span>
        </button>
      </div>

      {/* Safe Zones List */}
      <div className="space-y-3">
        {currentMember.safeZones.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl">
            <p className="text-xs text-slate-500 mb-2">Nenhuma zona de segurança configurada ainda.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Criar primeira zona segura
            </button>
          </div>
        ) : (
          currentMember.safeZones.map((zone) => {
            const distance = calculateDistanceMeters(
              currentMember.currentLocation.lat,
              currentMember.currentLocation.lng,
              zone.lat,
              zone.lng
            );
            const isInside = distance <= zone.radiusMeters;

            return (
              <div
                key={zone.id}
                className="p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{
                      backgroundColor: `${zone.color}15`,
                      borderColor: `${zone.color}35`,
                    }}
                  >
                    {getIcon(zone.iconType)}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm">{zone.name}</span>
                      {isInside ? (
                        <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Presente agora
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-mono tabular-nums">
                          {distance > 1000 ? `${(distance / 1000).toFixed(1)} km` : `${distance}m`} de distância
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate max-w-md">{zone.address}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>Raio: {zone.radiusMeters}m</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Bell className="w-3 h-3 text-slate-400" />
                        {zone.notifyOnEntry && zone.notifyOnExit
                          ? 'Alertas de entrada e saída'
                          : zone.notifyOnExit
                          ? 'Alerta apenas na saída'
                          : 'Alerta apenas na entrada'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    onClick={() => onToggleZoneAlert(zone.id, 'exit')}
                    className={`p-1.5 rounded-md text-xs font-medium border transition-colors ${
                      zone.notifyOnExit
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                    }`}
                    title="Alternar notificação ao sair"
                  >
                    Alerta Saída
                  </button>

                  <button
                    onClick={() => onRemoveSafeZone(zone.id)}
                    className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Remover zona segura"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal to add a new Safe Zone */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-5 shadow-2xl border-t sm:border border-slate-200 animate-in slide-in-from-bottom duration-200 max-h-[90vh] overflow-y-auto pb-safe">
            {/* Mobile Drag Handle */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-3 sm:hidden" />

            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-slate-900 text-sm">Adicionar Nova Zona Segura</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nome do Local</label>
                <input
                  type="text"
                  placeholder="Ex: Escola Municipal, Casa da Vovó, Clube"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Endereço de Referência</label>
                <input
                  type="text"
                  placeholder="Rua, número, bairro ou cidade"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Raio de Perímetro Seguro ({radiusMeters} metros)
                </label>
                <input
                  type="range"
                  min="100"
                  max="800"
                  step="50"
                  value={radiusMeters}
                  onChange={(e) => setRadiusMeters(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
                  <span>100m (Prédio/Casa)</span>
                  <span>400m (Campus)</span>
                  <span>800m (Bairro)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Categoria / Ícone</label>
                <div className="grid grid-cols-5 gap-2">
                  {(['home', 'school', 'park', 'sports', 'family'] as const).map((type) => (
                    <button
                      type="button"
                      key={type}
                      onClick={() => setIconType(type)}
                      className={`p-2.5 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all ${
                        iconType === type
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-700 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {getIcon(type)}
                      <span className="text-[10px] capitalize font-medium">{type}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyOnExit}
                    onChange={(e) => setNotifyOnExit(e.target.checked)}
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Notificar imediatamente quando sair da zona</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={notifyOnEntry}
                    onChange={(e) => setNotifyOnEntry(e.target.checked)}
                    className="rounded-sm text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Notificar quando chegar e entrar na zona</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  Salvar Zona Segura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
