import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import Header from './components/Header';
import SocialGallery from './components/SocialGallery';
import CopyEditorPanel from './components/CopyEditorPanel';
import WindowsModelGuideModal from './components/WindowsModelGuideModal';
import Spinner from './components/common/Spinner';
import {
  BackgroundId,
  BackgroundMaster,
  CutoutSettings,
  ProductContent,
  ProductSpecs,
  StudioRender,
} from './types';
import {
  BACKGROUND_PRESETS,
  createPreservedCutout,
  generateStudioAssetSuite,
  loadImageFromFile,
  renderStudioComposite,
} from './services/imageProcessingService';
import {
  EMPTY_SPECS,
  generateLocalProductContent,
  slugifyProductName,
} from './services/contentTemplateService';
import { buildAndDownloadStudioZip } from './services/exportService';

const DEFAULT_CUTOUT_SETTINGS: CutoutSettings = {
  mode: 'auto',
  tolerance: 30,
  edgeFeather: 4,
  scale: 72,
  shadowEnabled: true,
  shadowIntensity: 42,
  manualClearPoints: [],
};

function filenameToTitle(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (!base) return 'Signature Piece';
  return base.replace(/\b\w/g, (char) => char.toUpperCase());
}

const App: React.FC = () => {
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [originalDataUrl, setOriginalDataUrl] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<{ width: number; height: number } | null>(
    null
  );
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  const [cutoutSettings, setCutoutSettings] = useState<CutoutSettings>(
    DEFAULT_CUTOUT_SETTINGS
  );
  const [previewBackdrop, setPreviewBackdrop] = useState<'checker' | BackgroundId>(
    'pure-white'
  );

  const [cutoutDataUrl, setCutoutDataUrl] = useState<string>('');
  const [livePreviewUrl, setLivePreviewUrl] = useState<string>('');
  const [hasExistingAlpha, setHasExistingAlpha] = useState<boolean>(false);
  const [backgroundMasters, setBackgroundMasters] = useState<BackgroundMaster[]>([]);
  const [socialRenders, setSocialRenders] = useState<StudioRender[]>([]);

  const [specs, setSpecs] = useState<ProductSpecs>(EMPTY_SPECS);
  const [content, setContent] = useState<ProductContent>(() =>
    generateLocalProductContent('Signature Solitaire Ring', 'Ring', EMPTY_SPECS)
  );

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isWindowsGuideOpen, setIsWindowsGuideOpen] = useState<boolean>(false);
  const [lightbox, setLightbox] = useState<{
    title: string;
    dataUrl: string;
    subtitle: string;
  } | null>(null);

  const productSlug = useMemo(
    () => slugifyProductName(content.productName),
    [content.productName]
  );

  const handleFileSelected = useCallback(async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      setError('Image size cannot exceed 15MB.');
      return;
    }

    setError(null);
    setIsProcessing(true);

    try {
      const { img, dataUrl, width, height } = await loadImageFromFile(file);
      const initialName = filenameToTitle(file.name);
      const initialSpecs = { ...EMPTY_SPECS };

      setOriginalFile(file);
      setOriginalDataUrl(dataUrl);
      setOriginalSize({ width, height });
      setLoadedImage(img);
      setCutoutSettings(DEFAULT_CUTOUT_SETTINGS);
      setSpecs(initialSpecs);
      setContent(generateLocalProductContent(initialName, 'Fine Jewellery', initialSpecs));
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Could not process the selected image. Please try a PNG, JPG, or WEBP file.';
      setError(msg);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  // Recompute pixel-preserved cutout and all 9 social renders whenever image or studio settings change
  useEffect(() => {
    if (!loadedImage) return;

    const timer = window.setTimeout(() => {
      try {
        const cutout = createPreservedCutout(loadedImage, cutoutSettings);
        setCutoutDataUrl(cutout.cutoutDataUrl);
        setHasExistingAlpha(cutout.hasExistingAlpha);

        if (previewBackdrop === 'checker') {
          setLivePreviewUrl(cutout.cutoutDataUrl);
        } else {
          setLivePreviewUrl(
            renderStudioComposite(
              cutout.cutoutCanvas,
              cutout.bounds,
              previewBackdrop,
              1080,
              1080,
              cutoutSettings
            )
          );
        }

        const suite = generateStudioAssetSuite(cutout, cutoutSettings, productSlug);
        setBackgroundMasters(suite.backgroundMasters);
        setSocialRenders(suite.socialRenders);
      } catch (err) {
        console.error('Studio render error:', err);
        setError('Unable to render studio assets for this image.');
      }
    }, 90);

    return () => window.clearTimeout(timer);
  }, [loadedImage, cutoutSettings, previewBackdrop, productSlug]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        handleFileSelected(acceptedFiles[0]);
      }
    },
    [handleFileSelected]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/webp': ['.webp'],
    },
    multiple: false,
  } as unknown as DropzoneOptions);

  const handleCutoutPreviewClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (cutoutSettings.mode !== 'auto' || hasExistingAlpha) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;
    if (normX < 0 || normX > 1 || normY < 0 || normY > 1) return;

    // Only directly map clicks when viewing the uncropped cutout (checkerboard)
    if (previewBackdrop !== 'checker') {
      setPreviewBackdrop('checker');
      return;
    }

    setCutoutSettings((prev) => ({
      ...prev,
      manualClearPoints: [...prev.manualClearPoints, { x: normX, y: normY }],
    }));
  };

  const handleDownloadZip = async () => {
    if (!originalFile || !cutoutDataUrl || socialRenders.length === 0) return;
    setIsExporting(true);
    try {
      await buildAndDownloadStudioZip({
        originalFile,
        cutoutDataUrl,
        backgroundMasters,
        socialRenders,
        content,
        specs,
      });
    } catch (err) {
      console.error('ZIP export failed:', err);
      setError('Failed to create the ZIP archive. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetProject = () => {
    setOriginalFile(null);
    setOriginalDataUrl('');
    setOriginalSize(null);
    setLoadedImage(null);
    setCutoutDataUrl('');
    setLivePreviewUrl('');
    setBackgroundMasters([]);
    setSocialRenders([]);
    setError(null);
    setCutoutSettings(DEFAULT_CUTOUT_SETTINGS);
  };

  const handleRegenerateTemplates = () => {
    setContent(
      generateLocalProductContent(content.productName, content.category, specs)
    );
  };

  return (
    <div id="top" className="min-h-screen bg-white text-[#0F1B33] flex flex-col">
      <Header
        hasProject={Boolean(originalFile && socialRenders.length > 0)}
        isExporting={isExporting}
        onDownloadZip={handleDownloadZip}
        onScrollToUpload={() =>
          uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
        onOpenWindowsGuide={() => setIsWindowsGuideOpen(true)}
      />

      <main className="flex-1 max-w-[1240px] w-full mx-auto px-6 py-10 sm:py-14 space-y-14">
        {/* Editorial Studio Intro & Uploader */}
        <section ref={uploadSectionRef} className="space-y-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#9A7B34]">
              Let Your Brilliance Reign
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl font-semibold text-[#0F1B33] mt-2 leading-tight [text-wrap:balance]">
              Jewellery Photography Studio, Preserved Pixel-for-Pixel
            </h1>
            <p className="text-base text-[#475569] mt-3 leading-relaxed max-w-2xl">
              Remove studio backgrounds locally in your browser with zero API cost.
              Every stone, metal finish, clasp, chain, and proportion stays untouched
              across Pure White, Midnight Navy, and Champagne Beige in all three
              Instagram formats.
            </p>
          </div>

          {!originalFile && !isProcessing && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-10 sm:p-14 text-center cursor-pointer transition-colors duration-200 ${
                isDragActive
                  ? 'border-[#B59449] bg-[#FAF9F6]'
                  : 'border-[#D8D2C5] bg-[#FAF9F6]/60 hover:border-[#B59449] hover:bg-[#FAF9F6]'
              }`}
            >
              <input {...getInputProps()} />
              <div className="mx-auto h-12 w-12 rounded-full border border-[#E6E1D6] bg-white flex items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-[#0F1B33]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.6}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <p className="text-lg font-semibold text-[#0F1B33]">
                Drop your jewellery photograph here
              </p>
              <p className="text-sm text-[#64748B] mt-1">
                or click to browse · PNG, JPG, WEBP up to 15MB · 100% local processing
              </p>
              {error && (
                <p className="mt-4 text-sm text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5 rounded-lg inline-block">
                  {error}
                </p>
              )}
            </div>
          )}

          {isProcessing && (
            <Spinner message="Preparing your jewellery photograph locally..." />
          )}
        </section>

        {/* Active Studio Workspace */}
        {originalFile && loadedImage && !isProcessing && (
          <>
            <section id="studio" className="pt-10 border-t border-[#E6E1D6] space-y-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-widest uppercase text-[#9A7B34]">
                    01. Cutout &amp; Studio Framing
                  </p>
                  <h2 className="font-serif text-3xl font-semibold text-[#0F1B33] mt-1">
                    Original Piece &amp; Studio Cutout
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={handleResetProject}
                  className="px-4 py-2 text-xs font-semibold text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449] transition-colors whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  Upload Different Photo
                </button>
              </div>

              {error && (
                <div className="p-3.5 text-sm text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
                  {error}
                </div>
              )}

              {/* Side-by-Side Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <div className="border border-[#E6E1D6] rounded-xl bg-white p-5 flex flex-col">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-[#0F1B33]">
                      Original Photo (Unmodified Reference)
                    </h3>
                    {originalSize && (
                      <span className="text-xs text-[#64748B] tabular-nums">
                        {originalSize.width} × {originalSize.height} px
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-h-[320px] bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg p-4 flex items-center justify-center">
                    <img
                      src={originalDataUrl}
                      alt="Original uploaded jewellery"
                      className="max-h-[360px] max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <p className="text-xs text-[#64748B] mt-3">
                    {originalFile.name} · Jewellery shape, stone positions, metal finish,
                    and clasps are never altered.
                  </p>
                </div>

                <div className="border border-[#E6E1D6] rounded-xl bg-white p-5 flex flex-col">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-semibold text-[#0F1B33]">
                      Studio Preview
                    </h3>
                    <div className="flex items-center gap-1 p-1 bg-[#F7F5F0] border border-[#E6E1D6] rounded-lg">
                      <button
                        type="button"
                        onClick={() => setPreviewBackdrop('checker')}
                        className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                          previewBackdrop === 'checker'
                            ? 'bg-white text-[#0F1B33] shadow-sm'
                            : 'text-[#475569] hover:text-[#0F1B33]'
                        }`}
                      >
                        Cutout
                      </button>
                      {BACKGROUND_PRESETS.map((bg) => (
                        <button
                          key={bg.id}
                          type="button"
                          onClick={() => setPreviewBackdrop(bg.id)}
                          className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                            previewBackdrop === bg.id
                              ? 'bg-white text-[#0F1B33] shadow-sm'
                              : 'text-[#475569] hover:text-[#0F1B33]'
                          }`}
                        >
                          {bg.label.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div
                    className="flex-1 min-h-[320px] border border-[#E6E1D6] rounded-lg p-4 flex items-center justify-center overflow-hidden"
                    style={
                      previewBackdrop === 'checker'
                        ? {
                            backgroundImage:
                              'linear-gradient(45deg, #F1F5F9 25%, transparent 25%), linear-gradient(-45deg, #F1F5F9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #F1F5F9 75%), linear-gradient(-45deg, transparent 75%, #F1F5F9 75%)',
                            backgroundSize: '20px 20px',
                            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
                          }
                        : undefined
                    }
                  >
                    {livePreviewUrl && (
                      <img
                        src={livePreviewUrl}
                        alt="Studio cutout preview"
                        onClick={handleCutoutPreviewClick}
                        title={
                          previewBackdrop === 'checker' &&
                          cutoutSettings.mode === 'auto' &&
                          !hasExistingAlpha
                            ? 'Click any enclosed background inside rings or chains to clear it'
                            : 'Switch to Cutout tab to click-clear inner areas'
                        }
                        className={`max-h-[360px] max-w-full object-contain ${
                          previewBackdrop === 'checker' &&
                          cutoutSettings.mode === 'auto' &&
                          !hasExistingAlpha
                            ? 'cursor-crosshair'
                            : ''
                        }`}
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>

                  <p className="text-xs text-[#64748B] mt-3">
                    {hasExistingAlpha
                      ? 'Transparent PNG detected—your original transparency is preserved directly.'
                      : previewBackdrop === 'checker' && cutoutSettings.mode === 'auto'
                        ? 'Tip: Click inside enclosed ring bands, bangles, or chain loops above to clear trapped background.'
                        : 'Select the Cutout preview tab above if you need to click-clear an enclosed ring or chain loop.'}
                  </p>
                </div>
              </div>

              {/* Beginner-Friendly Controls */}
              <div className="p-6 bg-[#FAF9F6] border border-[#E6E1D6] rounded-xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E6E1D6]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]">
                      Cutout Mode
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-white border border-[#E6E1D6] rounded-lg">
                      <button
                        type="button"
                        onClick={() =>
                          setCutoutSettings((prev) => ({ ...prev, mode: 'auto' }))
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          cutoutSettings.mode === 'auto'
                            ? 'bg-[#0F1B33] text-white'
                            : 'text-[#475569] hover:text-[#0F1B33]'
                        }`}
                      >
                        Auto Studio Cutout
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setCutoutSettings((prev) => ({ ...prev, mode: 'original' }))
                        }
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                          cutoutSettings.mode === 'original'
                            ? 'bg-[#0F1B33] text-white'
                            : 'text-[#475569] hover:text-[#0F1B33]'
                        }`}
                      >
                        Keep Full Photo
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {cutoutSettings.manualClearPoints.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          setCutoutSettings((prev) => ({
                            ...prev,
                            manualClearPoints: prev.manualClearPoints.slice(0, -1),
                          }))
                        }
                        className="px-3 py-1.5 text-xs font-medium text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449]"
                      >
                        Undo Inner Clear ({cutoutSettings.manualClearPoints.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setCutoutSettings(DEFAULT_CUTOUT_SETTINGS)}
                      className="px-3 py-1.5 text-xs font-medium text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449]"
                    >
                      Reset Studio Settings
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#0F1B33] mb-2">
                      <label htmlFor="tolerance-range">Background Tolerance</label>
                      <span className="tabular-nums text-[#64748B]">
                        {cutoutSettings.tolerance}
                      </span>
                    </div>
                    <input
                      id="tolerance-range"
                      type="range"
                      min={5}
                      max={85}
                      value={cutoutSettings.tolerance}
                      disabled={cutoutSettings.mode !== 'auto' || hasExistingAlpha}
                      onChange={(e) =>
                        setCutoutSettings((prev) => ({
                          ...prev,
                          tolerance: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0F1B33] disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#0F1B33] mb-2">
                      <label htmlFor="feather-range">Edge Smoothness</label>
                      <span className="tabular-nums text-[#64748B]">
                        {cutoutSettings.edgeFeather}
                      </span>
                    </div>
                    <input
                      id="feather-range"
                      type="range"
                      min={0}
                      max={10}
                      value={cutoutSettings.edgeFeather}
                      disabled={cutoutSettings.mode !== 'auto' || hasExistingAlpha}
                      onChange={(e) =>
                        setCutoutSettings((prev) => ({
                          ...prev,
                          edgeFeather: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0F1B33] disabled:opacity-40"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-medium text-[#0F1B33] mb-2">
                      <label htmlFor="scale-range">Jewellery Scale</label>
                      <span className="tabular-nums text-[#64748B]">
                        {cutoutSettings.scale}%
                      </span>
                    </div>
                    <input
                      id="scale-range"
                      type="range"
                      min={48}
                      max={86}
                      value={cutoutSettings.scale}
                      onChange={(e) =>
                        setCutoutSettings((prev) => ({
                          ...prev,
                          scale: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0F1B33]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs font-medium text-[#0F1B33] mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cutoutSettings.shadowEnabled}
                          onChange={(e) =>
                            setCutoutSettings((prev) => ({
                              ...prev,
                              shadowEnabled: e.target.checked,
                            }))
                          }
                          className="accent-[#0F1B33] rounded"
                        />
                        Subtle Studio Shadow
                      </label>
                      <span className="tabular-nums text-[#64748B]">
                        {cutoutSettings.shadowEnabled
                          ? `${cutoutSettings.shadowIntensity}%`
                          : 'Off'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={75}
                      value={cutoutSettings.shadowIntensity}
                      disabled={!cutoutSettings.shadowEnabled}
                      onChange={(e) =>
                        setCutoutSettings((prev) => ({
                          ...prev,
                          shadowIntensity: Number(e.target.value),
                        }))
                      }
                      className="w-full accent-[#0F1B33] disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Section 2: All 9 Social Renders across 3 Luxury Backgrounds */}
            <SocialGallery
              socialRenders={socialRenders}
              backgroundMasters={backgroundMasters}
              cutoutDataUrl={cutoutDataUrl}
              productSlug={productSlug}
              onInspect={(title, dataUrl, subtitle) =>
                setLightbox({ title, dataUrl, subtitle })
              }
            />

            {/* Section 3: Editable Product Details & Social Captions */}
            <CopyEditorPanel
              content={content}
              specs={specs}
              onContentChange={setContent}
              onSpecsChange={setSpecs}
              onRegenerateTemplates={handleRegenerateTemplates}
            />

            {/* Section 4: Complete ZIP Package Download */}
            <section
              id="export"
              className="pt-12 border-t border-[#E6E1D6] pb-6"
            >
              <div className="p-6 sm:p-8 bg-[#0F1B33] text-white rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold tracking-[0.18em] uppercase text-[#D9BE7B]">
                    04. Complete Studio Export
                  </p>
                  <h2 className="font-serif text-3xl font-semibold mt-1">
                    Download Full Asset &amp; Copy Package (.ZIP)
                  </h2>
                  <p className="text-sm text-[#CBD5E1] mt-2 max-w-2xl">
                    Includes your original uploaded photo, transparent cutout PNG, all 3
                    luxury backgrounds (1600px), all 9 social media sizes (1080×1080,
                    1080×1350, 1080×1920), and product details in both TXT and JSON
                    formats.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExporting}
                  className="px-6 py-3.5 text-sm font-semibold text-[#0F1B33] bg-[#E8D5A7] hover:bg-[#F3E6C4] rounded-lg transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
                >
                  {isExporting ? 'Building ZIP Archive...' : 'Download Complete ZIP'}
                </button>
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="border-t border-[#E6E1D6] bg-white">
        <div className="max-w-[1240px] mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
          <span>
            REISTELLA AI PRODUCT STUDIO · Let Your Brilliance Reign
          </span>
          <button
            type="button"
            onClick={() => setIsWindowsGuideOpen(true)}
            className="text-[#0F1B33] hover:underline underline-offset-4 decoration-[#B59449]"
          >
            Windows Offline Model Guide (rembg)
          </button>
        </div>
      </footer>

      {/* Lightbox Modal */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-[#0F1B33]/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-4 pb-3 mb-4 border-b border-[#E6E1D6]">
              <div>
                <h3 className="text-base font-semibold text-[#0F1B33]">
                  {lightbox.title}
                </h3>
                <p className="text-xs text-[#64748B] tabular-nums">{lightbox.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="h-9 w-9 rounded-lg border border-[#E6E1D6] text-[#0F1B33] hover:bg-[#FAF9F6] flex items-center justify-center text-lg"
                aria-label="Close preview"
              >
                &times;
              </button>
            </div>
            <div className="bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg p-4 flex items-center justify-center max-h-[72vh] overflow-hidden">
              <img
                src={lightbox.dataUrl}
                alt={lightbox.title}
                className="max-h-[65vh] max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      <WindowsModelGuideModal
        isOpen={isWindowsGuideOpen}
        onClose={() => setIsWindowsGuideOpen(false)}
      />
    </div>
  );
};

export default App;