import {
  BackgroundId,
  BackgroundMaster,
  BackgroundPreset,
  CutoutSettings,
  SocialSizeId,
  SocialSizePreset,
  StudioRender,
} from '../types';

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: 'pure-white',
    label: 'Pure White Studio',
    subtitle: 'Clean e-commerce gallery white (#FFFFFF)',
    swatchHex: '#FFFFFF',
  },
  {
    id: 'midnight-navy',
    label: 'Midnight Navy Luxury',
    subtitle: 'Deep evening navy with subtle studio glow',
    swatchHex: '#0F1B33',
  },
  {
    id: 'champagne-beige',
    label: 'Champagne Beige Luxury',
    subtitle: 'Warm editorial satin champagne backdrop',
    swatchHex: '#EFE6D8',
  },
];

export const SOCIAL_SIZE_PRESETS: SocialSizePreset[] = [
  {
    id: 'square',
    label: 'Instagram Square',
    width: 1080,
    height: 1080,
  },
  {
    id: 'portrait',
    label: 'Instagram Portrait',
    width: 1080,
    height: 1350,
  },
  {
    id: 'story',
    label: 'Instagram Story',
    width: 1080,
    height: 1920,
  },
];

export interface PixelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CutoutResult {
  cutoutCanvas: HTMLCanvasElement;
  cutoutDataUrl: string;
  hasExistingAlpha: boolean;
  bounds: PixelBounds;
}

export const loadImageFromFile = (
  file: File
): Promise<{ img: HTMLImageElement; dataUrl: string; width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the selected image file.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        resolve({
          img,
          dataUrl,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      };
      img.onerror = () => {
        reject(
          new Error(
            'Unable to decode this image format in your browser. Please upload a PNG, JPG, or WEBP file.'
          )
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
};

function colorDistSq(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const rMean = (r1 + r2) * 0.5;
  // Weighted perceptual RGB distance (Redmean approximation)
  return (
    (2 + rMean / 256) * dr * dr +
    4 * dg * dg +
    (2 + (255 - rMean) / 256) * db * db
  );
}

interface ColorCluster {
  r: number;
  g: number;
  b: number;
}

function samplePerimeterClusters(
  data: Uint8ClampedArray,
  w: number,
  h: number
): ColorCluster[] {
  const samples: ColorCluster[] = [];
  const margin = Math.max(1, Math.min(4, Math.floor(Math.min(w, h) * 0.01)));

  const pushPixel = (x: number, y: number) => {
    const idx = (y * w + x) * 4;
    if (data[idx + 3] < 200) return;
    samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2] });
  };

  const stepX = Math.max(1, Math.floor(w / 48));
  const stepY = Math.max(1, Math.floor(h / 48));

  for (let x = 0; x < w; x += stepX) {
    pushPixel(x, margin);
    pushPixel(x, h - 1 - margin);
  }
  for (let y = 0; y < h; y += stepY) {
    pushPixel(margin, y);
    pushPixel(w - 1 - margin, y);
  }

  // Deduplicate into up to 8 representative clusters so subtle gradients across corners are covered
  const clusters: ColorCluster[] = [];
  const mergeThreshSq = 18 * 18 * 9;
  for (const s of samples) {
    let matched = false;
    for (const c of clusters) {
      if (colorDistSq(s.r, s.g, s.b, c.r, c.g, c.b) < mergeThreshSq) {
        c.r = Math.round((c.r + s.r) * 0.5);
        c.g = Math.round((c.g + s.g) * 0.5);
        c.b = Math.round((c.b + s.b) * 0.5);
        matched = true;
        break;
      }
    }
    if (!matched) {
      clusters.push({ ...s });
      if (clusters.length >= 10) break;
    }
  }

  return clusters;
}

function minDistToClusters(
  r: number,
  g: number,
  b: number,
  clusters: ColorCluster[]
): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const d = colorDistSq(r, g, b, c.r, c.g, c.b);
    if (d < best) best = d;
  }
  return best;
}

