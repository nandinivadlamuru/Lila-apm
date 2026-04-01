/**
 * JSON pixel_x / pixel_y use image space: origin top-left, y increases down.
 * Leaflet CRS.Simple uses y increasing up, so flip Y.
 */
export function pixelToLatLng(pixelX: number, pixelY: number): [number, number] {
  return [1024 - pixelY, pixelX];
}
