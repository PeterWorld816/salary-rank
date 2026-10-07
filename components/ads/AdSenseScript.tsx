"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useUsInput } from "@/components/us/UsInputContext";

const ADSENSE_CLIENT_ID = "ca-pub-7379794980536826";

export default function AdSenseScript() {
  const { inputUrlCleaned } = useUsInput();
  const pathname = usePathname();
  const isCompareInvite = /^\/(?:us|kr)\/compare\//.test(pathname);

  useEffect(() => {
    if (!inputUrlCleaned || isCompareInvite || document.getElementById("adsense-loader")) return;

    const script = document.createElement("script");
    script.id = "adsense-loader";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
    document.head.appendChild(script);
  }, [inputUrlCleaned, isCompareInvite]);

  return null;
}
