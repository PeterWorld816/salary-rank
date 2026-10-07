"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { decodeUsInput, DEFAULT_US_INPUT, isDefaultUsInputSelection, type UsInput } from "@/lib/usInput";
import type { UsMapBasisLens } from "@/components/us/mapBasisLens";

type UsInputContextValue = {
  input: UsInput;
  setInput: (input: UsInput) => void;
  mapLens: UsMapBasisLens;
  setMapLens: (lens: UsMapBasisLens) => void;
  inputUrlCleaned: boolean;
};

const UsInputContext = createContext<UsInputContextValue | null>(null);

export function UsInputProvider({ children, pathname }: { children: ReactNode; pathname: string }) {
  const [input, setInput] = useState<UsInput>(DEFAULT_US_INPUT);
  const [mapLens, setMapLens] = useState<UsMapBasisLens>("marital");
  const [inputUrlCleaned, setInputUrlCleaned] = useState(false);

  useEffect(() => {
    const isUsRoute = pathname === "/us" || pathname.startsWith("/us/") || pathname === "/kr" || pathname.startsWith("/kr/");
    const params = new URLSearchParams(window.location.search);
    const encodedInput = params.get("d");
    const sharedInput = encodedInput ? decodeUsInput(encodedInput) : null;
    const sharedLens = params.get("lens");
    const isKnownLens = sharedLens === "household" || sharedLens === "marital" || sharedLens === "gender" || sharedLens === "occupation" || sharedLens === "personalized";

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

  return <UsInputContext.Provider value={{ input, setInput, mapLens, setMapLens, inputUrlCleaned }}>{children}</UsInputContext.Provider>;
}

export function useUsInput(): UsInputContextValue {
  const context = useContext(UsInputContext);
  if (!context) throw new Error("useUsInput must be used inside <UsInputProvider>");
  return context;
}
