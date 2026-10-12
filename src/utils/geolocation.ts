// Geolocation utilities with reverse geocoding and device location support

export interface GeocodedAddress {
  formattedAddress: string;
  road?: string;
  suburb?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Reverse geocode latitude and longitude into human-readable street address using OpenStreetMap Nominatim
 */
export async function reverseGeocodeCoordinates(lat: number, lng: number): Promise<string> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GuardiaoFamiliarApp/1.0',
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
        const state = addr.state_code || addr.state;

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
          return mainParts.join(' - ');
        }
      }

      if (data && data.display_name) {
        const parts = data.display_name.split(',').map((p: string) => p.trim());
        return parts.slice(0, 3).join(', ');
      }
    }
  } catch (err) {
    console.warn('Falha no reverse geocode Nominatim:', err);
  }

  // Graceful fallback with formatted coordinates
  const latStr = lat >= 0 ? `${lat.toFixed(5)}°N` : `${Math.abs(lat).toFixed(5)}°S`;
  const lngStr = lng >= 0 ? `${lng.toFixed(5)}°E` : `${Math.abs(lng).toFixed(5)}°O`;
  return `Localização GPS (${latStr}, ${lngStr})`;
}
