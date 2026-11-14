import React, { useState } from 'react';
import { ProductContent, ProductSpecs } from '../types';
import {
  containsForbiddenCZ,
  JEWELLERY_CATEGORIES,
  parseHashtags,
  sanitizeNoCZ,
} from '../services/contentTemplateService';

interface CopyEditorPanelProps {
  content: ProductContent;
  specs: ProductSpecs;
  onContentChange: (next: ProductContent) => void;
  onSpecsChange: (next: ProductSpecs) => void;
  onRegenerateTemplates: () => void;
}

const CopyEditorPanel: React.FC<CopyEditorPanelProps> = ({
  content,
  specs,
  onContentChange,
  onSpecsChange,
  onRegenerateTemplates,
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showSpecs, setShowSpecs] = useState<boolean>(false);

  const hashtagCount = parseHashtags(content.hashtags).length;
  const hasCZWarning =
    containsForbiddenCZ(content.shortDescription) ||
    containsForbiddenCZ(content.detailedDescription) ||
    containsForbiddenCZ(content.instagramCaption) ||
    containsForbiddenCZ(content.facebookCaption) ||
    containsForbiddenCZ(content.hashtags) ||
    containsForbiddenCZ(content.productName);

  const handleCopy = async (fieldKey: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldKey);
      setTimeout(() => setCopiedField(null), 1600);
    } catch {
      // Clipboard fallback ignored if blocked
    }
  };

  const handleCleanCZ = () => {
    onContentChange({
      ...content,
      productName: sanitizeNoCZ(content.productName),
      shortDescription: sanitizeNoCZ(content.shortDescription),
      detailedDescription: sanitizeNoCZ(content.detailedDescription),
      instagramCaption: sanitizeNoCZ(content.instagramCaption),
      facebookCaption: sanitizeNoCZ(content.facebookCaption),
      hashtags: parseHashtags(content.hashtags).join(' '),
    });
  };

  return (
    <section id="copy" className="pt-12 border-t border-[#E6E1D6]">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-[#9A7B34]">
            03. Product Copy &amp; Social Captions
          </p>
          <h2 className="font-serif text-3xl font-semibold text-[#0F1B33] mt-1">
            Editable Listing &amp; Social Content
          </h2>
          <p className="text-sm text-[#475569] mt-1">
            Generated locally using REISTELLA rules—never invents purity, stone type,
            weight, dimensions, price, or plating, and never uses the term CZ.
          </p>
        </div>

        <button
          type="button"
          onClick={onRegenerateTemplates}
          className="px-4 py-2 text-xs font-semibold text-[#0F1B33] bg-[#FAF9F6] border border-[#E6E1D6] rounded-lg hover:border-[#B59449] transition-colors whitespace-nowrap shrink-0 self-start md:self-auto"
        >
          Apply Local Templates
        </button>
      </div>

      {hasCZWarning && (
        <div className="mb-6 p-4 bg-[#FFFBEB] border border-[#F59E0B]/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm text-[#78350F]">
            Notice: Public product descriptions must not contain the term{' '}
            <strong>CZ</strong>. Replace it with a confirmed stone description or
            placeholder before publishing.
          </p>
          <button
            type="button"
            onClick={handleCleanCZ}
            className="px-3 py-1.5 text-xs font-semibold text-[#0F1B33] bg-white border border-[#E6E1D6] rounded-lg hover:border-[#B59449] whitespace-nowrap shrink-0"
          >
            Replace CZ with Placeholder
          </button>
        </div>
      )}

      {/* Product Name & Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label
            htmlFor="product-name"
            className="block text-xs font-semibold tracking-wide uppercase text-[#0F1B33] mb-2"
          >
            Product Name
          </label>
          <input
            id="product-name"
            type="text"
            value={content.productName}
            onChange={(e) =>
              onContentChange({ ...content, productName: e.target.value })
            }
            placeholder="e.g. Aurelia Solitaire Ring"
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>

        <div>
          <label
            htmlFor="product-category"
            className="block text-xs font-semibold tracking-wide uppercase text-[#0F1B33] mb-2"
          >
            Product Category
          </label>
          <select
            id="product-category"
            value={content.category}
            onChange={(e) =>
              onContentChange({ ...content, category: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          >
            {JEWELLERY_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Optional Manual Specification Confirmation */}
      <div className="mb-8 border border-[#E6E1D6] rounded-xl bg-[#FAF9F6]">
        <button
          type="button"
          onClick={() => setShowSpecs((prev) => !prev)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-left"
        >
          <div>
            <span className="text-sm font-semibold text-[#0F1B33]">
              Manual Specifications (Optional Confirmation)
            </span>
            <span className="block text-xs text-[#64748B] mt-0.5">
              Leave fields blank to keep explicit confirmation placeholders—nothing is ever guessed.
            </span>
          </div>
          <span className="text-xs font-semibold text-[#9A7B34] whitespace-nowrap shrink-0 ml-4">
            {showSpecs ? 'Hide Fields' : 'Confirm Specs'}
          </span>
        </button>

        {showSpecs && (
          <div className="px-5 pb-5 pt-2 border-t border-[#E6E1D6] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Metal Purity
              </label>
              <input
                type="text"
                value={specs.metalPurity}
                onChange={(e) =>
                  onSpecsChange({ ...specs, metalPurity: e.target.value })
                }
                placeholder="[Confirm metal purity]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Stone Type
              </label>
              <input
                type="text"
                value={specs.stoneType}
                onChange={(e) =>
                  onSpecsChange({ ...specs, stoneType: e.target.value })
                }
                placeholder="[Confirm stone type]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Plating Details
              </label>
              <input
                type="text"
                value={specs.platingDetails}
                onChange={(e) =>
                  onSpecsChange({ ...specs, platingDetails: e.target.value })
                }
                placeholder="[Confirm plating details]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Product Weight
              </label>
              <input
                type="text"
                value={specs.weight}
                onChange={(e) =>
                  onSpecsChange({ ...specs, weight: e.target.value })
                }
                placeholder="[Confirm weight]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Dimensions
              </label>
              <input
                type="text"
                value={specs.dimensions}
                onChange={(e) =>
                  onSpecsChange({ ...specs, dimensions: e.target.value })
                }
                placeholder="[Confirm dimensions]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#334155] mb-1">
                Price
              </label>
              <input
                type="text"
                value={specs.price}
                onChange={(e) =>
                  onSpecsChange({ ...specs, price: e.target.value })
                }
                placeholder="[Confirm price]"
                className="w-full px-3 py-2 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33]"
              />
            </div>
          </div>
        )}
      </div>

      {/* Descriptions & Social Captions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="short-desc"
              className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]"
            >
              Short Product Description
            </label>
            <button
              type="button"
              onClick={() => handleCopy('short', content.shortDescription)}
              className="text-xs font-medium text-[#9A7B34] hover:text-[#0F1B33]"
            >
              {copiedField === 'short' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            id="short-desc"
            rows={4}
            value={content.shortDescription}
            onChange={(e) =>
              onContentChange({ ...content, shortDescription: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="detailed-desc"
              className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]"
            >
              Detailed Product Description
            </label>
            <button
              type="button"
              onClick={() => handleCopy('detailed', content.detailedDescription)}
              className="text-xs font-medium text-[#9A7B34] hover:text-[#0F1B33]"
            >
              {copiedField === 'detailed' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            id="detailed-desc"
            rows={7}
            value={content.detailedDescription}
            onChange={(e) =>
              onContentChange({ ...content, detailedDescription: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="ig-caption"
              className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]"
            >
              Instagram Caption
            </label>
            <button
              type="button"
              onClick={() => handleCopy('ig', content.instagramCaption)}
              className="text-xs font-medium text-[#9A7B34] hover:text-[#0F1B33]"
            >
              {copiedField === 'ig' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            id="ig-caption"
            rows={5}
            value={content.instagramCaption}
            onChange={(e) =>
              onContentChange({ ...content, instagramCaption: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="fb-caption"
              className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]"
            >
              Facebook Caption
            </label>
            <button
              type="button"
              onClick={() => handleCopy('fb', content.facebookCaption)}
              className="text-xs font-medium text-[#9A7B34] hover:text-[#0F1B33]"
            >
              {copiedField === 'fb' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            id="fb-caption"
            rows={5}
            value={content.facebookCaption}
            onChange={(e) =>
              onContentChange({ ...content, facebookCaption: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>

        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-2">
            <label
              htmlFor="hashtags"
              className="text-xs font-semibold tracking-wide uppercase text-[#0F1B33]"
            >
              Hashtags
            </label>
            <div className="flex items-center gap-4 text-xs">
              <span
                className={`tabular-nums ${
                  hashtagCount >= 8 && hashtagCount <= 12
                    ? 'text-[#475569]'
                    : 'text-[#B45309] font-medium'
                }`}
              >
                {hashtagCount} hashtags · target 8–12
              </span>
              <button
                type="button"
                onClick={() => handleCopy('hashtags', content.hashtags)}
                className="font-medium text-[#9A7B34] hover:text-[#0F1B33]"
              >
                {copiedField === 'hashtags' ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <textarea
            id="hashtags"
            rows={2}
            value={content.hashtags}
            onChange={(e) =>
              onContentChange({ ...content, hashtags: e.target.value })
            }
            className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D8D2C5] rounded-lg text-[#0F1B33] focus:outline-none focus:border-[#0F1B33] focus:ring-1 focus:ring-[#B59449]"
          />
        </div>
      </div>
    </section>
  );
};

export default CopyEditorPanel;
