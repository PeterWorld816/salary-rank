"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, LANGUAGES, type LangCode } from "@/lib/i18n";

const FLAGS: Record<LangCode, string> = {
  ko: "🇰🇷",
  en: "🇺🇸",
};

export default function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function select(code: LangCode) {
    setLang(code);
    setOpen(false);
  }

  const currentMeta = LANGUAGES.find((l) => l.code === lang);

  return (
    <div ref={ref} className="relative z-50">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-[#E5E5E0] bg-white px-3 py-1.5 text-sm font-medium text-[#374151] shadow-sm transition-all active:scale-95 hover:border-[#D1D5DB]"
      >
        <span className="text-base leading-none">{FLAGS[lang]}</span>
        <span className="hidden sm:inline text-[13px]">{currentMeta?.label}</span>
        <svg
          className={`h-3 w-3 text-[#9CA3AF] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        >
          <path d="M2 4l4 4 4-4" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-[#E5E5E0] bg-white shadow-xl"
          style={{ animation: "langDrop 0.15s ease both" }}
        >
          <style>{`
            @keyframes langDrop {
              from { opacity: 0; transform: translateY(-6px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0)   scale(1); }
            }
          `}</style>

          <ul className="py-1.5">
            {LANGUAGES.map((l) => {
              const active = lang === l.code;
              return (
                <li key={l.code}>
                  <button
                    role="option"
                    aria-selected={active}
                    onClick={() => select(l.code)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm transition-colors"
                    style={{
                      background: active ? "#F0FDF4" : "transparent",
                      color:      active ? "#059669" : "#374151",
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span className="text-base leading-none">{FLAGS[l.code]}</span>
                    <span className="flex-1 text-left">{l.label}</span>
                    {active && (
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 14 14" fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M2 7l3.5 3.5L12 3" />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
