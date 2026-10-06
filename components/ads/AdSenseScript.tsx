// Site-wide AdSense loader — keep this in the root layout so its bootstrap
// is present in the initial HTML without making routes dynamically rendered.
import Script from "next/script";
import { getAdsenseClientId, getProductionHost } from "@/lib/ads";

export default function AdSenseScript() {
  const clientId = getAdsenseClientId();
  const productionHost = getProductionHost();
  if (!clientId || !productionHost) return null;

  return (
    <Script id="adsense-loader" strategy="beforeInteractive">
      {`if (window.location.hostname.toLowerCase() === ${JSON.stringify(productionHost)}) {
  var adsenseScript = document.createElement("script");
  adsenseScript.async = true;
  adsenseScript.crossOrigin = "anonymous";
  adsenseScript.src = ${JSON.stringify(`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`)};
  document.head.appendChild(adsenseScript);
}`}
    </Script>
  );
}