export const createPreservedCutout = (
  img: HTMLImageElement,
  settings: CutoutSettings
): CutoutResult => {
  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  const maxDim = 2000;
  const scale = Math.min(1, maxDim / Math.max(natW, natH));
  const w = Math.max(1, Math.round(natW * scale));
  const h = Math.max(1, Math.round(natH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not initialize 2D canvas context.');
  }

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  // Check if the uploaded image already has meaningful transparency
  let transparentCount = 0;
  const sampleStride = Math.max(1, Math.floor(totalPixels / 8000));
  let sampledTotal = 0;
  for (let i = 0; i < totalPixels; i += sampleStride) {
    sampledTotal++;
    if (data[i * 4 + 3] < 245) {
      transparentCount++;
    }
  }
  const hasExistingAlpha = transparentCount / Math.max(1, sampledTotal) > 0.015;

  if (!hasExistingAlpha && settings.mode === 'auto') {
    const clusters = samplePerimeterClusters(data, w, h);
    if (clusters.length > 0) {
      // Convert 0..100 tolerance into perceptual threshold
      const tolUnit = 8 + settings.tolerance * 1.45;
      const thresholdSq = tolUnit * tolUnit * 9;
      const neighborStepSq = (12 + settings.tolerance * 0.45) ** 2 * 9;

      const bgMask = new Uint8Array(totalPixels); // 1 = background
      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const enqueueIfBg = (
        idx: number,
        refR: number,
        refG: number,
        refB: number,
        strictClusters: boolean
      ) => {
        if (visited[idx]) return;
        const p = idx * 4;
        if (data[p + 3] < 20) {
          visited[idx] = 1;
          bgMask[idx] = 1;
          queue[tail++] = idx;
          return;
        }
        const r = data[p];
        const g = data[p + 1];
        const b = data[p + 2];

        const dCluster = strictClusters
          ? minDistToClusters(r, g, b, clusters)
          : colorDistSq(r, g, b, refR, refG, refB);
        const dNeighbor = colorDistSq(r, g, b, refR, refG, refB);

        if (dCluster <= thresholdSq && dNeighbor <= neighborStepSq * 2.4) {
          visited[idx] = 1;
          bgMask[idx] = 1;
          queue[tail++] = idx;
        }
      };

      // Seed perimeter pixels
      for (let x = 0; x < w; x++) {
        const topIdx = x;
        const topP = topIdx * 4;
        enqueueIfBg(topIdx, data[topP], data[topP + 1], data[topP + 2], true);

        const botIdx = (h - 1) * w + x;
        const botP = botIdx * 4;
        enqueueIfBg(botIdx, data[botP], data[botP + 1], data[botP + 2], true);
      }
      for (let y = 1; y < h - 1; y++) {
        const leftIdx = y * w;
        const leftP = leftIdx * 4;
        enqueueIfBg(leftIdx, data[leftP], data[leftP + 1], data[leftP + 2], true);

        const rightIdx = y * w + (w - 1);
        const rightP = rightIdx * 4;
        enqueueIfBg(rightIdx, data[rightP], data[rightP + 1], data[rightP + 2], true);
      }

      // BFS from perimeter
      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        const cp = cur * 4;
        const cr = data[cp];
        const cg = data[cp + 1];
        const cb = data[cp + 2];

        if (cx > 0) enqueueIfBg(cur - 1, cr, cg, cb, true);
        if (cx < w - 1) enqueueIfBg(cur + 1, cr, cg, cb, true);
        if (cy > 0) enqueueIfBg(cur - w, cr, cg, cb, true);
        if (cy < h - 1) enqueueIfBg(cur + w, cr, cg, cb, true);
      }

      // Optional manual clear points (for enclosed rings, chain loops, earrings)
      if (settings.manualClearPoints.length > 0) {
        const pointVisited = new Uint8Array(totalPixels);
        const manualThresholdSq = (10 + settings.tolerance * 1.15) ** 2 * 9;

        for (const pt of settings.manualClearPoints) {
          const sx = Math.max(0, Math.min(w - 1, Math.round(pt.x * (w - 1))));
          const sy = Math.max(0, Math.min(h - 1, Math.round(pt.y * (h - 1))));
          const startIdx = sy * w + sx;
          if (bgMask[startIdx]) continue;

          const sp = startIdx * 4;
          const seedR = data[sp];
          const seedG = data[sp + 1];
          const seedB = data[sp + 2];

          let mHead = 0;
          let mTail = 0;
          pointVisited[startIdx] = 1;
          bgMask[startIdx] = 1;
          queue[mTail++] = startIdx;

          const tryManual = (nIdx: number, pr: number, pg: number, pb: number) => {
            if (pointVisited[nIdx] || bgMask[nIdx]) return;
            const np = nIdx * 4;
            const r = data[np];
            const g = data[np + 1];
            const b = data[np + 2];
            const dSeed = colorDistSq(r, g, b, seedR, seedG, seedB);
            const dPrev = colorDistSq(r, g, b, pr, pg, pb);
            if (dSeed <= manualThresholdSq && dPrev <= neighborStepSq * 2.2) {
              pointVisited[nIdx] = 1;
              bgMask[nIdx] = 1;
              queue[mTail++] = nIdx;
            }
          };

          while (mHead < mTail) {
            const cur = queue[mHead++];
            const cx = cur % w;
            const cy = (cur - cx) / w;
            const cp = cur * 4;
            const cr = data[cp];
            const cg = data[cp + 1];
            const cb = data[cp + 2];

            if (cx > 0) tryManual(cur - 1, cr, cg, cb);
            if (cx < w - 1) tryManual(cur + 1, cr, cg, cb);
            if (cy > 0) tryManual(cur - w, cr, cg, cb);
            if (cy < h - 1) tryManual(cur + w, cr, cg, cb);
          }
        }
      }

      // Compute boundary distance for subtle edge smoothing (never alters interior jewellery RGB!)
      const alphaMap = new Uint8ClampedArray(totalPixels);
      for (let i = 0; i < totalPixels; i++) {
        alphaMap[i] = bgMask[i] ? 0 : data[i * 4 + 3];
      }

      const featherPasses = Math.max(0, Math.min(4, Math.round(settings.edgeFeather / 2.5)));
      if (featherPasses > 0) {
        let current = alphaMap;
        for (let pass = 0; pass < featherPasses; pass++) {
          const next = new Uint8ClampedArray(current);
          for (let y = 1; y < h - 1; y++) {
            const row = y * w;
            for (let x = 1; x < w - 1; x++) {
              const idx = row + x;
              if (bgMask[idx]) continue;
              // Only soften pixels on the immediate boundary next to removed background
              const hasBgNeighbor =
                current[idx - 1] < 240 ||
                current[idx + 1] < 240 ||
                current[idx - w] < 240 ||
                current[idx + w] < 240;
              if (!hasBgNeighbor) continue;

              const avg =
                (current[idx] * 2 +
                  current[idx - 1] +
                  current[idx + 1] +
                  current[idx - w] +
                  current[idx + w]) /
                6;
              next[idx] = Math.round(avg);
            }
          }
          current = next;
        }
        for (let i = 0; i < totalPixels; i++) {
          data[i * 4 + 3] = current[i];
        }
      } else {
        for (let i = 0; i < totalPixels; i++) {
          if (bgMask[i]) data[i * 4 + 3] = 0;
        }
      }

      ctx.putImageData(imgData, 0, 0);
    }
  }

  // Compute tight bounding box of non-transparent pixels
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (data[(row + x) * 4 + 3] > 18) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX <= minX || maxY <= minY) {
    // Fallback to full canvas if everything was transparent
    minX = 0;
    minY = 0;
    maxX = w - 1;
    maxY = h - 1;
  }

  const bounds: PixelBounds = {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };

  return {
    cutoutCanvas: canvas,
    cutoutDataUrl: canvas.toDataURL('image/png'),
    hasExistingAlpha,
    bounds,
  };
};

