"use client";
import { useEffect, useState } from "react";
import { toBlob } from "html-to-image";
import type { ReactNode, RefObject } from "react";
import { createPortal } from "react-dom";
import { Share2, Download, Sparkles, Copy, X } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import Spinner from "@/components/Spinner";

// iOS Safari (and in-app browsers built on it, e.g. Instagram/KakaoTalk's
// webview) largely ignores <a download> for blob/data URLs — clicking it
// just navigates instead of saving. The reliable path there is to open the
// image directly so the user can long-press -> "Add to Photos", same motion
// as saving any other photo from the web.
function isIosWebkit(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iP(hone|ad|od)/.test(navigator.userAgent) && !("MSStream" in window);
}

async function saveNode(node: HTMLElement, width: number, height: number, filename: string) {
  const blob = await toBlob(node, {
    pixelRatio: 3,
    width,
    height,
    style: { borderRadius: "0px" },
    backgroundColor: "#0D0D0D",
  });
  if (!blob) throw new Error("toBlob returned null");
  const blobUrl = URL.createObjectURL(blob);

  if (isIosWebkit()) {
    window.open(blobUrl, "_blank");
  } else {
    const a = document.createElement("a");
    a.download = filename;
    a.href = blobUrl;
    a.click();
  }
  // Give the new tab/download time to actually read the blob before it's freed.
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

async function saveUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Image request failed: ${response.status}`);
  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);

  if (isIosWebkit()) {
    window.open(blobUrl, "_blank");
  } else {
    const a = document.createElement("a");
    a.download = filename;
    a.href = blobUrl;
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
}

export default function ShareButtons({
  cardRef,
  shareTitle,
  shareText,
  getShareUrl,
  downloadName,
  width,
  height,
  storyCardRef,
  storyWidth,
  storyHeight,
  storyDownloadName,
  cardPreview,
  storyPreview,
  downloadImageUrl,
  downloadStoryUrl,
}: {
  cardRef: RefObject<HTMLDivElement>;
  shareTitle: string;
  shareText: string;
  getShareUrl: () => string;
  downloadName: string;
  width: number;
  height: number;
  // Optional — when a hidden Instagram/Snapchat Story-ratio (9:16) card is
  // mounted elsewhere on the page, pass its ref/dimensions here to add a
  // third "Save Story" button that rasterizes that node instead.
  storyCardRef?: RefObject<HTMLDivElement>;
  storyWidth?: number;
  storyHeight?: number;
  storyDownloadName?: string;
  cardPreview: ReactNode;
  storyPreview?: ReactNode;
  downloadImageUrl?: string;
  downloadStoryUrl?: string;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const hasStory = Boolean(storyCardRef && storyWidth && storyHeight);

  useEffect(() => {
    if (!previewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPreviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewOpen]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleShare = async () => {
    const url = `${window.location.origin}${getShareUrl()}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      showToast(t.copied);
    } catch {
      showToast(t.shareFailed);
    }
  };

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${getShareUrl()}`;
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      showToast(t.copied);
    } catch {
      showToast(t.shareFailed);
    }
  };

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      if (downloadImageUrl) {
        await saveUrl(downloadImageUrl, downloadName);
      } else {
        await saveNode(cardRef.current, width, height, downloadName);
      }
    } catch {
      showToast(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveStory = async () => {
    if (!storyCardRef?.current || !storyWidth || !storyHeight || savingStory) return;
    setSavingStory(true);
    try {
      if (downloadStoryUrl) {
        await saveUrl(downloadStoryUrl, storyDownloadName ?? `story-${downloadName}`);
      } else {
        await saveNode(storyCardRef.current, storyWidth, storyHeight, storyDownloadName ?? `story-${downloadName}`);
      }
    } catch {
      showToast(t.saveFailed);
    } finally {
      setSavingStory(false);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 fade-up">
          <div className="rounded-md px-5 py-3 text-body font-semibold text-white shadow-lg whitespace-nowrap bg-text">
            {toast}
          </div>
        </div>
      )}

      <div className={`grid gap-3 ${hasStory ? "grid-cols-3" : "grid-cols-2"}`}>
        <button onClick={() => setPreviewOpen(true)} className="btn btn-primary flex-col gap-1 h-[72px]">
          <Share2 className="w-5 h-5" />
          <span className="text-caption font-semibold">{t.share}</span>
        </button>
        <button onClick={() => setPreviewOpen(true)} className="btn btn-secondary flex-col gap-1 h-[72px]">
          <Download className="w-5 h-5" />
          <span className="text-caption font-semibold">{t.save}</span>
        </button>
        {hasStory && (
          <button onClick={() => setPreviewOpen(true)} className="btn btn-secondary flex-col gap-1 h-[72px]">
            <Sparkles className="w-5 h-5" />
            <span className="text-caption font-semibold">{t.saveStory}</span>
          </button>
        )}
      </div>

      {previewOpen && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPreviewOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={t.shareCardTitle}
            className="relative flex max-h-[94dvh] w-full flex-col items-center overflow-y-auto rounded-t-2xl border border-white/10 bg-[#111214] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-4 sm:max-w-xl sm:rounded-2xl sm:px-6 sm:pb-6"
          >
            <button
              type="button"
              onClick={() => setPreviewOpen(false)}
              aria-label={t.usDismiss}
              className="absolute right-3 top-3 z-10 rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 className="mb-3 pr-10 text-center text-base font-bold text-white">{t.shareCardTitle}</h2>
            <div className="mb-4 flex w-full flex-1 items-center justify-center overflow-hidden">
              <div
                className="overflow-hidden rounded-md"
                style={{
                  aspectRatio: `${width} / ${height}`,
                  width: `min(100%, 430px, ${68 * (width / height)}dvh)`,
                }}
              >
                {cardPreview}
              </div>
            </div>
            <p className="mb-3 text-center text-xs text-white/50">{t.shareCardDescription}</p>
            <div className="grid w-full grid-cols-2 gap-2">
              <button type="button" onClick={handleSave} disabled={saving} className="btn btn-secondary flex items-center justify-center gap-2">
                {saving ? <Spinner /> : <Download className="h-4 w-4" />}
                <span>{t.saveImageFormat}</span>
              </button>
              {hasStory && (
                <button type="button" onClick={handleSaveStory} disabled={savingStory} className="btn btn-secondary flex items-center justify-center gap-2">
                  {savingStory ? <Spinner /> : <Sparkles className="h-4 w-4" />}
                  <span>{t.saveStory}</span>
                </button>
              )}
              <button type="button" onClick={handleShare} className="btn btn-primary flex items-center justify-center gap-2">
                <Share2 className="h-4 w-4" />
                <span>{t.share}</span>
              </button>
              <button type="button" onClick={handleCopyLink} className="btn btn-secondary flex items-center justify-center gap-2">
                <Copy className="h-4 w-4" />
                <span>{t.copyLink}</span>
              </button>
            </div>
          </section>
          {hasStory && storyPreview && (
            <div className="pointer-events-none absolute left-[-9999px] top-0 overflow-hidden" aria-hidden="true">
              <div style={{ width: `${storyWidth}px` }}>{storyPreview}</div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
