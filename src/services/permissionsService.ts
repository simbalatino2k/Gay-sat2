/**
 * permissionsService.ts
 * Manages runtime requests for Location (GPS), Camera (Wideo/Aparat), and Microphone (Audio).
 * Called only after a person selects the permissions they want to enable.
 */

export interface PermissionResults {
  locationGranted: boolean;
  cameraGranted: boolean;
  microphoneGranted: boolean;
  coords?: { lat: number; lng: number };
  error?: string;
}

export async function requestLocationPermission(): Promise<{ granted: boolean; coords?: { lat: number; lng: number } }> {
  if (!('geolocation' in navigator)) {
    return { granted: false };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          granted: true,
          coords: {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          }
        });
      },
      (err) => {
        console.warn('[Permissions] Location permission error:', err.code, err.message);
        resolve({ granted: false });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 }
    );
  });
}

export async function requestMediaPermissions(
  selected = { camera: true, microphone: true }
): Promise<{ cameraGranted: boolean; microphoneGranted: boolean }> {
  if (!selected.camera && !selected.microphone) return { cameraGranted: false, microphoneGranted: false };
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return { cameraGranted: false, microphoneGranted: false };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: selected.camera, audio: selected.microphone });
    // Stop all tracks immediately so camera and mic indicators are released cleanly
    stream.getTracks().forEach((track) => {
      try {
        track.stop();
      } catch (e) {
        // ignore
      }
    });
    return { cameraGranted: selected.camera, microphoneGranted: selected.microphone };
  } catch (err: any) {
    console.warn('[Permissions] Media request failed:', err?.name);
    // Respect refusal: do not immediately trigger more permission prompts.
    return { cameraGranted: false, microphoneGranted: false };

  }
}

/**
 * Requests only the permissions selected in the onboarding dialog:
 * 1. Geolocation (GPS Radar & Cruising spots)
 * 2. Microphone (Voice notes & audio calls)
 * 3. Camera (Video verification & photos)
 */
export async function requestAllPermissionsOnLogin(
  authToken?: string | null,
  onLocationUpdate?: (coords: { lat: number; lng: number }) => void,
  selected = { location: false, camera: false, microphone: false }
): Promise<PermissionResults> {
  // Request Location first
  const locResult = selected.location ? await requestLocationPermission() : { granted: false, coords: undefined };

  if (locResult.granted && locResult.coords) {
    try {
      localStorage.setItem('aura_last_known_coords', JSON.stringify(locResult.coords));
    } catch (e) {
      // ignore
    }
    if (onLocationUpdate) {
      onLocationUpdate(locResult.coords);
    }

    // Update location on backend if auth token is present
    if (authToken) {
      try {
        fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`
          },
          body: JSON.stringify({
            lat: locResult.coords.lat,
            lng: locResult.coords.lng,
            location: 'Bieżąca lokalizacja GPS'
          })
        }).catch((e) => console.warn('[Permissions] Failed to persist location to profile:', e));
      } catch (e) {
        // ignore
      }
    }
  }

  // Request Camera & Microphone after location prompt completes
  const mediaResult = await requestMediaPermissions(selected);

  return {
    locationGranted: locResult.granted,
    cameraGranted: mediaResult.cameraGranted,
    microphoneGranted: mediaResult.microphoneGranted,
    coords: locResult.coords
  };
}
