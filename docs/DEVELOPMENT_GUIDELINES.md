# Geodrome Development Guidelines & Architecture

This document outlines the core architectural principles, coding conventions, and developer guidelines established for the Geodrome project.

---

## 1. Architectural Philosophy

Geodrome is built with a zero-framework, high-performance architecture using Vanilla TypeScript and Vite:

* **Direct Render Loop Control**: Eliminates Virtual DOM overhead and framework re-render cascades, allowing 60 FPS requestAnimationFrame loops for WebGL 3D graphics and 2D canvas drawing.
* **Decoupled Architecture**: Code is strictly modularised across distinct directories:
  * `src/types/`: Strongly-typed TypeScript interfaces (`geo.ts`).
  * `src/core/`: Pure mathematical computations and topology loaders (`geo-math.ts`, `topojson-loader.ts`).
  * `src/graphics/`: Three.js WebGL scene engine and tube generators (`globe-scene.ts`, `tube-builder.ts`, `shaders.ts`).
  * `src/map2d/`: 2D Mercator canvas renderer (`mercator-renderer.ts`).
  * `src/ui/`: DOM panel managers and preset locations (`marker-panel.ts`, `preset-locations.ts`).

---

## 2. Coding & Style Conventions

### Strict Commenting Standard
* **Zero Explanatory Comments**: Code should be self-documenting through clean variable naming and strict type declarations. No explanatory inline comments should be written in source files.
* **Section Headers**: Use formal section header blocks exclusively for visual partitioning:
  ```ts
  /* ========================================================================== */
  /*                            SECTION TITLE                                   */
  /* ========================================================================== */
  ```
* **Critical Warnings Only**: Comments are reserved strictly for vital developer alerts, such as GPU VRAM disposal boundaries or fallback handling.

### Naming Conventions
* **Filenames**: All source filenames MUST use strict **kebab-case** (e.g. `geo-math.ts`, `globe-scene.ts`, `mercator-renderer.ts`, `marker-panel.ts`, `not-found.ts`).
* **Classes**: PascalCase (e.g. `GlobeScene`, `MercatorRenderer`).
* **Functions & Variables**: camelCase (e.g. `calculateAntipode`, `latLngToVector3`).
* **Constants**: UPPER_SNAKE_CASE (e.g. `PRESET_LOCATIONS`).

### Iconography & Emojis
* **Zero Emojis**: Emojis are strictly forbidden anywhere in the repository (code, HTML markup, CSS, or markdown documentation).
* **Vector Assets**: All icons must use inline vector SVG elements or text badges (`GEODROME`).

---

## 3. GPU Memory & VRAM Disposal Lifecycle

Any dynamic 3D geometry created during animated geodesic line growth or marker updates must be systematically cleaned up to prevent WebGL GPU memory leaks:

* Always call `disposeMesh(mesh)` when removing dynamic 3D meshes from scenes.
* `disposeMesh` traverses children and invokes `geometry.dispose()` and `material.dispose()` on every node.

---

## 4. Mathematical Foundations

### 3D Spherical UV Coordinate Formula
To align Three.js `SphereGeometry` UV mapping correctly:
* $X = r \cdot \sin(\phi) \cdot \cos(\theta)$
* $Y = r \cdot \cos(\phi)$
* $Z = -r \cdot \sin(\phi) \cdot \sin(\theta)$
where $\phi = (90^\circ - \text{lat}) \cdot \frac{\pi}{180}$ and $\theta = \text{lng} \cdot \frac{\pi}{180}$.

### 2D Mercator Projection & Date-Line Wrapping
* $\text{lngToX}(\text{lng}) = \frac{((\text{lng} + 180) \bmod 360 + 360) \bmod 360}{360} \cdot \text{width}$
* Lines crossing the $180^\circ / -180^\circ$ longitude seam are automatically split and edge-clipped in `drawMercLine` to prevent horizontal line tearing across the canvas.
