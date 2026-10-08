"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { decodeUsInput, DEFAULT_US_INPUT, isDefaultUsInputSelection, type UsInput } from "@/lib/usInput";
import { isMapBasisLens, type UsMapBasisLens } from "@/components/us/mapBasisLens";

type UsInputContextValue = {
  input: UsInput;
  setInput: (input: UsInput) => void;
  mapLens: UsMapBasisLens;
  setMapLens: (lens: UsMapBasisLens) => void;
  inputUrlCleaned: boolean;
  // One-shot "open the input panel" request (e.g. arriving from an
  // occupation or net worth page's calculator link); UsInputPanel consumes it.
  panelRequest: "main" | "netWorth" | null;
  requestPanel: (which: "main" | "netWorth" | null) => void;
};

const UsInputContext = createContext<UsInputContextValue | null>(null);

export function UsInputProvider({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [input, setInput] = useState<UsInput>(DEFAULT_US_INPUT);
  const [mapLens, setMapLens] = useState<UsMapBasisLens>("marital");
  const [inputUrlCleaned, setInputUrlCleaned] = useState(false);
  const [panelRequest, requestPanel] = useState<"main" | "netWorth" | null>(null);

  useEffect(() => {
    const isUsRoute = pathname === "/us" || pathname.startsWith("/us/") || pathname === "/kr" || pathname.startsWith("/kr/");
    const params = new URLSearchParams(window.location.search);
    const encodedInput = params.get("d");
    const sharedInput = encodedInput ? decodeUsInput(encodedInput) : null;
    const rawLens = params.get("lens");
    // Links shared before the gender tab split into Men/Women still carry
    // "?lens=gender" — that meant "my own gender", so map it the same way.
    const sharedLens =
      rawLens === "gender" ? ((sharedInput?.gender ?? DEFAULT_US_INPUT.gender) === "female" ? "women" : "men") : rawLens;
    const isKnownLens = isMapBasisLens(sharedLens);

    if (sharedInput) {
      setInput(sharedInput);
      setMapLens(!isDefaultUsInputSelection(sharedInput) ? "personalized" : isKnownLens ? sharedLens : "marital");
    } else if (isKnownLens) {
      setMapLens(sharedLens);
    }

    if (isUsRoute) {
      params.delete("d");
      params.delete("lang");
      params.delete("lens");
      const query = params.toString();
      const cleanUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
      if (cleanUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
        window.history.replaceState(window.history.state, "", cleanUrl);
      }
    }

    setInputUrlCleaned(true);
  }, [pathname]);

  return <UsInputContext.Provider value={{ input, setInput, mapLens, setMapLens, inputUrlCleaned, panelRequest, requestPanel }}>{children}</UsInputContext.Provider>;
}

export function useUsInput(): UsInputContextValue {
  const context = useContext(UsInputContext);
  if (!context) throw new Error("useUsInput must be used inside <UsInputProvider>");
  return context;
}
