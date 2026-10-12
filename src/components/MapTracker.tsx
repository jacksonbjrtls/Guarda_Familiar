import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { FamilyMember, SafeZone, Coordinates } from '../types';
import { 
  Navigation2, 
  MapPin, 
  Volume2, 
  Layers, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  ShieldCheck,
  Compass
} from 'lucide-react';
import { playNotificationChime } from '../utils/audio';

interface MapTrackerProps {
  currentMember: FamilyMember;
  onLocationUpdate?: (newCoords: Coordinates, address: string, speedKmH: number) => void;
  onTriggerSoundAlert: () => void;
  onAddNewSafeZoneAtLocation?: (lat: number, lng: number) => void;
  selectedHistoryIndex?: number | null;
  showFullDayRoute?: boolean;
}

export const MapTracker: React.FC<MapTrackerProps> = ({
  currentMember,
  onLocationUpdate,
  onTriggerSoundAlert,
  onAddNewSafeZoneAtLocation,
  selectedHistoryIndex,
  showFullDayRoute = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const zonesLayerRef = useRef<L.LayerGroup | null>(null);
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const historyMarkersLayerRef = useRef<L.LayerGroup | null>(null);

  const [mapStyle, setMapStyle] = useState<'streets' | 'satellite'>('streets');
  const [isSimulatingMove, setIsSimulatingMove] = useState(false);
  const simulationStepRef = useRef(0);
  const simulationIntervalRef = useRef<number | null>(null);
  const [isAddingZoneMode, setIsAddingZoneMode] = useState(false);

  // Simulation waypoint path from School back to Home via Paulista and Rebouças
  const simulationPath = [
    { lat: -23.5614, lng: -46.6622, address: 'Alameda Jaú, 1120 (Na Escola)', speed: 0 },
    { lat: -23.5628, lng: -46.6645, address: 'Alameda Santos x R. Augusta', speed: 18 },
    { lat: -23.5642, lng: -46.6680, address: 'Av. Paulista próx. R. Haddock Lobo', speed: 28 },
    { lat: -23.5658, lng: -46.6730, address: 'Descendo a R. Bela Cintra', speed: 25 },
    { lat: -23.5665, lng: -46.6785, address: 'Rua dos Pinheiros x Fradique Coutinho', speed: 15 },
    { lat: -23.5678, lng: -46.6854, address: 'Rua dos Pinheiros, 450 (Chegando em Casa)', speed: 0 },
  ];

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [currentMember.currentLocation.lat, currentMember.currentLocation.lng],
        zoom: 15,
        zoomControl: false,
      });

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Tile layers
      const streetLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
        maxZoom: 19,
      });

      streetLayer.addTo(map);

      // Click event for adding safe zone
      map.on('click', (e: L.LeafletMouseEvent) => {
        if (isAddingZoneMode && onAddNewSafeZoneAtLocation) {
          onAddNewSafeZoneAtLocation(e.latlng.lat, e.latlng.lng);
          setIsAddingZoneMode(false);
        }
      });

      mapInstanceRef.current = map;
      zonesLayerRef.current = L.layerGroup().addTo(map);
      historyMarkersLayerRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      // Map remains mounted during lifecycle
    };
  }, []);

  // Update Tile Style
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
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri World Imagery',
        maxZoom: 19,
      }).addTo(map);
    }
  }, [mapStyle]);

  // Update Child Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const lat = currentMember.currentLocation.lat;
    const lng = currentMember.currentLocation.lng;

    // Custom pulse HTML Icon
    const customIcon = L.divIcon({
      className: 'custom-child-marker-container',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(99, 102, 241, 0.25); animation: childPulse 2s infinite ease-out;"></div>
          <div style="position: absolute; width: 34px; height: 34px; border-radius: 9999px; background: #ffffff; box-shadow: 0 4px 10px rgba(0,0,0,0.18); display: flex; align-items: center; justify-content: center; border: 2.5px solid #4f46e5; z-index: 10;">
            <span style="font-size: 13px; font-weight: 700; color: #4f46e5;">${currentMember.avatarInitials}</span>
          </div>
          <div style="position: absolute; bottom: -8px; background: #0f172a; color: #ffffff; font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 9999px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2); z-index: 20;">
            ${currentMember.device.batteryLevel}% bat
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
    });

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(customIcon);
    } else {
      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <p style="font-weight: 700; margin: 0 0 2px; color: #0f172a;">${currentMember.name}</p>
          <p style="color: #64748b; margin: 0 0 4px; font-size: 11px;">${currentMember.currentLocation.address}</p>
          <div style="display: flex; gap: 8px; font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px;">
            <span>🔋 ${currentMember.device.batteryLevel}%</span>
            <span>📡 ${currentMember.device.networkType}</span>
            <span>⚡ ${currentMember.currentLocation.speedKmH} km/h</span>
          </div>
        </div>
      `);
      markerRef.current = marker;
    }
  }, [currentMember.currentLocation, currentMember.device.batteryLevel, currentMember.name, currentMember.avatarInitials]);

  // Update Safe Zones overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    const zonesLayer = zonesLayerRef.current;
    if (!map || !zonesLayer) return;

    zonesLayer.clearLayers();

    currentMember.safeZones.forEach((zone: SafeZone) => {
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radiusMeters,
        color: zone.color,
        fillColor: zone.color,
        fillOpacity: 0.12,
        weight: 2,
        dashArray: '4, 6',
      });

      const centerMarkerIcon = L.divIcon({
        className: 'zone-center-label',
        html: `
          <div style="display: flex; align-items: center; gap: 4px; background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 9999px; box-shadow: 0 2px 6px rgba(0,0,0,0.08); font-size: 11px; font-weight: 600; color: #334155; transform: translate(-50%, -50%);">
            <span style="display: inline-block; width: 6px; height: 6px; border-radius: 9999px; background: ${zone.color};"></span>
            <span>${zone.name}</span>
          </div>
        `,
        iconSize: [0, 0],
      });

      const labelMarker = L.marker([zone.lat, zone.lng], { icon: centerMarkerIcon });

      circle.bindTooltip(`
        <strong>${zone.name}</strong><br/>
        Raio de segurança: ${zone.radiusMeters}m<br/>
        ${zone.address}
      `);

      zonesLayer.addLayer(circle);
      zonesLayer.addLayer(labelMarker);
    });
  }, [currentMember.safeZones]);

  // Route & History Overlay
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routePolylineRef.current) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }

    if (historyMarkersLayerRef.current) {
      historyMarkersLayerRef.current.clearLayers();
    }

    if (showFullDayRoute && currentMember.history.length > 1) {
      const latlngs: [number, number][] = currentMember.history.map(h => [h.lat, h.lng]);
      
      const polyline = L.polyline(latlngs, {
        color: '#4f46e5',
        weight: 4,
        opacity: 0.75,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '1, 8',
      }).addTo(map);

      routePolylineRef.current = polyline;

      // Add pins for key stops
      currentMember.history.forEach((point, idx) => {
        const stopIcon = L.divIcon({
          className: 'history-pin',
          html: `
            <div style="width: 22px; height: 22px; border-radius: 9999px; background: #0f172a; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);">
              ${idx + 1}
            </div>
          `,
          iconSize: [0, 0],
        });

        const stopMarker = L.marker([point.lat, point.lng], { icon: stopIcon });
        stopMarker.bindTooltip(`<strong>${point.title}</strong><br/>${point.time}<br/>${point.address}`);
        historyMarkersLayerRef.current?.addLayer(stopMarker);
      });
    }
  }, [showFullDayRoute, currentMember.history]);

  // Center on selected history index if specified
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && selectedHistoryIndex !== null && selectedHistoryIndex !== undefined && currentMember.history[selectedHistoryIndex]) {
      const selected = currentMember.history[selectedHistoryIndex];
      map.flyTo([selected.lat, selected.lng], 16, { duration: 1 });
    }
  }, [selectedHistoryIndex, currentMember.history]);

  // Center on current child location
  const handleCenterOnChild = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.flyTo([currentMember.currentLocation.lat, currentMember.currentLocation.lng], 16, {
        duration: 1.2,
      });
    }
  };

  // Movement Simulation Handler
  const toggleSimulation = () => {
    if (isSimulatingMove) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      setIsSimulatingMove(false);
    } else {
      setIsSimulatingMove(true);
      playNotificationChime();

      simulationIntervalRef.current = window.setInterval(() => {
        simulationStepRef.current = (simulationStepRef.current + 1) % simulationPath.length;
        const nextPoint = simulationPath[simulationStepRef.current];

        if (onLocationUpdate) {
          onLocationUpdate({ lat: nextPoint.lat, lng: nextPoint.lng }, nextPoint.address, nextPoint.speed);
        }

        const map = mapInstanceRef.current;
        if (map) {
          map.panTo([nextPoint.lat, nextPoint.lng], { animate: true, duration: 1.5 });
        }
      }, 3500);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="relative w-full h-[52vh] min-h-[380px] max-h-[560px] rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100 flex flex-col">
      {/* Map Viewport Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* Adding Safe Zone banner indicator */}
      {isAddingZoneMode && (
        <div className="absolute top-3 left-3 right-3 z-20 bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-semibold shadow-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            <MapPin className="w-4 h-4 shrink-0" />
            <span className="truncate">Toque no mapa para marcar a zona</span>
          </div>
          <button 
            onClick={() => setIsAddingZoneMode(false)}
            className="bg-indigo-800 hover:bg-indigo-900 px-2 py-1 rounded-lg text-[10px] shrink-0"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Floating Control Strip - Top Right (Mobile Touch >= 44px) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        {/* Style Switcher */}
        <button
          onClick={() => setMapStyle(prev => prev === 'streets' ? 'satellite' : 'streets')}
          className="w-10 h-10 bg-white/95 backdrop-blur-sm text-slate-700 rounded-xl shadow-md border border-slate-200/90 flex items-center justify-center transition-colors active:scale-95"
          title="Alternar satélite ou ruas"
          aria-label="Alternar camada do mapa"
        >
          <Layers className="w-4 h-4 text-slate-600" />
        </button>

        {/* Center Button */}
        <button
          onClick={handleCenterOnChild}
          className="w-10 h-10 bg-white/95 backdrop-blur-sm text-indigo-600 rounded-xl shadow-md border border-slate-200/90 flex items-center justify-center transition-colors active:scale-95"
          title="Centralizar no filho"
          aria-label="Centralizar no filho"
        >
          <Compass className="w-5 h-5 text-indigo-600" />
        </button>

        {/* Ring Child Device Alarm Button */}
        <button
          onClick={onTriggerSoundAlert}
          className="w-10 h-10 bg-amber-50 text-amber-700 rounded-xl shadow-md border border-amber-300 flex items-center justify-center transition-colors active:scale-95"
          title="Emitir alarme de alta intensidade"
          aria-label="Emitir alarme sonoro remoto"
        >
          <Volume2 className="w-5 h-5 text-amber-600" />
        </button>
      </div>

      {/* Bottom Floating Status Card (Mobile optimized) */}
      <div className="absolute bottom-3 left-3 right-3 z-10 bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200/90 shadow-md flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0 font-bold text-xs">
              {currentMember.avatarInitials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-xs truncate">{currentMember.name}</span>
                <span className="text-[11px] text-slate-500 font-normal">· {currentMember.device.batteryLevel}% bat</span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">{currentMember.currentLocation.address}</p>
            </div>
          </div>
        </div>

        {/* Action Buttons Strip */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
          <button
            onClick={toggleSimulation}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[40px] ${
              isSimulatingMove 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-indigo-600 text-white shadow-xs active:bg-indigo-700'
            }`}
          >
            {isSimulatingMove ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar Simulação</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Simular Deslocamento</span>
              </>
            )}
          </button>

          {onAddNewSafeZoneAtLocation && (
            <button
              onClick={() => setIsAddingZoneMode(!isAddingZoneMode)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-1 min-h-[40px] shrink-0 ${
                isAddingZoneMode 
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Zona</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
