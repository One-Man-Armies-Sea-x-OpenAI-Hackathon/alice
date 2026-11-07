export const regions = [
  "jabodetabek",
  "jawa_other",
  "sumatra",
  "kalimantan",
  "sulawesi",
  "bali_nusa",
  "maluku_papua",
] as const;
export const dimensions = [
  "region",
  "age",
  "platform",
  "religion",
  "tier",
] as const;
export const tiers = {
  quick: { personas: 500, archetypes: 500 },
  standard: { personas: 1500, archetypes: 1500 },
};
export function directionId(index: number) {
  let value = index + 1,
    id = "";
  while (value > 0) {
    value--;
    id = String.fromCharCode(65 + (value % 26)) + id;
    value = Math.floor(value / 26);
  }
  return id;
}
export function nextDirectionId(ids: string[]) {
  const existing = new Set(ids);
  let index = 0;
  while (existing.has(directionId(index))) index++;
  return directionId(index);
}
export function directionColor(id: string) {
  let index = 0;
  for (const c of id) index = (index * 26 + c.charCodeAt(0) - 64) % 3;
  return `var(--variant-${["c", "a", "b"][index]})`;
}
export function plannedCalls(c: {
  depth: keyof typeof tiers;
  variants: unknown[];
  tools: { risk: boolean; rewrite: boolean };
}) {
  const n = tiers[c.depth].personas,
    count = c.variants.length;
  return (
    n * (count + (count > 1 ? 1 : 0)) +
    8 +
    (c.tools.risk && c.tools.rewrite ? 2 * (n + 2) * Math.min(3, count) : 0)
  );
}
export const pretty = (s: string) =>
  ({
    jabodetabek: "Greater Jakarta",
    jawa_other: "Rest of Java",
    bali_nusa: "Bali & Nusa Tenggara",
    maluku_papua: "Maluku & Papua",
    islam: "Muslim",
    kristen: "Protestant",
    katolik: "Catholic",
  })[s] ?? s.replaceAll("_", " ").replace(/^./, (c) => c.toUpperCase());
