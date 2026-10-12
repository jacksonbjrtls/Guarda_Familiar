// Geolocation utilities with reverse geocoding and device location support

export interface GeocodedAddress {
  formattedAddress: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
}

// In-memory cache to prevent spamming reverse geocode requests
const geocodeCache = new Map<string, string>();

/**
 * Reverse geocode latitude and longitude into human-readable street address using OpenStreetMap Nominatim
 */
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string> {
  // Round to ~10 meters for caching key
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    // Note: Do NOT set 'User-Agent' header in browser fetch as it is a forbidden header in Fetch API
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const addr = data.address;
        const street = addr.road || addr.street || addr.pedestrian || addr.footway || addr.path;
        const houseNumber = addr.house_number ? `, nº ${addr.house_number}` : '';
        const suburb = addr.suburb || addr.neighbourhood || addr.district || addr.quarter;
        const city = addr.city || addr.town || addr.municipality || addr.village || addr.county;

        const mainParts: string[] = [];
        if (street) {
          mainParts.push(`${street}${houseNumber}`);
        }
        if (suburb && (!street || suburb !== street)) {
          mainParts.push(suburb);
        }
        if (city) {
          mainParts.push(city);
        }

        if (mainParts.length > 0) {
          const formatted = mainParts.join(' - ');
          geocodeCache.set(cacheKey, formatted);
          return formatted;
        }
      }

      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        const formatted = parts.slice(0, 3).join(', ');
        geocodeCache.set(cacheKey, formatted);
        return formatted;
      }
    }
  } catch (err) {
    // Fail silently with formatted coordinates
  }

  // Graceful fallback with formatted coordinates
  const latStr = lat >= 0 ? `${lat.toFixed(4)}°N` : `${Math.abs(lat).toFixed(4)}°S`;
  const lngStr = lng >= 0 ? `${lng.toFixed(4)}°E` : `${Math.abs(lng).toFixed(4)}°O`;
  const fallback = `Localização GPS (${latStr}, ${lngStr})`;
  geocodeCache.set(cacheKey, fallback);
  return fallback;
}
