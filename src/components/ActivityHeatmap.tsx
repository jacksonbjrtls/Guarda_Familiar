import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { FamilyMember } from '../types';
import { 
  aggregateHeatmapHotspots, 
  HeatmapHotspot, 
  formatMinutesHuman 
} from '../utils/heatmapUtils';
import { 
  Flame, 
  Layers, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Compass, 
  Navigation, 
  Sliders, 
  Maximize2,
  ChevronRight,
  Info,
  Calendar,
  CheckCircle2
} from 'lucide-react';

interface ActivityHeatmapProps {
  currentMember: FamilyMember;
  onGoToLiveMapWithPoint?: (lat: number, lng: number) => void;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  currentMember,
  onGoToLiveMapWithPoint,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerGroupRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [minDwellFilter, setMinDwellFilter] = useState<'all' | '30m' | '60m'>('all');
  const [radiusScale, setRadiusScale] = useState<number>(220); // base meters
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');

  // Compute hotspots from history
  const allHotspots = useMemo(() => {
    return aggregateHeatmapHotspots(currentMember.history);
  }, [currentMember.history]);

  // Filtered hotspots based on min dwell duration
  const visibleHotspots = useMemo(() => {
    return allHotspots.filter(spot => {
      if (minDwellFilter === '60m') return spot.totalMinutes >= 60;
      if (minDwellFilter === '30m') return spot.totalMinutes >= 30;
      return true;
    });
  }, [allHotspots, minDwellFilter]);

  const selectedHotspot = useMemo(() => {
    return allHotspots.find(s => s.id === selectedHotspotId) || null;
  }, [allHotspots, selectedHotspotId]);

  // Overall analytics
  const totalDwellMinutes = useMemo(() => {
    return allHotspots.reduce((sum, h) => sum + h.totalMinutes, 0);
  }, [allHotspots]);

  const safeZoneDwellMinutes = useMemo(() => {
    return allHotspots
      .filter(h => !!h.zoneId)
      .reduce((sum, h) => sum + h.totalMinutes, 0);
  }, [allHotspots]);

  const safeZonePercentage = totalDwellMinutes > 0
    ? Math.round((safeZoneDwellMinutes / totalDwellMinutes) * 100)
    : 100;

