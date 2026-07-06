"use client";
import { useState } from "react";
import { toPng } from "html-to-image";
import type { RefObject } from "react";
import { useLanguage } from "@/lib/i18n";
import { CARD_WIDTH, CARD_HEIGHT } from "@/components/ResultCard";

export default function ShareButtons({
  cardRef, shareTitle, shareText, downloadName, width = CARD_WIDTH, height = CARD_HEIGHT,
}: {
  cardRef: RefObject<HTMLDivElement>;
  shareTitle: string;
  shareText: string;
  downloadName: string;
  width?: number;
  height?: number;
}) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

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
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 3,
        width,
        height,
        style: { borderRadius: "0px" },
        backgroundColor: "#0D0D0D",
      });
      const a = document.createElement("a");
      a.download = downloadName;
      a.href = dataUrl;
      a.click();
    } catch {
      showToast(t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 fade-up">
          <div className="rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-xl whitespace-nowrap bg-[#0D0D0D]">
            {toast}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleShare}
          className="card-hover rounded-xl py-4 flex flex-col items-center justify-center gap-1 bg-[#0D0D0D] text-white"
        >
          <span className="text-xl">↗</span>
          <span className="text-xs font-semibold">{t.share}</span>
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="card-hover rounded-xl py-4 flex flex-col items-center justify-center gap-1 text-white disabled:opacity-60"
          style={{ background: "#00C805" }}
        >
          {saving ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-xl">↓</span>
              <span className="text-xs font-semibold">{t.save}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
