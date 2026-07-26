import { MarkerData } from '../types/geo';

/* ========================================================================== */
/*                             MARKER UI PANEL                                */
/* ========================================================================== */

const WORDS = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];

function fmtR(v: number, posChar: string, negChar: string): string {
  return v >= 0 ? `${Math.round(v)}${posChar}` : `${Math.round(-v)}${negChar}`;
}

export class MarkerPanel {
  private container: HTMLElement;
  private onRemoveMarker: (id: string) => void;
  private onDrawGreatCircle: (marker: MarkerData) => void;
  private onDrawLatitudeCircle: (marker: MarkerData) => void;
  private onToggleDiameterLine: (id: string) => void;
  private onHeadingChange: (id: string, heading: number) => void;

  constructor(
    container: HTMLElement,
    callbacks: {
      onRemoveMarker: (id: string) => void;
      onDrawGreatCircle: (marker: MarkerData) => void;
      onDrawLatitudeCircle: (marker: MarkerData) => void;
      onToggleDiameterLine: (id: string) => void;
      onHeadingChange: (id: string, heading: number) => void;
    }
  ) {
    this.container = container;
    this.onRemoveMarker = callbacks.onRemoveMarker;
    this.onDrawGreatCircle = callbacks.onDrawGreatCircle;
    this.onDrawLatitudeCircle = callbacks.onDrawLatitudeCircle;
    this.onToggleDiameterLine = callbacks.onToggleDiameterLine;
    this.onHeadingChange = callbacks.onHeadingChange;
  }

  public render(markers: MarkerData[]): void {
    if (markers.length === 0) {
      this.container.style.display = 'none';
      this.container.innerHTML = '';
      return;
    }

    this.container.style.display = 'block';

    const html = markers.map((m, i) => {
      const word = i < WORDS.length ? WORDS[i] : `${i + 1}`;

      return `
        <div class="marker-row" data-id="${m.id}">
          <div class="marker-dot"></div>
          <div class="marker-info">
            <b>Marker ${word}</b> &nbsp;${fmtR(m.lat, '°N', '°S')}&nbsp;${fmtR(m.lng, '°E', '°W')}
            <button class="btn-copy-coord" data-coords="${m.lat.toFixed(4)},${m.lng.toFixed(4)}" title="Copy exact coordinates">Copy</button>
            <br>
            <span class="antipode-text">Antipode &nbsp;${fmtR(m.antipode.lat, '°N', '°S')}&nbsp;${fmtR(m.antipode.lng, '°E', '°W')}</span>
          </div>

          <div class="marker-controls">
            <div class="control-subgroup">
              <span class="heading-label">Select Great Circle Heading</span>
              <select id="gc-hdg-${i}" class="select-heading" data-id="${m.id}">
                <option value="0" ${m.headingDeg === 0 ? 'selected' : ''}>0° N</option>
                <option value="45" ${m.headingDeg === 45 ? 'selected' : ''}>45° NE</option>
                <option value="90" ${m.headingDeg === 90 ? 'selected' : ''}>90° E</option>
                <option value="135" ${m.headingDeg === 135 ? 'selected' : ''}>135° SE</option>
                <option value="180" ${m.headingDeg === 180 ? 'selected' : ''}>180° S</option>
                <option value="225" ${m.headingDeg === 225 ? 'selected' : ''}>225° SW</option>
                <option value="270" ${m.headingDeg === 270 ? 'selected' : ''}>270° W</option>
                <option value="315" ${m.headingDeg === 315 ? 'selected' : ''}>315° NW</option>
              </select>
              <button class="globe-btn btn-great-circle" data-id="${m.id}">Draw Great Circle</button>
            </div>

            <div class="control-subgroup">
              <button class="globe-btn btn-lat-circle" data-id="${m.id}">Draw Latitude Circle</button>
              <button class="globe-btn btn-diameter ${m.showDiameterLine ? 'active' : ''}" data-id="${m.id}">
                Diameter Line to Antipode
              </button>
              <button class="globe-btn btn-remove" data-id="${m.id}">Remove</button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    this.container.innerHTML = html;
    this.attachEventListeners(markers);
  }

  private attachEventListeners(markers: MarkerData[]): void {
    this.container.querySelectorAll('.btn-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.onRemoveMarker(id);
      });
    });

    this.container.querySelectorAll('.btn-copy-coord').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const coords = target.getAttribute('data-coords');
        if (coords) {
          navigator.clipboard.writeText(coords);
          const origText = target.textContent;
          target.textContent = 'Copied!';
          setTimeout(() => { target.textContent = origText; }, 1500);
        }
      });
    });

    this.container.querySelectorAll('.select-heading').forEach((select) => {
      select.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        const id = target.getAttribute('data-id');
        if (id) this.onHeadingChange(id, parseFloat(target.value));
      });
    });

    this.container.querySelectorAll('.btn-great-circle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const marker = markers.find((m) => m.id === id);
        if (marker) this.onDrawGreatCircle(marker);
      });
    });

    this.container.querySelectorAll('.btn-lat-circle').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const marker = markers.find((m) => m.id === id);
        if (marker) this.onDrawLatitudeCircle(marker);
      });
    });

    this.container.querySelectorAll('.btn-diameter').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-id');
        if (id) this.onToggleDiameterLine(id);
      });
    });
  }
}
