"use client";
// Search box that opens a state/county/town list only while it's in use —
// the replacement for the always-open UsGeoList sidebar beside the maps.
// Shares the caller's onSelect with the map's own Geography onClick, so the
// two ways of picking a place still go through one navigation handler.
//
// The list is an overlay, not an in-flow block: it never pushes the map
// down. It's positioned against the nearest positioned ancestor (MapNavBar's
// sticky row), so it spans the whole row instead of just the input's width.
// Nothing is rendered for the options while closed — a state's county list
// (or a county's towns) can run to several hundred rows.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { UsGeoListItem } from "@/components/us/UsGeoList";

export default function GeoCombobox({
  items,
  onSelect,
  placeholder,
  emptyText,
  selectedId,
}: {
  items: UsGeoListItem[];
  onSelect: (id: string) => void;
  placeholder: string;
  emptyText: string;
  selectedId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const sorted = useMemo(() => [...items].sort((a, b) => a.name.localeCompare(b.name)), [items]);

  const filtered = useMemo(() => {
    if (!open) return [];
    const q = query.trim().toLowerCase();
    return q ? sorted.filter((item) => item.name.toLowerCase().includes(q)) : sorted;
  }, [open, sorted, query]);

  // Outside press closes. pointerdown (not click) so a press that starts on
  // the map closes the list before the map handles the click itself.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const option = listRef.current?.children[activeIndex] as HTMLElement | undefined;
    option?.scrollIntoView({ block: "nearest" });
  }, [open, activeIndex]);

  function close() {
    setOpen(false);
    setActiveIndex(0);
  }

  function choose(id: string) {
    close();
    setQuery("");
    inputRef.current?.blur();
    onSelect(id);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => (filtered.length ? (i + step + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      const item = filtered[activeIndex];
      if (open && item) {
        e.preventDefault();
        choose(item.id);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    }
  }

  const activeOptionId = open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined;

  return (
    <div ref={rootRef} className="min-w-0 flex-1 sm:max-w-xs">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-label={placeholder}
          value={query}
          onFocus={() => setOpen(true)}
          // Already-focused input (e.g. after Esc closed the list): a click
          // fires no new focus event, so reopen on click too.
          onClick={() => setOpen(true)}
          // Tabbing away closes it too (outside presses are handled above).
          onBlur={close}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(0);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          // 16px on phones: iOS Safari zooms the whole page into any input
          // with a smaller font on focus.
          className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.06] pl-8 pr-2.5 text-[16px] text-white outline-none transition-colors placeholder:text-white/40 focus:border-[#34D399] focus:bg-white/[0.09] sm:text-[13px]"
        />
      </div>
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          // Keeps a press inside the list from blurring the input (which
          // would close it) before the option click lands.
          onPointerDown={(e) => e.preventDefault()}
          className="us-geo-list-scroll absolute inset-x-2 top-full z-30 mt-1 max-h-[50vh] overflow-y-auto rounded-lg border border-white/15 bg-[#0d0f11] py-1 shadow-2xl shadow-black/60 sm:inset-x-3"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-5 text-center text-[13px] text-white/45">{emptyText}</li>
          ) : (
            filtered.map((item, i) => (
              <li
                key={item.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                onClick={() => choose(item.id)}
                onMouseMove={() => setActiveIndex(i)}
                className={`flex min-h-11 cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[14px] ${
                  i === activeIndex ? "bg-white/[0.08] text-white" : item.id === selectedId ? "text-white" : "text-white/80"
                }`}
              >
                <span className="truncate">{item.name}</span>
                {item.sub && <span className="shrink-0 tabular-nums text-[13px] text-white/45">{item.sub}</span>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
