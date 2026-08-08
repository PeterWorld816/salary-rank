"use client";
import { useState } from "react";
import { toBlob } from "html-to-image";
import type { RefObject } from "react";
import { Share2, Download, Sparkles } from "lucide-react";
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

export default function ShareButtons({
  cardRef,
  shareTitle,
  shareText,
  downloadName,
  width,
  height,
  storyCardRef,
  storyWidth,
  storyHeight,
  storyDownloadName,
}: {
  cardRef: RefObject<HTMLDivElement>;
  shareTitle: string;
  shareText: string;
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
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const hasStory = Boolean(storyCardRef && storyWidth && storyHeight);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast(t.copied);
    } catch {
      showToast(t.shareFailed);
    }
  };

  const handleSave = async () => {
    if (!cardRef.current || saving) return;
    setSaving(true);
    try {
      await saveNode(cardRef.current, width, height, downloadName);
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
      await saveNode(storyCardRef.current, storyWidth, storyHeight, storyDownloadName ?? `story-${downloadName}`);
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
        <button onClick={handleShare} className="btn btn-primary flex-col gap-1 h-[72px]">
          <Share2 className="w-5 h-5" />
          <span className="text-caption font-semibold">{t.share}</span>
        </button>
        <button onClick={handleSave} disabled={saving} className="btn btn-secondary flex-col gap-1 h-[72px]">
          {saving ? (
            <Spinner />
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span className="text-caption font-semibold">{t.save}</span>
            </>
          )}
        </button>
        {hasStory && (
          <button onClick={handleSaveStory} disabled={savingStory} className="btn btn-secondary flex-col gap-1 h-[72px]">
            {savingStory ? (
              <Spinner />
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span className="text-caption font-semibold">{t.saveStory}</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
