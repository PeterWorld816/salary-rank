// Reads the quality gate's verdicts (scripts/seoQualityGate.ts writes
// data/seo/quality-gate.json before every build). A page the gate failed is
// still served, but with noindex, and app/sitemap.ts leaves it out.
import gate from "@/data/seo/quality-gate.json";

const withheld = new Set<string>(gate.failed);

export function isWithheldFromSearch(path: string): boolean {
  return withheld.has(path);
}
