"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { LANGUAGES, type LangCode } from "@/lib/i18n";
import { useLanguage } from "@/lib/LanguageProvider";

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

  return (
    <div ref={ref} className="relative z-50">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-caption font-medium text-text shadow-sm transition-all active:scale-[0.98]"
        style={{ border: "1px solid var(--color-border)" }}
      >
        <Globe className="w-3.5 h-3.5 text-text-tertiary" />
        <span className="uppercase">{lang}</span>
        <ChevronDown className={`w-3 h-3 text-text-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full mt-2 w-44 overflow-hidden rounded-lg bg-white shadow-lg"
          style={{ border: "1px solid var(--color-border)", animation: "langDrop 0.15s ease both" }}
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
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-caption transition-colors ${
                      active ? "bg-accent-tint text-accent font-semibold" : "text-text"
                    }`}
                  >
                    <span className="flex-1 text-left">{l.label}</span>
                    {active && <Check className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />}
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
