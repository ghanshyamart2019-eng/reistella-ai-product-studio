import { ProductContent, ProductSpecs } from '../types';

export const JEWELLERY_CATEGORIES = [
  'Ring',
  'Necklace',
  'Earrings',
  'Bracelet',
  'Bangle',
  'Pendant',
  'Bridal Set',
  'Anklet',
  'Brooch',
  'Fine Jewellery',
] as const;

export const EMPTY_SPECS: ProductSpecs = {
  metalPurity: '',
  stoneType: '',
  weight: '',
  dimensions: '',
  price: '',
  platingDetails: '',
};

const CZ_PATTERN = /\bcz\b/gi;

export const containsForbiddenCZ = (text: string): boolean => {
  return /\bcz\b/i.test(text);
};

export const sanitizeNoCZ = (text: string): string => {
  return text.replace(CZ_PATTERN, '[Confirm stone type]');
};

export const parseHashtags = (raw: string): string[] => {
  return raw
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
    .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`))
    .filter((tag) => !/^#cz$/i.test(tag));
};

export const slugifyProductName = (name: string): string => {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return cleaned || 'reistella_jewellery';
};

const CATEGORY_HASHTAGS: Record<string, string[]> = {
  Ring: ['#StatementRing', '#RingStack', '#CocktailRing'],
  Necklace: ['#NecklaceLayering', '#StatementNecklace', '#NecklaceDesign'],
  Earrings: ['#StatementEarrings', '#EarStack', '#DropEarrings'],
  Bracelet: ['#BraceletStack', '#WristCandy', '#ChainBracelet'],
  Bangle: ['#LuxuryBangle', '#BangleStack', '#ArmCandy'],
  Pendant: ['#PendantNecklace', '#MinimalPendant', '#EverydayLuxury'],
  'Bridal Set': ['#BridalJewellery', '#WeddingJewellery', '#HeirloomStyle'],
  Anklet: ['#AnkletStyle', '#DaintyAnklet', '#SummerJewellery'],
  Brooch: ['#VintageInspired', '#StatementBrooch', '#CoutureDetails'],
  'Fine Jewellery': ['#TimelessJewellery', '#ArtisanCraft', '#ClassicElegance'],
};

const CATEGORY_SILHOUETTE_NOTES: Record<string, string> = {
  Ring: 'balanced silhouette crafted to frame the hand with poise and refined proportion',
  Necklace: 'graceful drape designed to sit effortlessly along the collarbone',
  Earrings: 'sculpted profile that catches ambient light with every subtle movement',
  Bracelet: 'fluid link articulation crafted for comfortable all-day wear',
  Bangle: 'clean architectural contour tailored for solo elegance or curated stacking',
  Pendant: 'focal silhouette crafted to anchor layered or minimalist styling',
  'Bridal Set': 'ceremonial ensemble composed for milestone celebrations and timeless portraits',
  Anklet: 'delicate proportion designed for effortless warm-weather refinement',
  Brooch: 'collectible accent crafted to elevate tailoring, shawls, and eveningwear',
  'Fine Jewellery': 'considered proportions designed for enduring everyday and occasion wear',
};

function valOrPlaceholder(value: string, placeholder: string): string {
  const trimmed = sanitizeNoCZ(value.trim());
  return trimmed ? trimmed : placeholder;
}

export const generateLocalProductContent = (
  rawName: string,
  rawCategory: string,
  specs: ProductSpecs
): ProductContent => {
  const category = rawCategory.trim() || 'Fine Jewellery';
  const productName = sanitizeNoCZ(rawName.trim()) || `Signature ${category}`;

  const metalPurity = valOrPlaceholder(specs.metalPurity, '[Confirm metal purity]');
  const stoneType = valOrPlaceholder(specs.stoneType, '[Confirm stone type]');
  const weight = valOrPlaceholder(specs.weight, '[Confirm weight]');
  const dimensions = valOrPlaceholder(specs.dimensions, '[Confirm dimensions]');
  const price = valOrPlaceholder(specs.price, '[Confirm price]');
  const platingDetails = valOrPlaceholder(specs.platingDetails, '[Confirm plating details]');

  const silhouetteNote =
    CATEGORY_SILHOUETTE_NOTES[category] || CATEGORY_SILHOUETTE_NOTES['Fine Jewellery'];

  const shortDescription = sanitizeNoCZ(
    `${productName} — a refined ${category.toLowerCase()} by REISTELLA featuring a ${silhouetteNote}. Metal: ${metalPurity} · Stones: ${stoneType}.`
  );

  const detailedDescription = sanitizeNoCZ(
    [
      `${productName} brings poised craftsmanship and timeless proportion to your collection. Designed as a versatile ${category.toLowerCase()}, this piece offers a ${silhouetteNote}.`,
      '',
      'Specifications (Confirm before publishing):',
      `- Metal & Purity: ${metalPurity}`,
      `- Stone Details: ${stoneType}`,
      `- Plating Details: ${platingDetails}`,
      `- Approximate Weight: ${weight}`,
      `- Dimensions: ${dimensions}`,
      `- Retail Price: ${price}`,
      '',
      'Care Guidance: Store flat in a soft-lined pouch away from moisture, perfume, and direct household chemicals to preserve the original finish.',
    ].join('\n')
  );

  const instagramCaption = sanitizeNoCZ(
    [
      `Let Your Brilliance Reign with the ${productName}.`,
      '',
      `Crafted with attention to every line, setting, and clasp—styled to elevate both quiet everyday moments and evening occasions.`,
      '',
      `Category: ${category} | Metal: ${metalPurity} | Stones: ${stoneType} | Price: ${price}`,
      'Save this piece to your wishlist or message us directly for availability and sizing confirmation.',
    ].join('\n')
  );

  const facebookCaption = sanitizeNoCZ(
    [
      `Introducing the ${productName} from REISTELLA.`,
      '',
      `This ${category.toLowerCase()} is photographed true-to-piece so every setting, contour, and finish is presented clearly without distortion.`,
      '',
      `Details for confirmation: Metal (${metalPurity}), Stones (${stoneType}), Plating (${platingDetails}), Weight (${weight}), Dimensions (${dimensions}), Price (${price}).`,
      '',
      'Send us a message to confirm availability or request styling guidance.',
    ].join('\n')
  );

  const catTags = CATEGORY_HASHTAGS[category] || CATEGORY_HASHTAGS['Fine Jewellery'];
  const baseTags = [
    '#Reistella',
    '#LetYourBrillianceReign',
    '#LuxuryJewellery',
    '#JewelleryDesign',
    '#FineCraftsmanship',
    '#TimelessStyle',
    '#JewelleryPhotography',
  ];
  const combinedTags = [...baseTags, ...catTags].slice(0, 10);

  return {
    productName,
    category,
    shortDescription,
    detailedDescription,
    instagramCaption,
    facebookCaption,
    hashtags: combinedTags.join(' '),
  };
};
