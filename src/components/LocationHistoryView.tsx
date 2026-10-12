import React, { useState } from 'react';
import { FamilyMember, LocationHistoryPoint } from '../types';
import { 
  History, 
  MapPin, 
  Clock, 
  Navigation, 
  Calendar, 
  Footprints, 
  Car, 
  CheckCircle2, 
  Eye,
  Route,
  Flame,
  ListOrdered
} from 'lucide-react';
import { ActivityHeatmap } from './ActivityHeatmap';

interface LocationHistoryViewProps {
  currentMember: FamilyMember;
  onSelectHistoryPoint: (index: number) => void;
  selectedPointIndex?: number | null;
  onToggleShowRoute: (show: boolean) => void;
  showFullDayRoute: boolean;
  onGoToLiveMapWithPoint?: (lat: number, lng: number) => void;
}

export const LocationHistoryView: React.FC<LocationHistoryViewProps> = ({
  currentMember,
  onSelectHistoryPoint,
  selectedPointIndex,
  onToggleShowRoute,
  showFullDayRoute,
  onGoToLiveMapWithPoint,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'heatmap'>('heatmap');
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday'>('today');

  const history = currentMember.history;

  // Calculate summary metrics
  const totalStops = history.filter(h => h.type === 'stay').length;
  const totalTransit = history.filter(h => h.type === 'transit').length;
  const totalDistanceKm = history.reduce((sum, h) => sum + (h.distanceKm || 0), 0);

  // Helper to handle focusing on map from heatmap
  const handleHeatmapFocusLive = (lat: number, lng: number) => {
    if (onGoToLiveMapWithPoint) {
      onGoToLiveMapWithPoint(lat, lng);
    } else {
      // Find matching history point index
      const matchedIdx = history.findIndex(h => Math.abs(h.lat - lat) < 0.001 && Math.abs(h.lng - lng) < 0.001);
      if (matchedIdx !== -1) {
        onSelectHistoryPoint(matchedIdx);
      } else {
        onSelectHistoryPoint(0);
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-4">
      {/* Header and View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            {viewMode === 'heatmap' ? (
              <Flame className="w-5 h-5 text-orange-600" />
            ) : (
              <History className="w-5 h-5 text-indigo-600" />
            )}
            <h3 className="text-base font-bold text-slate-900">
              {viewMode === 'heatmap' 
                ? 'Mapa de Calor de Atividade' 
                : 'Histórico de Locais Visitados no Dia'}
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {viewMode === 'heatmap'
              ? `Identificação visual das áreas onde ${currentMember.name.split(' ')[0]} passa mais tempo.`
              : `Registro cronológico contínuo de paradas e deslocamentos de ${currentMember.name.split(' ')[0]}.`}
          </p>
        </div>

        {/* View Mode Segmented Switch: Linha do Tempo vs Mapa de Calor */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'heatmap'
                  ? 'bg-white text-orange-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Mapa de Calor</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === 'timeline'
                  ? 'bg-white text-indigo-600 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Linha do Tempo</span>
            </button>
          </div>

          {/* Date Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              onClick={() => setSelectedDate('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedDate === 'today' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setSelectedDate('yesterday')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                selectedDate === 'yesterday' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
              }`}
            >
              Ontem
            </button>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: ACTIVITY HEATMAP */}
      {viewMode === 'heatmap' && (
        <ActivityHeatmap
          currentMember={currentMember}
          onGoToLiveMapWithPoint={handleHeatmapFocusLive}
        />
      )}

      {/* VIEW MODE 2: CHRONOLOGICAL TIMELINE */}
      {viewMode === 'timeline' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{selectedDate === 'today' ? 'Hoje, sequência de eventos' : 'Ontem, histórico gravado'}</span>
            </div>

            <button
              onClick={() => onToggleShowRoute(!showFullDayRoute)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 border ${
                showFullDayRoute
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title="Traçar todas as rotas percorridas no mapa"
            >
              <Route className="w-3.5 h-3.5" />
              <span>{showFullDayRoute ? 'Ocultar Rota' : 'Traçar Rota no Mapa'}</span>
            </button>
          </div>

          {/* Day Overview Strip */}
          <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center text-xs">
            <div>
              <span className="text-slate-400 block text-[11px]">Locais Visitados</span>
              <span className="font-bold font-mono tabular-nums text-slate-800 text-sm">{totalStops} paradas</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Deslocamento</span>
              <span className="font-bold font-mono tabular-nums text-slate-800 text-sm">
                {totalDistanceKm > 0 ? `${totalDistanceKm.toFixed(1)} km` : '2.8 km'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Status Geral</span>
              <span className="font-semibold text-emerald-700 text-sm flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" /> 100% Seguro
              </span>
            </div>
          </div>

          {/* Chronological Timeline */}
          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200 pt-2">
            {history.map((item, index) => {
              const isSelected = selectedPointIndex === index;
              const isStay = item.type === 'stay';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectHistoryPoint(index)}
                  className={`relative cursor-pointer group p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-xs'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50/80'
                  }`}
                >
                  {/* Timeline Bullet Node */}
                  <div
                    className={`absolute -left-6 top-4 w-5 h-5 rounded-full flex items-center justify-center border-2 transition-transform group-hover:scale-110 ${
                      isSelected
                        ? 'bg-indigo-600 border-white text-white shadow-xs'
                        : isStay
                        ? 'bg-white border-indigo-600 text-indigo-600'
                        : 'bg-white border-slate-400 text-slate-500'
                    }`}
                  >
                    {isStay ? (
                      <MapPin className="w-2.5 h-2.5 fill-current" />
                    ) : (
                      <Navigation className="w-2.5 h-2.5 fill-current" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{item.title}</span>
                        <span className="text-xs font-mono tabular-nums font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {item.time}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{item.address}</p>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500 self-start mt-1 sm:mt-0">
                      {item.durationMinutes > 0 && (
                        <span className="flex items-center gap-1 font-mono tabular-nums">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {Math.floor(item.durationMinutes / 60) > 0 ? `${Math.floor(item.durationMinutes / 60)}h ` : ''}
                          {item.durationMinutes % 60}m no local
                        </span>
                      )}
                      {item.speedKmH && item.speedKmH > 0 && (
                        <span className="flex items-center gap-1 text-slate-600 font-mono tabular-nums">
                          <Car className="w-3.5 h-3.5 text-slate-400" />
                          Média {item.speedKmH} km/h
                        </span>
                      )}
                      <Eye className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors ml-1" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

