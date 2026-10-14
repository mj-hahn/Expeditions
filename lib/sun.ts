// Subsolar point (where the sun is straight overhead) from NOAA's low-precision
// solar equations; good to well under a degree, plenty for a day/night shade.
export function subsolarPoint(date: Date): [number, number] {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 864e5);
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const g = ((2 * Math.PI) / 365) * (dayOfYear + (minutes / 60 - 12) / 24);
  const eqTime =
    229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  let lon = (720 - minutes - eqTime) / 4;
  lon = ((((lon + 180) % 360) + 360) % 360) - 180;
  return [lon, (decl * 180) / Math.PI];
}
