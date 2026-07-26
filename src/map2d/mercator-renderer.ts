import { LatLng, MarkerData, GeoFeature } from '../types/geo';

/* ========================================================================== */
/*                           2D MERCATOR CANVAS MAP                           */
/* ========================================================================== */

export class MercatorRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private features: GeoFeature[] = [];
  private markers: MarkerData[] = [];
  private latMax: number = 80;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  public setFeatures(features: GeoFeature[]): void {
    this.features = features;
    this.redraw();
  }

  public setMarkers(markers: MarkerData[]): void {
    this.markers = markers;
    this.redraw();
  }

  public resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;
    this.width = parent.clientWidth;
    this.height = parent.clientHeight || 420;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.redraw();
  }

  private lngToX(lng: number): number {
    const norm = ((lng + 180) % 360 + 360) % 360;
    return (norm / 360) * this.width;
  }

  private latToY(lat: number): number {
    return ((this.latMax - lat) / (this.latMax * 2)) * this.height;
  }

  /* ========================================================================== */
  /*                            LINE WRAPPING MATH                              */
  /* ========================================================================== */

  private drawMercLine(llPts: LatLng[], color: string, lw: number = 1.5): void {
    if (!llPts || llPts.length < 2) return;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lw;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();

    let started = false;
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < llPts.length; i++) {
      const p = llPts[i];
      const x = this.lngToX(p.lng);
      const y = this.latToY(p.lat);

      if (started && Math.abs(x - prevX) > this.width * 0.5) {
        let frac = (x < prevX)
          ? (this.width - prevX) / (x + this.width - prevX)
          : (0 - prevX + this.width) / (x - prevX + this.width);
        frac = Math.max(0, Math.min(1, frac));

        const edgeY = prevY + frac * (y - prevY);
        const exitX = prevX > this.width / 2 ? this.width : 0;
        const enterX = exitX === this.width ? 0 : this.width;

        this.ctx.lineTo(exitX, edgeY);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.moveTo(enterX, edgeY);
        started = true;
      }

      if (!started) {
        this.ctx.moveTo(x, y);
        started = true;
      } else {
        this.ctx.lineTo(x, y);
      }

      prevX = x;
      prevY = y;
    }
    this.ctx.stroke();
  }

  /* ========================================================================== */
  /*                             DRAWING PIPELINE                               */
  /* ========================================================================== */

  public redraw(): void {
    if (!this.width || !this.height) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.clearRect(0, 0, this.width, this.height);

    /* --- Background Ocean --- */
    this.ctx.fillStyle = '#c8dff0';
    this.ctx.fillRect(0, 0, this.width, this.height);

    /* --- Land Features & Borders --- */
    if (this.features.length) {
      this.drawFeaturesM('rgba(175, 215, 160, 1)', 'rgba(40, 40, 40, 0.8)', 0.8);
    }

    /* --- Grid Lines --- */
    this.ctx.strokeStyle = 'rgba(17, 17, 17, 0.25)';
    this.ctx.lineWidth = 0.6;
    [-80, -70, -60, -50, -40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80].forEach((lat) => {
      this.ctx.beginPath();
      this.ctx.moveTo(0, this.latToY(lat));
      this.ctx.lineTo(this.width, this.latToY(lat));
      this.ctx.stroke();
    });

    for (let glon = -180; glon <= 180; glon += 10) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.lngToX(glon), 0);
      this.ctx.lineTo(this.lngToX(glon), this.height);
      this.ctx.stroke();
    }

    /* --- Equator Line --- */
    this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.lineWidth = 1.4;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.latToY(0));
    this.ctx.lineTo(this.width, this.latToY(0));
    this.ctx.stroke();

    /* --- Animated Paths & Marker Dots --- */
    this.markers.forEach((m) => {
      if (m.mercLatPts) {
        this.drawMercLine(m.mercLatPts, '#0055cc', 1.8);
      }

      if (m.mercGcPts) {
        m.mercGcPts.forEach((gc) => {
          this.drawMercLine(gc.pts, gc.color, 2.0);
        });
      }

      /* Main Marker Dot */
      this.ctx.fillStyle = '#cc2200';
      this.ctx.beginPath();
      this.ctx.arc(this.lngToX(m.lng), this.latToY(m.lat), 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      /* Antipode Dot */
      this.ctx.fillStyle = '#0044cc';
      this.ctx.beginPath();
      this.ctx.arc(this.lngToX(m.antipode.lng), this.latToY(m.antipode.lat), 5, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  private drawFeaturesM(fs: string | null, ss: string | null, lw: number): void {
    if (fs) this.ctx.fillStyle = fs;
    if (ss) { this.ctx.strokeStyle = ss; this.ctx.lineWidth = lw; this.ctx.lineJoin = 'round'; }

    const splitRing = (coords: number[][]) => {
      if (!coords || coords.length < 2) return [];
      const paths: number[][][] = [[]];
      let prevLng = coords[0][0];
      paths[0].push(coords[0]);
      for (let i = 1; i < coords.length; i++) {
        if (Math.abs(coords[i][0] - prevLng) > 180) paths.push([]);
        paths[paths.length - 1].push(coords[i]);
        prevLng = coords[i][0];
      }
      return paths.filter((p) => p.length >= 2);
    };

    this.features.forEach((f) => {
      if (!f.geometry) return;
      const g = f.geometry;
      let polys: number[][][][] = [];
      if (g.type === 'Polygon') polys = [g.coordinates as number[][][]];
      else if (g.type === 'MultiPolygon') polys = g.coordinates as number[][][][];

      polys.forEach((rings) => {
        if (fs) {
          this.ctx.beginPath();
          rings.forEach((r) => {
            splitRing(r).forEach((sub) => {
              this.ctx.moveTo(this.lngToX(sub[0][0]), this.latToY(sub[0][1]));
              for (let i = 1; i < sub.length; i++) this.ctx.lineTo(this.lngToX(sub[i][0]), this.latToY(sub[i][1]));
              this.ctx.closePath();
            });
          });
          this.ctx.fill('evenodd');
        }

        if (ss) {
          rings.forEach((r) => {
            splitRing(r).forEach((sub) => {
              this.ctx.beginPath();
              this.ctx.moveTo(this.lngToX(sub[0][0]), this.latToY(sub[0][1]));
              for (let i = 1; i < sub.length; i++) this.ctx.lineTo(this.lngToX(sub[i][0]), this.latToY(sub[i][1]));
              this.ctx.stroke();
            });
          });
        }
      });
    });
  }
}
