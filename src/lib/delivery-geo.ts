/** Haversine distance in km */
export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function etaMinutes(distance: number, status: string) {
  if (status === "DELIVERED" || status === "ARRIVED") return 0;
  const speedKmh = status === "PICKED_UP" || status === "ON_THE_WAY" ? 22 : 18;
  return Math.max(1, Math.round((distance / speedKmh) * 60));
}
