# Geodrome

> **Interactive 3D Geodesics & Diametric Antipodes Engine**

Geodrome is a modernized, open-source 3D WebGL spherical visualizer and 2D Mercator map projection engine designed to explore Great Circle navigation, orthodromic paths, and diametric antipodal geometry.

Based on the original concept by science communicator **[Ralph Crewe](https://www.ralphcrewe.com/curiosity)**.

---

## Features

* **Interactive 3D WebGL Globe**: Orbit controls, smooth camera interpolation (`flyTo`), and double-tap raycasting coordinate lookup.
* **Dual Projection Sync**: Real-time synchronised rendering between a 3D sphere and a 2D Mercator canvas with seam-clipping date-line math.
* **Geodesic Pathfinding**: Draw 3-second animated 3D geodesic tubes with traveling directional arrow tips along 8 compass bearings.
* **Antipodal Mathematics**: Instantly compute diametrically opposite coordinates and draw internal core diameter tunnel lines.
* **Dual-Pass X-Ray Transparency**: View internal core structures using two-pass `THREE.BackSide` hollow sphere rendering.
* **Clipboard Coordinates**: One-click coordinate copying and world city presets (Tokyo, London, New York, Nairobi, Sydney, Rio, Cairo, Reykjavik).
* **Clean SPA & MPA Routing**: Built with Vite supporting clean URLs (`/`, `/about`, `/404`) and static host deployment.

---

## Technology Stack

* **Language**: Vanilla TypeScript (ES2022)
* **3D Graphics Engine**: Three.js (`^0.160.0`)
* **Cartography & Topology**: TopoJSON Client & D3-Geo
* **Bundler & Build Tool**: Vite (`^5.1.0`)
* **Deployment**: Cloudflare Pages Edge Network (`https://geodrome.pages.dev`)

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/ny-collins/geodrome.git
cd geodrome
npm install
```

### 2. Run Local Development Server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Production Build
```bash
npm run build
```
Generates production-optimized static assets in the `./dist` directory.

---

## License

This project is licensed under the [MIT License](LICENSE). Inspired by Ralph Crewe's original "Great Circle Globe" concept.
