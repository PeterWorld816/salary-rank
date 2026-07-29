import type { Metadata } from "next";
import { translations } from "@/lib/i18n";
import { getUsStatesGeo } from "@/lib/usGeo";
import UsHomeClient from "./UsHomeClient";

export const metadata: Metadata = {
  title: translations.ko.usAppTitle,
  description: translations.ko.usTagline,
};

export default function UsPage() {
  const geo = getUsStatesGeo();
  return <UsHomeClient geo={geo} />;
}