function paintStudioBackground(
  ctx: CanvasRenderingContext2D,
  backgroundId: BackgroundId,
  width: number,
  height: number
) {
  if (backgroundId === 'pure-white') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  const cx = width * 0.5;
  const cy = height * 0.46;
  const radius = Math.max(width, height) * 0.72;
  const grad = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius);

  if (backgroundId === 'midnight-navy') {
    grad.addColorStop(0, '#162849');
    grad.addColorStop(0.55, '#0F1B33');
    grad.addColorStop(1, '#081020');
  } else {
    // champagne-beige
    grad.addColorStop(0, '#F7F2E8');
    grad.addColorStop(0.58, '#EFE6D7');
    grad.addColorStop(1, '#E2D4BE');
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);
}

function createSilhouetteCanvas(
  cutoutCanvas: HTMLCanvasElement,
  bounds: PixelBounds,
  targetW: number,
  targetH: number,
  shadowColor: string
): HTMLCanvasElement {
  const sCanvas = document.createElement('canvas');
  sCanvas.width = Math.max(1, Math.round(targetW));
  sCanvas.height = Math.max(1, Math.round(targetH));
  const sCtx = sCanvas.getContext('2d');
  if (!sCtx) return sCanvas;

  sCtx.imageSmoothingEnabled = true;
  sCtx.imageSmoothingQuality = 'high';
  sCtx.drawImage(
    cutoutCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    0,
    0,
    sCanvas.width,
    sCanvas.height
  );
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = shadowColor;
  sCtx.fillRect(0, 0, sCanvas.width, sCanvas.height);
  return sCanvas;
}

