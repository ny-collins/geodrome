import * as topojson from 'topojson-client';
import { GeoFeature } from '../types/geo';

/* ========================================================================== */
/*                              TOPOJSON LOADER                               */
/* ========================================================================== */

// WARNING: Fetch failure falls back to empty feature set to prevent crash offline.
const WORLD_ATLAS_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

let cachedFeatures: GeoFeature[] | null = null;

export async function fetchWorldFeatures(): Promise<GeoFeature[]> {
  if (cachedFeatures) return cachedFeatures;

  try {
    const res = await fetch(WORLD_ATLAS_URL);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const featureCollection = topojson.feature(data, data.objects.countries) as any;
    cachedFeatures = featureCollection.features as GeoFeature[];
    return cachedFeatures;
  } catch (err) {
    console.error('Failed to load world topology:', err);
    return [];
  }
}
