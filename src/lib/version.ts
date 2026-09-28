/**
 * Single source for the version string reported by /api/health and the footer.
 *
 * Kept as a constant rather than read from package.json so the server bundle does
 * not pull the manifest (and its whole dependency graph) into the build.
 */
export const APP_VERSION = '1.0.0';

export const APP_NAME_AR = 'هدية';
export const APP_NAME_EN = 'Hadiya';