import { GlobeScene } from './graphics/globe-scene';
import { MercatorRenderer } from './map2d/mercator-renderer';
import { fetchWorldFeatures } from './core/topojson-loader';
import { MarkerPanel } from './ui/marker-panel';
import { PRESET_LOCATIONS } from './ui/preset-locations';
import { MarkerData, LatLng } from './types/geo';
import { calculateAntipode } from './core/geo-math';

/* ========================================================================== */
/*                             APPLICATION MAIN                               */
/* ========================================================================== */

class App {
  private globeScene: GlobeScene;
  private mercatorRenderer: MercatorRenderer;
  private markerPanel: MarkerPanel;

  private markers: MarkerData[] = [];
  private markerCounter: number = 0;

  constructor() {
    const globeContainer = document.getElementById('globe-container')!;
    const mercatorCanvas = document.getElementById('merc-canvas') as HTMLCanvasElement;
    const panelContainer = document.getElementById('marker-panel-container')!;

    this.globeScene = new GlobeScene(globeContainer);
    this.mercatorRenderer = new MercatorRenderer(mercatorCanvas);

    this.markerPanel = new MarkerPanel(panelContainer, {
      onRemoveMarker: (id) => this.removeMarker(id),
      onDrawGreatCircle: (marker) => this.drawGreatCircle(marker),
      onDrawLatitudeCircle: (marker) => this.drawLatitudeCircle(marker),
      onToggleDiameterLine: (id) => this.toggleDiameterLine(id),
      onHeadingChange: (id, heading) => this.updateHeading(id, heading)
    });

    this.initPresetDropdown();
    this.initHeaderControls();

    this.globeScene.setOnDoubleTap((coords) => this.addMarker(coords));
    this.globeScene.setOnMercatorRedraw(() => this.mercatorRenderer.redraw());

    this.loadTopology();
    this.checkUrlParams();
  }

  private async loadTopology(): Promise<void> {
    const features = await fetchWorldFeatures();
    this.globeScene.updateTopologyFeatures(features);
    this.mercatorRenderer.setFeatures(features);
  }

  private checkUrlParams(): void {
    const params = new URLSearchParams(window.location.search);
    const lat = params.get('lat');
    const lng = params.get('lng');
    if (lat !== null && lng !== null) {
      const latNum = parseFloat(lat);
      const lngNum = parseFloat(lng);
      if (!isNaN(latNum) && !isNaN(lngNum)) {
        setTimeout(() => {
          this.globeScene.flyTo(latNum, lngNum);
          this.addMarker({ lat: latNum, lng: lngNum }, 'Teleported Location');
        }, 500);
      }
    }
  }

  private addMarker(coords: LatLng, name?: string): void {
    this.markerCounter++;
    const antipode = calculateAntipode(coords.lat, coords.lng);
    const newMarker: MarkerData = {
      id: `marker-${Date.now()}-${this.markerCounter}`,
      name: name || `Marker ${this.markerCounter}`,
      lat: coords.lat,
      lng: coords.lng,
      antipode,
      headingDeg: 90,
      showDiameterLine: false
    };

    this.markers.push(newMarker);
    this.syncState();
  }

  private removeMarker(id: string): void {
    this.markers = this.markers.filter((m) => m.id !== id);
    this.syncState();
  }

  private drawGreatCircle(marker: MarkerData): void {
    this.globeScene.drawGreatCircle(marker);
  }

  private drawLatitudeCircle(marker: MarkerData): void {
    this.globeScene.drawLatitudeCircle(marker);
  }

  private toggleDiameterLine(id: string): void {
    const marker = this.markers.find((m) => m.id === id);
    if (marker) {
      marker.showDiameterLine = !marker.showDiameterLine;
      this.syncState();
    }
  }

  private updateHeading(id: string, heading: number): void {
    const marker = this.markers.find((m) => m.id === id);
    if (marker) {
      marker.headingDeg = heading;
    }
  }

  private syncState(): void {
    this.globeScene.syncMarkers(this.markers);
    this.mercatorRenderer.setMarkers(this.markers);
    this.markerPanel.render(this.markers);
  }

  private initPresetDropdown(): void {
    const select = document.getElementById('select-preset') as HTMLSelectElement;
    if (!select) return;

    PRESET_LOCATIONS.forEach((loc) => {
      const opt = document.createElement('option');
      opt.value = `${loc.lat},${loc.lng}`;
      opt.textContent = `${loc.name}, ${loc.country}`;
      select.appendChild(opt);
    });

    select.addEventListener('change', () => {
      if (!select.value) return;
      const [lat, lng] = select.value.split(',').map(Number);
      const loc = PRESET_LOCATIONS.find((p) => p.lat === lat && p.lng === lng);
      this.globeScene.flyTo(lat, lng);
      this.addMarker({ lat, lng }, loc?.name);
      select.value = '';
    });
  }

  private initHeaderControls(): void {
    const btnTrans = document.getElementById('btn-transparency')!;
    btnTrans.addEventListener('click', () => {
      const active = this.globeScene.toggleTransparency();
      btnTrans.textContent = active ? 'Transparency: ON' : 'Transparency: OFF';
      btnTrans.classList.toggle('active', active);
    });

    const btnClear = document.getElementById('btn-clear-all')!;
    btnClear.addEventListener('click', () => {
      this.markers = [];
      this.syncState();
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});
