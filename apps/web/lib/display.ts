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