  const topSpot = allHotspots.length > 0 ? allHotspots[0] : null;

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const initialLat = allHotspots.length > 0 ? allHotspots[0].lat : currentMember.currentLocation.lat;
      const initialLng = allHotspots.length > 0 ? allHotspots[0].lng : currentMember.currentLocation.lng;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 14,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      });

      streetLayer.addTo(map);

      heatLayerGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }
  }, []);

  // Handle Tile Layer Switch
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    if (mapStyle === 'streets') {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}', {
        attribution: '&copy; Esri World Imagery',
        maxZoom: 19,
      }).addTo(map);
    }
  }, [mapStyle]);

  // Render Heatmap Circles & Dwell Labels
  useEffect(() => {
    const map = mapInstanceRef.current;
    const heatGroup = heatLayerGroupRef.current;
    if (!map || !heatGroup) return;

    heatGroup.clearLayers();

    if (visibleHotspots.length === 0) return;

    const bounds = L.latLngBounds([]);

    visibleHotspots.forEach((spot, index) => {
      bounds.extend([spot.lat, spot.lng]);

      // Calculate radius multiplier based on duration
      // Duration >= 180 min -> up to 1.8x base radius
      const factor = Math.min(2.0, Math.max(0.65, spot.totalMinutes / 120));
      const hotspotRadius = radiusScale * factor;

      // Color palette based on intensity
      let outerColor = '#fef08a'; // yellow-200
      let midColor = '#fbbf24';   // amber-400
      let coreColor = '#ef4444';  // red-500
      let coreFillOpacity = 0.5;

      if (spot.intensityLevel === 'critical') {
        outerColor = '#fca5a5'; // red-300
        midColor = '#f97316';   // orange-500
        coreColor = '#dc2626';  // crimson
        coreFillOpacity = 0.65;
      } else if (spot.intensityLevel === 'high') {
        outerColor = '#fed7aa'; // orange-200
        midColor = '#f97316';   // orange-500
        coreColor = '#ea580c';  // orange-600
        coreFillOpacity = 0.55;
      } else if (spot.intensityLevel === 'medium') {
        outerColor = '#fef08a'; // yellow
        midColor = '#eab308';   // yellow-500
        coreColor = '#ca8a04';  // yellow-600
        coreFillOpacity = 0.45;
      } else {
        outerColor = '#a7f3d0'; // emerald-200
        midColor = '#10b981';   // emerald-500
        coreColor = '#059669';  // emerald-600
        coreFillOpacity = 0.35;
      }

      // Outer Heat Aura Circle (Large dispersion)
      const outerCircle = L.circle([spot.lat, spot.lng], {
        radius: hotspotRadius * 1.5,
        color: 'transparent',
        fillColor: outerColor,
        fillOpacity: 0.22,
        weight: 0,
        interactive: false,
      });

      // Mid Heat Ring (Moderate dispersion)
      const midCircle = L.circle([spot.lat, spot.lng], {
        radius: hotspotRadius,
        color: midColor,
        fillColor: midColor,
        fillOpacity: 0.38,
        weight: 1,
        dashArray: '3, 6',
        interactive: false,
      });

      // Inner Core Heat Circle (High density)
      const coreCircle = L.circle([spot.lat, spot.lng], {
        radius: hotspotRadius * 0.45,
        color: coreColor,
        fillColor: coreColor,
        fillOpacity: coreFillOpacity,
        weight: 2,
        interactive: true,
      });

      // Interactive Click on Core
      coreCircle.on('click', () => {
        setSelectedHotspotId(spot.id);
        map.flyTo([spot.lat, spot.lng], 16, { duration: 0.8 });
      });

      // Custom Floating Label Pin with Time
      const timeFormatted = formatMinutesHuman(spot.totalMinutes);
      const isSelected = selectedHotspotId === spot.id;
      const rankBadge = index + 1;

      const labelIcon = L.divIcon({
        className: 'heatmap-pin-label',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center; transform: translate(-50%, -50%); cursor: pointer;">
            <div style="
              display: flex; 
              align-items: center; 
              gap: 5px; 
              background: ${isSelected ? '#0f172a' : 'rgba(255, 255, 255, 0.96)'}; 
              color: ${isSelected ? '#ffffff' : '#0f172a'}; 
              border: 1.5px solid ${isSelected ? '#6366f1' : coreColor}; 
              padding: 2px 8px; 
              border-radius: 9999px; 
              box-shadow: 0 4px 14px rgba(0,0,0,0.18); 
              font-size: 11px; 
              font-weight: 700;
              white-space: nowrap;
              transition: all 0.2s ease;
            ">
              <span style="
                display: inline-flex; 
                align-items: center; 
                justify-content: center; 
                width: 16px; 
                height: 16px; 
                border-radius: 9999px; 
                background: ${coreColor}; 
                color: #ffffff; 
                font-size: 9px;
              ">#${rankBadge}</span>
              <span>${timeFormatted}</span>
              <span style="font-size: 9px; opacity: 0.85; font-weight: 600;">(${spot.percentOfDay}%)</span>
            </div>
            <div style="
              width: 8px; 
              height: 8px; 
              background: ${coreColor}; 
              border-radius: 9999px; 
              margin-top: 2px;
              box-shadow: 0 0 8px ${coreColor};
            "></div>
          </div>
        `,
        iconSize: [0, 0],
      });

      const labelMarker = L.marker([spot.lat, spot.lng], { icon: labelIcon });
      labelMarker.on('click', () => {
        setSelectedHotspotId(spot.id);
        map.flyTo([spot.lat, spot.lng], 16, { duration: 0.8 });
      });

      heatGroup.addLayer(outerCircle);
      heatGroup.addLayer(midCircle);
      heatGroup.addLayer(coreCircle);
      heatGroup.addLayer(labelMarker);
    });

    // Auto fit bounds on initial load or member change if valid
    if (bounds.isValid() && visibleHotspots.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [visibleHotspots, radiusScale, selectedHotspotId]);

  // Fly to hotspot when clicked in ranking
  const handleFocusHotspot = (spot: HeatmapHotspot) => {
    setSelectedHotspotId(spot.id);
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([spot.lat, spot.lng], 16, { duration: 1.0 });
    }
  };

  // Reset View to fit all hotspots
  const handleFitAll = () => {
    const map = mapInstanceRef.current;
    if (!map || visibleHotspots.length === 0) return;
    const bounds = L.latLngBounds(visibleHotspots.map(s => [s.lat, s.lng]));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      setSelectedHotspotId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Overview Analytics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-slate-500 block">Tempo Total em Locais</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-slate-900 font-mono tabular-nums">
              {formatMinutesHuman(totalDwellMinutes)}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Paradas contabilizadas</span>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-amber-700 block">Foco Principal (#1)</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-amber-900 truncate block">
              {topSpot ? topSpot.name.split(' ')[0] : 'Nenhum'}
            </span>
          </div>
          <span className="text-[10px] text-amber-600 font-mono mt-0.5 block truncate">
            {topSpot ? `${formatMinutesHuman(topSpot.totalMinutes)} (${topSpot.percentOfDay}% do dia)` : '—'}
          </span>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-emerald-700 block">Zonas Protegidas</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-emerald-900 font-mono tabular-nums">
              {safeZonePercentage}%
            </span>
            <span className="text-[11px] text-emerald-700">do tempo</span>
          </div>
          <span className="text-[10px] text-emerald-600 mt-0.5 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            100% monitorado
          </span>
        </div>

        <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3">
          <span className="text-[11px] font-medium text-indigo-700 block">Áreas com Foco</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-extrabold text-indigo-900 font-mono tabular-nums">
              {visibleHotspots.length}
            </span>
            <span className="text-[11px] text-indigo-700">hotspots</span>
          </div>
          <span className="text-[10px] text-indigo-600 mt-0.5 block">
            Raio base: {radiusScale}m
          </span>
        </div>
      </div>

      {/* Interactive Heatmap Map Canvas Container */}
      <div className="relative w-full h-[400px] sm:h-[460px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
        {/* Map Leaflet Canvas */}
        <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

        {/* Top Control Bar on Map */}
        <div className="absolute top-3 left-3 right-14 z-20 flex flex-wrap items-center gap-1.5 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md border border-slate-700/80 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Mapa de Calor de Permanência</span>
            <span className="text-[10px] text-slate-400">· {visibleHotspots.length} áreas</span>
          </div>

          {/* Quick Filter: Minimum Duration */}
          <div className="pointer-events-auto flex items-center bg-white/95 backdrop-blur-sm p-0.5 rounded-xl border border-slate-200/90 shadow-sm text-xs">
            <button
              onClick={() => setMinDwellFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                minDwellFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setMinDwellFilter('30m')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                minDwellFilter === '30m'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              &gt; 30m
            </button>
            <button
              onClick={() => setMinDwellFilter('60m')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                minDwellFilter === '60m'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              &gt; 1h (Focos)
            </button>
          </div>
        </div>

        {/* Floating Top Right Buttons */}
        <div className="absolute top-3 right-3 z-20 flex flex-col gap-1.5">
          {/* Map style toggle */}
          <button
            onClick={() => setMapStyle(prev => prev === 'streets' ? 'satellite' : 'streets')}
            className="w-9 h-9 bg-white/95 backdrop-blur-sm text-slate-700 rounded-xl shadow-md border border-slate-200/90 flex items-center justify-center transition-colors active:scale-95"
            title="Alternar satélite ou ruas"
            aria-label="Alternar satélite ou ruas"
          >
            <Layers className="w-4 h-4 text-slate-600" />
          </button>

          {/* Fit all hotspots */}
          <button
            onClick={handleFitAll}
            className="w-9 h-9 bg-white/95 backdrop-blur-sm text-slate-700 rounded-xl shadow-md border border-slate-200/90 flex items-center justify-center transition-colors active:scale-95"
            title="Enquadrar todas as áreas visitadas"
            aria-label="Enquadrar todas as áreas visitadas"
          >
            <Maximize2 className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* Heatmap Legend Bar - Bottom Left Overlay */}
        <div className="absolute bottom-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/90 shadow-md flex items-center gap-3 text-[11px]">
          <span className="font-bold text-slate-800 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-500" /> Intensidade:
          </span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block shadow-xs"></span>
            <span>&gt; 3h</span>
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block shadow-xs ml-1"></span>
            <span>1h-3h</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shadow-xs ml-1"></span>
            <span>30m-1h</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block shadow-xs ml-1"></span>
            <span>&lt; 30m</span>
          </div>
        </div>

        {/* Radius Sensitivity Slider - Bottom Right Overlay */}
        <div className="hidden sm:flex absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200/90 shadow-md items-center gap-2 text-xs">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[11px] text-slate-600 font-medium">Raio térmico:</span>
          <input
            type="range"
            min="120"
            max="380"
            step="20"
            value={radiusScale}
            onChange={(e) => setRadiusScale(Number(e.target.value))}
            className="w-20 accent-indigo-600 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
          />
          <span className="text-[10px] font-mono font-bold text-slate-700">{radiusScale}m</span>
        </div>
      </div>

      {/* Selected Hotspot Inspection Card (if one is clicked) */}
      {selectedHotspot && (
        <div className="bg-gradient-to-r from-orange-50/80 via-white to-amber-50/80 border border-orange-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-orange-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                #{allHotspots.findIndex(s => s.id === selectedHotspot.id) + 1}
              </span>
              <h4 className="font-bold text-slate-900 text-sm">{selectedHotspot.name}</h4>
              <span className="text-[11px] font-mono font-bold text-orange-700 bg-orange-100/80 border border-orange-200 px-2 py-0.5 rounded-md">
                {formatMinutesHuman(selectedHotspot.totalMinutes)} ({selectedHotspot.percentOfDay}% do dia)
              </span>
            </div>
            <p className="text-xs text-slate-600 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>{selectedHotspot.address}</span>
            </p>
            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Horários registrados: {selectedHotspot.timeWindows.join(', ')}</span>
              {selectedHotspot.zoneId && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Zona Segura Vinculada
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onGoToLiveMapWithPoint && (
              <button
                onClick={() => onGoToLiveMapWithPoint(selectedHotspot.lat, selectedHotspot.lng)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Ver no Mapa ao Vivo</span>
              </button>
            )}
            <button
              onClick={() => setSelectedHotspotId(null)}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard / Ranking Section: Áreas de Maior Permanência */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            <h4 className="text-sm font-bold text-slate-900">
              Ranking de Permanência: Onde {currentMember.name.split(' ')[0]} Mais Passou Tempo
            </h4>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {allHotspots.length} locais mapeados
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          {allHotspots.map((spot, index) => {
            const isSelected = selectedHotspotId === spot.id;
            const rank = index + 1;

            let intensityTag = {
              text: 'Parada Curta',
              color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
              barColor: 'bg-emerald-500',
            };

            if (spot.intensityLevel === 'critical') {
              intensityTag = {
                text: 'Foco Máximo (>3h)',
                color: 'text-red-700 bg-red-50 border-red-200',
                barColor: 'bg-red-600',
              };
            } else if (spot.intensityLevel === 'high') {
              intensityTag = {
                text: 'Alta Permanência (1h-3h)',
                color: 'text-orange-700 bg-orange-50 border-orange-200',
                barColor: 'bg-orange-500',
              };
            } else if (spot.intensityLevel === 'medium') {
              intensityTag = {
                text: 'Média Permanência (30m-1h)',
                color: 'text-amber-700 bg-amber-50 border-amber-200',
                barColor: 'bg-amber-400',
              };
            }

            return (
              <div
                key={spot.id}
                onClick={() => handleFocusHotspot(spot)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50/40 shadow-xs'
                    : 'border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      rank === 1
                        ? 'bg-red-600 text-white shadow-xs'
                        : rank === 2
                        ? 'bg-orange-500 text-white'
                        : rank === 3
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {rank}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{spot.name}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${intensityTag.color}`}>
                          {intensityTag.text}
                        </span>
                        {spot.zoneId && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            Zona Segura
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{spot.address}</p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-extrabold font-mono text-slate-900 text-sm block">
                      {formatMinutesHuman(spot.totalMinutes)}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {spot.percentOfDay}% do dia
                    </span>
                  </div>
                </div>

                {/* Relative Duration Progress Bar */}
                <div className="mt-2.5 space-y-1">
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${intensityTag.barColor}`}
                      style={{ width: `${Math.max(6, spot.percentOfDay)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>{spot.visitCount > 1 ? `${spot.visitCount} visitas no mesmo local` : '1 parada única'}</span>
                    <span className="text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
                      Localizar no mapa <ChevronRight className="w-3 h-3 inline" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
