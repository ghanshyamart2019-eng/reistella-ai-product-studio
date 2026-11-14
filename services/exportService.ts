import JSZip from 'jszip';
import {
  BackgroundMaster,
  ProductContent,
  ProductSpecs,
  StudioRender,
} from '../types';
import { parseHashtags, sanitizeNoCZ, slugifyProductName } from './contentTemplateService';

interface ExportPackageParams {
  originalFile: File;
  cutoutDataUrl: string;
  backgroundMasters: BackgroundMaster[];
  socialRenders: StudioRender[];
  content: ProductContent;
  specs: ProductSpecs;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mimeMatch = header.match(/data:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export const buildAndDownloadStudioZip = async ({
  originalFile,
  cutoutDataUrl,
  backgroundMasters,
  socialRenders,
  content,
  specs,
}: ExportPackageParams): Promise<void> => {
  const zip = new JSZip();
  const slug = slugifyProductName(content.productName);

  // 1. Original uploaded photo
  const originalBuffer = await originalFile.arrayBuffer();
  zip.file(`01_original/${originalFile.name}`, originalBuffer);

  // 2. Transparent cutout
  zip.file(
    `02_cutout_transparent/${slug}_transparent_cutout.png`,
    dataUrlToBlob(cutoutDataUrl)
  );

  // 3. All edited studio backgrounds (1600x1600 masters)
  for (const master of backgroundMasters) {
    zip.file(`03_backgrounds_studio/${master.filename}`, dataUrlToBlob(master.dataUrl));
  }

  // 4. All generated social media image sizes (3 backgrounds x 3 sizes)
  for (const render of socialRenders) {
    const folderName = render.backgroundId.replace(/-/g, '_');
    zip.file(
      `04_social_sizes/${folderName}/${render.filename}`,
      dataUrlToBlob(render.dataUrl)
    );
  }

  // 5. Product details in TXT and JSON format (with CZ safeguard applied)
  const sanitizedContent: ProductContent = {
    productName: sanitizeNoCZ(content.productName),
    category: sanitizeNoCZ(content.category),
    shortDescription: sanitizeNoCZ(content.shortDescription),
    detailedDescription: sanitizeNoCZ(content.detailedDescription),
    instagramCaption: sanitizeNoCZ(content.instagramCaption),
    facebookCaption: sanitizeNoCZ(content.facebookCaption),
    hashtags: parseHashtags(content.hashtags).join(' '),
  };

  const txtBody = [
    'REISTELLA AI PRODUCT STUDIO — Let Your Brilliance Reign',
    '====================================================================',
    `Product Name: ${sanitizedContent.productName}`,
    `Product Category: ${sanitizedContent.category}`,
    '',
    '--- SHORT PRODUCT DESCRIPTION ---',
    sanitizedContent.shortDescription,
    '',
    '--- DETAILED PRODUCT DESCRIPTION ---',
    sanitizedContent.detailedDescription,
    '',
    '--- INSTAGRAM CAPTION ---',
    sanitizedContent.instagramCaption,
    '',
    '--- FACEBOOK CAPTION ---',
    sanitizedContent.facebookCaption,
    '',
    '--- HASHTAGS ---',
    sanitizedContent.hashtags,
    '',
    '--- MANUAL CONFIRMATION SPECIFICATIONS ---',
    `Metal Purity: ${specs.metalPurity.trim() || '[Confirm metal purity]'}`,
    `Stone Type: ${specs.stoneType.trim() || '[Confirm stone type]'}`,
    `Weight: ${specs.weight.trim() || '[Confirm weight]'}`,
    `Dimensions: ${specs.dimensions.trim() || '[Confirm dimensions]'}`,
    `Price: ${specs.price.trim() || '[Confirm price]'}`,
    `Plating Details: ${specs.platingDetails.trim() || '[Confirm plating details]'}`,
  ].join('\n');

  const jsonPayload = {
    brand: 'REISTELLA AI PRODUCT STUDIO',
    tagline: 'Let Your Brilliance Reign',
    exportedAt: new Date().toISOString(),
    product: {
      ...sanitizedContent,
      hashtagList: parseHashtags(sanitizedContent.hashtags),
    },
    confirmedSpecifications: {
      metalPurity: specs.metalPurity.trim() || '[Confirm metal purity]',
      stoneType: specs.stoneType.trim() || '[Confirm stone type]',
      weight: specs.weight.trim() || '[Confirm weight]',
      dimensions: specs.dimensions.trim() || '[Confirm dimensions]',
      price: specs.price.trim() || '[Confirm price]',
      platingDetails: specs.platingDetails.trim() || '[Confirm plating details]',
    },
    assets: {
      originalFile: `01_original/${originalFile.name}`,
      transparentCutout: `02_cutout_transparent/${slug}_transparent_cutout.png`,
      studioBackgrounds: backgroundMasters.map((m) => ({
        background: m.backgroundLabel,
        dimensions: `${m.width}x${m.height}`,
        path: `03_backgrounds_studio/${m.filename}`,
      })),
      socialMediaSizes: socialRenders.map((r) => ({
        background: r.backgroundLabel,
        size: r.sizeLabel,
        dimensions: `${r.width}x${r.height}`,
        path: `04_social_sizes/${r.backgroundId.replace(/-/g, '_')}/${r.filename}`,
      })),
    },
  };

  zip.file(`05_product_details/${slug}_product_details.txt`, txtBody);
  zip.file(
    `05_product_details/${slug}_product_details.json`,
    JSON.stringify(jsonPayload, null, 2)
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${slug}_reistella_studio_package.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
};
