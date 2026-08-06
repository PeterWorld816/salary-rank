import type { Metadata } from "next";
import { getUsStatesGeo } from "@/lib/usGeo";
import { getAppLocale, getOriginalPathname } from "@/lib/serverLocale";
import { homeMetadata } from "@/lib/seo";
import UsHomeClient from "./UsHomeClient";

export function generateMetadata(): Metadata {
  return homeMetadata(getAppLocale(), getOriginalPathname());
}

export default function UsPage() {
  const geo = getUsStatesGeo();
  return <UsHomeClient geo={geo} />;
}
