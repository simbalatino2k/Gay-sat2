/**
 * Universal distance formatting for AURA.
 * Supports close proximity meters (< 1 km):
 *  - <= 20m:  "15m far"
 *  - <= 45m:  "30m far"
 *  - <= 250m: "150m" (or meters count)
 *  - < 1000m: "500m" (500 metrów)
 *  - >= 1km:  "1.2 km"
 */
export function formatDistance(distanceKm?: number | null): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return 'Nearby';
  }

  const meters = Math.round(distanceKm * 1000);

  if (meters <= 20) {
    return '15m far';
  }
  if (meters <= 45) {
    return '30m far';
  }
  if (meters <= 250) {
    return `${meters}m`;
  }
  if (meters < 1000) {
    return `${meters}m`;
  }

  if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)} km`;
  }
  return `${Math.round(distanceKm)} km`;
}

/**
 * Descriptive distance e.g. for profile headers:
 * "15m far", "30m far", "150m away", "500m away", "1.2 km away"
 */
export function formatDistanceDescriptive(distanceKm?: number | null): string {
  if (distanceKm === undefined || distanceKm === null || isNaN(distanceKm)) {
    return 'Nearby';
  }

  const meters = Math.round(distanceKm * 1000);

  if (meters <= 20) return '15m far';
  if (meters <= 45) return '30m far';
  if (meters <= 250) return `${meters}m away`;
  if (meters < 1000) return `${meters}m away`;
  if (distanceKm < 10) return `${distanceKm.toFixed(1)} km away`;
  return `${Math.round(distanceKm)} km away`;
}
