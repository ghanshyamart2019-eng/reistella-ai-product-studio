export type BackgroundId = 'pure-white' | 'midnight-navy' | 'champagne-beige';

export type SocialSizeId = 'square' | 'portrait' | 'story';

export type CutoutMode = 'auto' | 'original';

export interface ManualClearPoint {
  /** Normalized x coordinate in [0, 1] relative to the working cutout image */
  x: number;
  /** Normalized y coordinate in [0, 1] relative to the working cutout image */
  y: number;
}

export interface CutoutSettings {
  mode: CutoutMode;
  /** Color distance tolerance 0..100 for background segmentation */
  tolerance: number;
  /** Edge feather smoothness 0..10 */
  edgeFeather: number;
  /** Subject framing scale 45..88 (%) */
  scale: number;
  /** Enable realistic subtle studio shadow */
  shadowEnabled: boolean;
  /** Shadow opacity intensity 10..80 (%) */
  shadowIntensity: number;
  /** Optional points inside enclosed loops (rings, chains, hoops) clicked to clear */
  manualClearPoints: ManualClearPoint[];
}

export interface BackgroundPreset {
  id: BackgroundId;
  label: string;
  subtitle: string;
  swatchHex: string;
}

export interface SocialSizePreset {
  id: SocialSizeId;
  label: string;
  width: number;
  height: number;
}

export interface StudioRender {
  id: string;
  backgroundId: BackgroundId;
  backgroundLabel: string;
  sizeId: SocialSizeId;
  sizeLabel: string;
  width: number;
  height: number;
  dataUrl: string;
  filename: string;
}

export interface BackgroundMaster {
  backgroundId: BackgroundId;
  backgroundLabel: string;
  width: number;
  height: number;
  dataUrl: string;
  filename: string;
}

export interface ProductSpecs {
  metalPurity: string;
  stoneType: string;
  weight: string;
  dimensions: string;
  price: string;
  platingDetails: string;
}

export interface ProductContent {
  productName: string;
  category: string;
  shortDescription: string;
  detailedDescription: string;
  instagramCaption: string;
  facebookCaption: string;
  hashtags: string;
}