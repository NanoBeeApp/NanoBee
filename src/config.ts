// Shared frontend configuration: cross-component constants and external
// links, extracted here so they are never duplicated inside components.

/**
 * Native app download links. These point at site-level redirect paths
 * (instead of hardcoded store/installer URLs) so the actual targets —
 * App Store listing, .dmg installer — can be updated server-side without
 * shipping a new frontend build.
 */
export const APP_DOWNLOAD_LINKS = {
	ios: "https://nanobee.app/download/ios",
	mac: "https://nanobee.app/download/mac",
} as const;
