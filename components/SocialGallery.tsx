import React, { useState } from 'react';
import {
  BackgroundId,
  BackgroundMaster,
  SocialSizeId,
  StudioRender,
} from '../types';
import {
  BACKGROUND_PRESETS,
  SOCIAL_SIZE_PRESETS,
} from '../services/imageProcessingService';

interface SocialGalleryProps {
  socialRenders: StudioRender[];
  backgroundMasters: BackgroundMaster[];
  cutoutDataUrl: string;
  productSlug: string;
  onInspect: (title: string, dataUrl: string, subtitle: string) => void;
}

const SocialGallery: React.FC<SocialGalleryProps> = ({
  socialRenders,
  backgroundMasters,
  cutoutDataUrl,
  productSlug,
  onInspect,
}) => {
  const [selectedBg, setSelectedBg] = useState<'all' | BackgroundId>('all');
  const [selectedSize, setSelectedSize] = useState<'all' | SocialSizeId>('all');

  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRenders = socialRenders.filter((item) => {
    if (selectedBg !== 'all' && item.backgroundId !== selectedBg) return false;
    if (selectedSize !== 'all' && item.sizeId !== selectedSize) return false;
    return true;
  });

  return (
    <section id="gallery" className="pt-12 border-t border-[#E6E1D6]">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#9A7B34]">
            02. Studio Backgrounds &amp; Social Media Formats
          </p>
          <h2 className="font-serif text-3xl font-semibold text-[#0F1B33] mt-1">
            All 9 Ready-to-Publish Renders
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            Three luxury studio backdrops rendered in Instagram Square (1080 × 1080),
            Portrait (1080 × 1350), and Story (1080 × 1920).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F5F0] border border-[#E6E1D6] rounded-lg"
            role="group"
            aria-label="Filter by background"
          >
            <button
              type="button"
              onClick={() => setSelectedBg('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedBg === 'all'
                  ? 'bg-white text-[#0F1B33] shadow-sm'
                  : 'text-[#475569] hover:text-[#0F1B33]'
              }`}
            >
              All Backdrops
            </button>
            {BACKGROUND_PRESETS.map((bg) => (
              <button
                key={bg.id}
                type="button"
                onClick={() => setSelectedBg(bg.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  selectedBg === bg.id
                    ? 'bg-white text-[#0F1B33] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F1B33]'
                }`}
              >
                {bg.label.replace(' Luxury', '').replace(' Studio', '')}
              </button>
            ))}
          </div>

          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-[#F7F5F0] border border-[#E6E1D6] rounded-lg"
            role="group"
            aria-label="Filter by social media size"
          >
            <button
              type="button"
              onClick={() => setSelectedSize('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                selectedSize === 'all'
                  ? 'bg-white text-[#0F1B33] shadow-sm'
                  : 'text-[#475569] hover:text-[#0F1B33]'
              }`}
            >
              All Sizes
            </button>
            {SOCIAL_SIZE_PRESETS.map((sz) => (
              <button
                key={sz.id}
                type="button"
                onClick={() => setSelectedSize(sz.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 tabular-nums ${
                  selectedSize === sz.id
                    ? 'bg-white text-[#0F1B33] shadow-sm'
                    : 'text-[#475569] hover:text-[#0F1B33]'
                }`}
              >
                {sz.width}×{sz.height}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Studio Masters & Transparent Cutout Strip */}
      <div className="mb-8 p-4 bg-[#FAF9F6] border border-[#E6E1D6] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-sm text-[#334155]">
          <span className="font-semibold text-[#0F1B33]">Master Assets:</span>{' '}
          Download the preserved transparent cutout or 1600 × 1600 studio masters directly.
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadDataUrl(cutoutDataUrl, `${productSlug}_transparent_cutout.png`)
            }
            className="px-3 py-1.5 text-xs font-medium text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449] transition-colors whitespace-nowrap shrink-0"
          >
            Transparent PNG
          </button>
          {backgroundMasters.map((master) => (
            <button
              key={master.backgroundId}
              type="button"
              onClick={() => downloadDataUrl(master.dataUrl, master.filename)}
              className="px-3 py-1.5 text-xs font-medium text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449] transition-colors whitespace-nowrap shrink-0"
            >
              {master.backgroundLabel.replace(' Luxury', '').replace(' Studio', '')} 1600px
            </button>
          ))}
        </div>
      </div>

      {/* 3-Column Uniform Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRenders.map((render) => (
          <article
            key={render.id}
            className="bg-white border border-[#E6E1D6] rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
          >
            <button
              type="button"
              onClick={() =>
                onInspect(
                  `${render.backgroundLabel} — ${render.sizeLabel}`,
                  render.dataUrl,
                  `${render.width} × ${render.height} px`
                )
              }
              className="w-full bg-[#FAF9F6] aspect-square overflow-hidden flex items-center justify-center p-4 cursor-zoom-in border-b border-[#E6E1D6]"
            >
              <img
                src={render.dataUrl}
                alt={`${render.backgroundLabel} ${render.sizeLabel}`}
                className="max-w-full max-h-full object-contain shadow-sm"
                referrerPolicy="no-referrer"
              />
            </button>

            <div className="p-4 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-[#0F1B33] truncate">
                  {render.backgroundLabel}
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                  {render.sizeLabel} · {render.width} × {render.height}
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadDataUrl(render.dataUrl, render.filename)}
                className="px-3 py-1.5 text-xs font-semibold text-[#0F1B33] border border-[#E6E1D6] rounded-lg hover:border-[#B59449] hover:bg-[#FAF9F6] transition-colors whitespace-nowrap shrink-0"
              >
                Save PNG
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default SocialGallery;
