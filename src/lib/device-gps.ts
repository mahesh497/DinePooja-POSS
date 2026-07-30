import { Capacitor } from "@capacitor/core";

export type DeviceCoords = { lat: number; lng: number };

/** Prefer Capacitor GPS in the native app; fall back to browser geolocation. */
export async function getDeviceCoords(): Promise<DeviceCoords> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import("@capacitor/geolocation");
    const perm = await Geolocation.requestPermissions();
    if (perm.location === "denied") {
      throw new Error("Location permission denied — enable GPS for delivery tracking");
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 12000,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation not available on this device");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      () => reject(new Error("Could not read device GPS — allow location access")),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
