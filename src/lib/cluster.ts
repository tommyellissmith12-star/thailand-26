import type { Pin } from "./types";

export interface PinCluster {
  key: string;
  lng: number;
  lat: number;
  pins: Pin[];
}

const RADIUS_PX = 52;

function project(lng: number, lat: number, zoom: number): { x: number; y: number } {
  const scale = 256 * Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * scale;
  const sin = Math.sin((lat * Math.PI) / 180);
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

// Greedy pixel-distance clustering. O(n^2) but n is a family's worth of pins,
// and it keeps photo-thumbnail HTML markers (which MapLibre's native
// clustering can't render) as the one and only marker style.
export function clusterPins(pins: Pin[], zoom: number): PinCluster[] {
  const projected = pins.map((p) => ({ pin: p, ...project(p.lng, p.lat, zoom) }));
  const clusters: (PinCluster & { x: number; y: number })[] = [];

  for (const item of projected) {
    const hit = clusters.find(
      (c) => Math.hypot(c.x - item.x, c.y - item.y) < RADIUS_PX,
    );
    if (hit) {
      hit.pins.push(item.pin);
      // keep the anchor on the first pin; stable and avoids marker drift
    } else {
      clusters.push({
        key: item.pin.id,
        lng: item.pin.lng,
        lat: item.pin.lat,
        pins: [item.pin],
        x: item.x,
        y: item.y,
      });
    }
  }
  return clusters;
}
