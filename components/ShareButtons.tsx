"use client";
import { useState } from "react";
import { toPng } from "html-to-image";
import type { RefObject } from "react";
import { Share2, Download } from "lucide-react";
import { useLanguage } from "@/lib/LanguageProvider";
import Spinner from "@/components/Spinner";

export default function ShareButtons({
  cardRef, shareTitle, shareText, downloadName, width, height,
}: {
  cardRef: RefObject<HTMLDivElement>;
  shareTitle: string;
  shareText: string;
  downloadName: string;
  width: number;
  height: number;
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
          <div className="rounded-md px-5 py-3 text-body font-semibold text-white shadow-lg whitespace-nowrap bg-text">
            {toast}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
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
      </div>
    </div>
  );
}