export const renderStudioComposite = (
  cutoutCanvas: HTMLCanvasElement,
  bounds: PixelBounds,
  backgroundId: BackgroundId,
  width: number,
  height: number,
  settings: CutoutSettings
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize export canvas.');
  }

  paintStudioBackground(ctx, backgroundId, width, height);

  // Preserve exact jewellery proportions within safe framing area
  const scaleFraction = Math.max(0.45, Math.min(0.88, settings.scale / 100));
  const maxBoxW = width * scaleFraction;
  const maxBoxH = height * (width === height ? scaleFraction : scaleFraction * 0.86);

  const aspectRatio = bounds.width / bounds.height;
  let drawW = maxBoxW;
  let drawH = drawW / aspectRatio;
  if (drawH > maxBoxH) {
    drawH = maxBoxH;
    drawW = drawH * aspectRatio;
  }

  const drawX = (width - drawW) * 0.5;
  // Slightly higher visual optical center on tall portrait/story frames
  const verticalBias = height > width * 1.4 ? 0.48 : 0.5;
  const drawY = (height - drawH) * verticalBias;

  if (settings.shadowEnabled) {
    const intensity = Math.max(0.05, Math.min(0.85, settings.shadowIntensity / 100));
    const shadowColor =
      backgroundId === 'midnight-navy' ? 'rgba(3, 6, 14, 1)' : 'rgba(15, 27, 51, 1)';
    const silhouette = createSilhouetteCanvas(
      cutoutCanvas,
      bounds,
      drawW,
      drawH,
      shadowColor
    );

    // Subtle soft ambient drop shadow behind/below the piece
    ctx.save();
    const blurPx = Math.round(Math.min(width, height) * 0.024);
    if ('filter' in ctx) {
      ctx.filter = `blur(${blurPx}px)`;
    }
    ctx.globalAlpha = intensity * (backgroundId === 'midnight-navy' ? 0.58 : 0.24);
    ctx.drawImage(silhouette, drawX, drawY + Math.round(drawH * 0.025), drawW, drawH);
    ctx.restore();

    // Soft grounded floor contact shadow directly under base
    ctx.save();
    const contactY = drawY + drawH - Math.max(4, Math.round(drawH * 0.015));
    const contactRx = drawW * 0.34;
    const contactRy = Math.max(8, drawH * 0.035);
    const contactGrad = ctx.createRadialGradient(
      width * 0.5,
      contactY,
      2,
      width * 0.5,
      contactY,
      contactRx
    );
    const baseOpacity = intensity * (backgroundId === 'midnight-navy' ? 0.48 : 0.16);
    contactGrad.addColorStop(
      0,
      backgroundId === 'midnight-navy'
        ? `rgba(2, 5, 12, ${baseOpacity})`
        : `rgba(15, 27, 51, ${baseOpacity})`
    );
    contactGrad.addColorStop(1, 'rgba(15, 27, 51, 0)');
    ctx.fillStyle = contactGrad;
    ctx.beginPath();
    ctx.ellipse(width * 0.5, contactY, contactRx, contactRy, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw the original preserved jewellery cutout untouched on top
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    cutoutCanvas,
    bounds.x,
    bounds.y,
    bounds.width,
    bounds.height,
    drawX,
    drawY,
    drawW,
    drawH
  );

  return canvas.toDataURL('image/png');
};

export const generateStudioAssetSuite = (
  cutout: CutoutResult,
  settings: CutoutSettings,
  slug: string
): {
  backgroundMasters: BackgroundMaster[];
  socialRenders: StudioRender[];
} => {
  const safeSlug = slug || 'reistella_jewellery';
  const backgroundMasters: BackgroundMaster[] = [];
  const socialRenders: StudioRender[] = [];

  for (const bg of BACKGROUND_PRESETS) {
    const masterDataUrl = renderStudioComposite(
      cutout.cutoutCanvas,
      cutout.bounds,
      bg.id,
      1600,
      1600,
      settings
    );
    backgroundMasters.push({
      backgroundId: bg.id,
      backgroundLabel: bg.label,
      width: 1600,
      height: 1600,
      dataUrl: masterDataUrl,
      filename: `${safeSlug}_${bg.id.replace(/-/g, '_')}_studio_1600x1600.png`,
    });

    for (const size of SOCIAL_SIZE_PRESETS) {
      const dataUrl = renderStudioComposite(
        cutout.cutoutCanvas,
        cutout.bounds,
        bg.id,
        size.width,
        size.height,
        settings
      );
      socialRenders.push({
        id: `${bg.id}_${size.id}`,
        backgroundId: bg.id,
        backgroundLabel: bg.label,
        sizeId: size.id,
        sizeLabel: size.label,
        width: size.width,
        height: size.height,
        dataUrl,
        filename: `${safeSlug}_${bg.id.replace(/-/g, '_')}_${size.id}_${size.width}x${size.height}.png`,
      });
    }
  }

  return { backgroundMasters, socialRenders };
};
