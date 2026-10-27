/**
 * Centralized application configuration for brand identity, feature flags,
 * security limits, and storage policies.
 * Keeps the temporary name ("Anonymous Chat") configurable in one place.
 */

export interface BrandConfig {
  appName: string;
  shortName: string;
  tagline: string;
  accentHex: string;
  secondaryAccentHex: string;
  allowPublicRegistration: boolean;
  storyExpiryHours: number;
  maxUploadSizeMb: number;
  maxReelDurationSec: number;
  supportedVideoMimeTypes: string[];
  supportedImageMimeTypes: string[];
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  appName: 'Anonymous Chat',
  shortName: 'AnonChat',
  tagline: 'Unified Social Graph, Real-Time Communities & Ephemeral Media',
  accentHex: '#6366F1', // Blurple / Indigo
  secondaryAccentHex: '#8B5CF6', // Violet
  allowPublicRegistration: true,
  storyExpiryHours: 24, // Applies strictly to Stories — never deletes servers, channels, posts, or accounts
  maxUploadSizeMb: 25,
  maxReelDurationSec: 90,
  supportedVideoMimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  supportedImageMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'],
};

const STORAGE_KEY = 'anonchat_brand_config_v1';

export function loadBrandConfig(): BrandConfig {
  if (typeof window === 'undefined') return DEFAULT_BRAND_CONFIG;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BRAND_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_BRAND_CONFIG,
      ...parsed,
    };
  } catch {
    return DEFAULT_BRAND_CONFIG;
  }
}

export function saveBrandConfig(patch: Partial<BrandConfig>): BrandConfig {
  const next = { ...loadBrandConfig(), ...patch };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota errors
    }
  }
  return next;
}
