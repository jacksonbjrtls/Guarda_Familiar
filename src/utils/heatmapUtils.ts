import { LocationHistoryPoint } from '../types';

export interface HeatmapHotspot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  totalMinutes: number;
  visitCount: number;
  timeWindows: string[];
  zoneId?: string;
  intensityLevel: 'critical' | 'high' | 'medium' | 'low';
  percentOfDay: number;
}

// Distance between two coordinates in meters (Haversine)
export function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Aggregates location history points into spatial heat clusters.
 * Groups points within 150m together to compute cumulative dwell time.
 */
export function aggregateHeatmapHotspots(
  history: LocationHistoryPoint[],
  clusterRadiusMeters = 150
): HeatmapHotspot[] {
  const stayPoints = history.filter(p => p.type === 'stay' || p.durationMinutes > 0);
  if (stayPoints.length === 0) return [];

  const clusters: Array<{
    points: LocationHistoryPoint[];
    centerLat: number;
    centerLng: number;
  }> = [];

  for (const point of stayPoints) {
    let matchedCluster = clusters.find(
      c => getDistanceMeters(point.lat, point.lng, c.centerLat, c.centerLng) <= clusterRadiusMeters
    );

    if (matchedCluster) {
      matchedCluster.points.push(point);
      // Recalculate center weighted
      matchedCluster.centerLat =
        matchedCluster.points.reduce((s, p) => s + p.lat, 0) / matchedCluster.points.length;
      matchedCluster.centerLng =
        matchedCluster.points.reduce((s, p) => s + p.lng, 0) / matchedCluster.points.length;
    } else {
      clusters.push({
        points: [point],
        centerLat: point.lat,
        centerLng: point.lng,
      });
    }
  }

  const totalDwellMinutes = stayPoints.reduce((sum, p) => sum + (p.durationMinutes || 0), 0) || 1;

  const hotspots: HeatmapHotspot[] = clusters.map((cluster, index) => {
    const totalMinutes = cluster.points.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
    const primaryPoint = cluster.points.reduce((prev, current) => 
      (prev.durationMinutes || 0) > (current.durationMinutes || 0) ? prev : current
    );

    let intensityLevel: 'critical' | 'high' | 'medium' | 'low';
    if (totalMinutes >= 180) {
      intensityLevel = 'critical'; // >= 3h (Escola, Casa)
    } else if (totalMinutes >= 90) {
      intensityLevel = 'high';     // 1.5h - 3h
    } else if (totalMinutes >= 35) {
      intensityLevel = 'medium';   // 35m - 90m
    } else {
      intensityLevel = 'low';      // < 35m
    }

    const percentOfDay = Math.min(100, Math.round((totalMinutes / totalDwellMinutes) * 100));

    return {
      id: `hotspot-${index}-${primaryPoint.id}`,
      name: primaryPoint.title,
      address: primaryPoint.address,
      lat: cluster.centerLat,
      lng: cluster.centerLng,
      totalMinutes,
      visitCount: cluster.points.length,
      timeWindows: cluster.points.map(p => p.time),
      zoneId: primaryPoint.zoneId,
      intensityLevel,
      percentOfDay,
    };
  });

  // Sort by highest dwell time first
  return hotspots.sort((a, b) => b.totalMinutes - a.totalMinutes);
}

export function formatMinutesHuman(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
}
