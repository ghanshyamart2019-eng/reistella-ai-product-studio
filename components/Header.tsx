import React from 'react';

interface HeaderProps {
  hasProject: boolean;
  isExporting: boolean;
  onDownloadZip: () => void;
  onScrollToUpload: () => void;
  onOpenWindowsGuide: () => void;
}

const Header: React.FC<HeaderProps> = ({
  hasProject,
  isExporting,
  onDownloadZip,
  onScrollToUpload,
  onOpenWindowsGuide,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-[#E6E1D6]">
      <div className="max-w-[1240px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
        <a
          href="#top"
          className="font-serif text-xl sm:text-2xl font-semibold tracking-wide text-[#0F1B33] whitespace-nowrap shrink-0"
        >
          REISTELLA AI PRODUCT STUDIO
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#334155]">
          <a
            href="#studio"
            className="hover:text-[#0F1B33] hover:underline underline-offset-4 decoration-[#B59449] transition-colors whitespace-nowrap shrink-0"
          >
            Studio
          </a>
          <a
            href="#gallery"
            className="hover:text-[#0F1B33] hover:underline underline-offset-4 decoration-[#B59449] transition-colors whitespace-nowrap shrink-0"
          >
            Social Sizes
          </a>
          <a
            href="#copy"
            className="hover:text-[#0F1B33] hover:underline underline-offset-4 decoration-[#B59449] transition-colors whitespace-nowrap shrink-0"
          >
            Product Copy
          </a>
          <button
            type="button"
            onClick={onOpenWindowsGuide}
            className="hover:text-[#0F1B33] hover:underline underline-offset-4 decoration-[#B59449] transition-colors whitespace-nowrap shrink-0"
          >
            Windows Guide
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          {hasProject ? (
            <button
              type="button"
              onClick={onDownloadZip}
              disabled={isExporting}
              className="px-4 py-2 text-xs font-semibold tracking-wide text-white bg-[#0F1B33] border border-[#B59449]/60 rounded-lg hover:bg-[#192B4F] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {isExporting ? 'Preparing ZIP...' : 'Download ZIP'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onScrollToUpload}
              className="px-4 py-2 text-xs font-semibold tracking-wide text-white bg-[#0F1B33] border border-[#B59449]/60 rounded-lg hover:bg-[#192B4F] transition-colors whitespace-nowrap shrink-0"
            >
              Upload Photo
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
