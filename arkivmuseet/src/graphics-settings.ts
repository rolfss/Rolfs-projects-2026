/** Explicit, bounded browser settings. Authoring hardware never determines visitor defaults. */
export type GraphicsProfile = 'auto' | 'standard' | 'high';
export function parseGraphicsProfile(value: unknown): GraphicsProfile {
  return value === 'standard' || value === 'high' ? value : 'auto';
}
export function graphicsPolicy(profile: GraphicsProfile, width: number, height: number, deviceRatio: number, coarse: boolean, economy = false) {
  const phone = coarse || width < 800;
  const textureSize = profile === 'high' ? 2048 : profile === 'standard' ? 1024 : phone ? 512 : 1024;
  const cap = economy ? 1 : profile === 'high' ? 2 : phone ? 1.25 : 1.6;
  const ratio = Math.max(.5, Math.min(Number.isFinite(deviceRatio) ? deviceRatio : 1, cap,
    Math.sqrt(8294400 / Math.max(1, width * height))));
  return { textureSize, ratio, shadowSize: economy ? 1024 : profile === 'high' ? 4096 : 2048,
    anisotropy: phone && profile !== 'high' ? 2 : 8, shadows: !economy };
}
