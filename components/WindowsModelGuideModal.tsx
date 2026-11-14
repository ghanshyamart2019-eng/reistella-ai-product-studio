import React, { useEffect } from 'react';

interface WindowsModelGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WindowsModelGuideModal: React.FC<WindowsModelGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#0F1B33]/65 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="windows-guide-title"
    >
      <div
        className="bg-white border border-[#E6E1D6] rounded-xl max-w-2xl w-full max-h-[88vh] overflow-y-auto p-6 sm:p-8 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E6E1D6]">
          <div>
            <p className="text-xs font-medium tracking-widest uppercase text-[#9A7B34]">
              Optional Offline Desktop Tool
            </p>
            <h2
              id="windows-guide-title"
              className="font-serif text-2xl font-semibold text-[#0F1B33] mt-1"
            >
              Running a Local Background Removal Model on Windows
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg border border-[#E6E1D6] text-[#0F1B33] hover:bg-[#F7F5F0] transition-colors flex items-center justify-center shrink-0"
            aria-label="Close guide"
          >
            &times;
          </button>
        </div>

        <div className="mt-5 space-y-5 text-sm leading-relaxed text-[#334155]">
          <p>
            REISTELLA removes clean studio and table backgrounds directly inside your
            browser at zero cost. If you photograph jewellery against busy outdoor
            surfaces or complex textures and want neural segmentation on your Windows
            PC first, you can run the free, open-source{' '}
            <strong className="text-[#0F1B33]">rembg</strong> tool locally and drop
            the resulting transparent PNG into REISTELLA.
          </p>

          <div>
            <h3 className="font-semibold text-[#0F1B33] mb-1.5">
              1. Install Python 3.10 or 3.11 for Windows
            </h3>
            <p>
              Download Python from <span className="font-medium text-[#0F1B33]">python.org</span>{' '}
              and check <em>&ldquo;Add python.exe to PATH&rdquo;</em> during setup.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F1B33] mb-1.5">
              2. Install rembg in Windows PowerShell or Command Prompt
            </h3>
            <pre className="bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg p-3.5 text-xs font-mono text-[#0F1B33] overflow-x-auto">
              pip install &quot;rembg[cli]&quot;
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F1B33] mb-1.5">
              3. Download the local model and remove a background offline
            </h3>
            <p className="mb-2">
              The first command automatically downloads the open-source{' '}
              <code className="text-[#0F1B33] font-mono text-xs">u2net</code> or{' '}
              <code className="text-[#0F1B33] font-mono text-xs">birefnet-general</code>{' '}
              weights to your Windows user folder (<code className="font-mono text-xs">C:\Users\&lt;You&gt;\.u2net</code>).
              After that, it runs 100% offline with zero API keys:
            </p>
            <pre className="bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg p-3.5 text-xs font-mono text-[#0F1B33] overflow-x-auto">
{`rembg i photo.jpg cutout.png
rembg i -m birefnet-general photo.jpg cutout_hq.png`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-[#0F1B33] mb-1.5">
              4. Batch-process an entire folder of jewellery photos
            </h3>
            <pre className="bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg p-3.5 text-xs font-mono text-[#0F1B33] overflow-x-auto">
              rembg p C:\Jewellery\raw_photos C:\Jewellery\cutouts
            </pre>
            <p className="mt-2">
              Upload any <code className="font-mono text-xs">.png</code> cutout into
              REISTELLA—it automatically detects existing transparency and preserves
              your exact piece for all 3 backgrounds, shadows, and 9 social media
              exports.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-[#E6E1D6] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#0F1B33] rounded-lg hover:bg-[#192B4F] transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default WindowsModelGuideModal;
