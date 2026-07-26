/* ========================================================================== */
/*                              GEOGRAPHIC TYPES                              */
/* ========================================================================== */

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MercatorGcPth {
  pts: LatLng[];
  color: string;
}

export interface MarkerData {
  id: string;
  name?: string;
  lat: number;
  lng: number;
  antipode: LatLng;
  headingDeg: number;
  showDiameterLine: boolean;
  mercLatPts?: LatLng[] | null;
  mercGcPts?: MercatorGcPth[];
}

export interface PresetLocation {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

export interface GeoFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: any[];
  };
  properties?: Record<string, any>;
}
