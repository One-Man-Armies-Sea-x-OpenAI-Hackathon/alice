import {
  type Campaign,
  type Archetype,
  type Reaction,
  type RiskFlag,
  type Result,
  pretty,
} from "@alice/contracts";
export const patterns = [
  {
    id: "flag_misuse",
    re: /bendera.*(?:sol|sepatu)|flag.*(?:sole|shoe)/i,
    category: "other",
    severity: "high",
    title: "National flag used on a shoe sole",
    comment: "Bendera di sol sepatu? Mohon hormati lambang negara.",
    direction: "Use red and white color accents without a flag motif.",
  },
  {
    id: "santa_hijab",
    re: /hijab.*santa|santa.*hijab|berhijab.*topi/i,
    category: "sara_religion",
    severity: "high",
    title: "Religious attire imposed on staff",
    comment: "Atribut agama lain jangan dipaksakan untuk promosi.",
    direction: "Remove religious attire and focus on family travel.",
  },
  {
    id: "mixed_housing",
    re: /cowok.cewek.*bebas/i,
    category: "local_norms",
    severity: "high",
    title: "Housing message conflicts with family norms",
    comment: "Orang tua butuh kejelasan keamanan dan aturan tempat tinggal.",
    direction: "Describe safety, separate floors, and clear house rules.",
  },
  {
    id: "sacred_merit",
    re: /pahala|gandakan.*berkah/i,
    category: "sara_religion",
    severity: "medium",
    title: "Sacred merit used as a promotion",
    comment: "Pahala sebaiknya tidak dijadikan janji promosi.",
    direction: "Focus on transparent social impact, not spiritual rewards.",
  },
  {
    id: "political_callout",
    re: /pejabat.*janji/i,
    category: "political",
    severity: "high",
    title: "Campaign becomes a political call-out",
    comment: "Fokus ke ajakan bersama, jangan bikin suasana panas.",
    direction: "Invite participation without targeting officials.",
  },
  {
    id: "restricted_motif",
    re: /parang/i,
    category: "sara_ethnicity",
    severity: "medium",
    title: "Culturally restricted motif",
    comment: "Motif ini ada maknanya, perlu dihormati.",
    direction: "Use an unrestricted motif and credit artisans.",
  },
  {
    id: "authenticity_claim",
    re: /asli padang/i,
    category: "sara_ethnicity",
    severity: "medium",
    title: "Regional authenticity claim needs care",
    comment: "Terinspirasi Padang lebih tepat daripada klaim asli.",
    direction: "Use inspired-by language rather than authenticity claims.",
  },
  {
    id: "competitor_jab",
    re: /kopi.*yang itu|kopi mahal|crossed out/i,
    category: "language_tone",
    severity: "low",
    title: "Competitor jab distracts from the benefit",
    comment: "Lebih enak kalau fokus ke keunggulan sendiri.",
    direction: "Lead with taste and value without mocking competitors.",
  },
];
export const pattern = (v: any) =>
  patterns.find((p) =>
    p.re.test([v.headline, v.copy, v.visual_description].join(" ")),
  );
export function mockReaction(
  c: Campaign,
  a: Archetype,
  v: Campaign["variants"][number],
): Reaction {
  const p = pattern(v),
    s = a.segment,
    young = ["18-24", "25-34"].includes(s.age_band),
    urban = s.region === "jabodetabek";
  const family = /keluarga|lokal|Bandung|kampung|orang tua/i.test(
    v.headline + " " + v.copy,
  );
  const fit = family
    ? young
      ? 0.36
      : 0.67
    : young
      ? urban
        ? 0.68
        : 0.56
      : 0.22;
  const risk = p
    ? p.category === "sara_religion"
      ? s.religion === "islam"
        ? 0.58
        : 0.1
      : young
        ? 0.31
        : 0.61
    : 0.018;
  return {
    archetype_id: a.id,
    variant_id: v.id,
    attention: p ? 0.82 : 0.62 + fit * 0.15,
    sentiment: p ? -0.25 - risk * 0.5 : fit,
    share_likelihood: p ? 0.59 : 0.21 + fit * 0.3,
    click_likelihood: 0.13 + fit * 0.12,
    backlash_risk: risk,
    backlash_category: (p?.category ?? "none") as any,
    reason: p
      ? "Pesan ini perlu lebih menghormati konteks audiens."
      : "Pesannya sesuai dengan hal yang saya pedulikan.",
    sample_comment: p
      ? p.comment
      : family
        ? "Senang lihat pesan yang hangat dan dekat sama keseharian."
        : "Menarik sih, pesannya jelas dan bikin pengen tahu lebih jauh.",
  };
}
export function mockFlags(
  c: Campaign,
  result: Pick<Result, "per_variant">,
  rs: Reaction[],
  archetypes: Archetype[],
): RiskFlag[] {
  return c.variants.flatMap((v) => {
    const p = pattern(v);
    if (!p) return [];
    const pv = result.per_variant.find((x) => x.variant_id === v.id)!;
    const rows = pv.by_dimension.region
      .filter((x) => x.backlash > 0.04)
      .sort((a, b) => b.backlash - a.backlash);
    const r = rs.find(
      (r) => r.variant_id === v.id && r.backlash_category === p.category,
    )!;
    const a = archetypes.find((x) => x.id === r.archetype_id)!;
    return [
      {
        id: `${v.id}-${p.id}`,
        variant_id: v.id,
        severity: p.severity as any,
        category: p.category as any,
        title: p.title,
        explanation: `Simulated reactions object to this element. ${p.direction}`,
        segments: rows.map((x) => ({ key: x.group, backlash: x.backlash })),
        map_region: (rows[0]?.group ?? "jabodetabek") as any,
        evidence: {
          comment: r.sample_comment,
          persona_tags: [
            a.segment.age_band,
            a.segment.platform,
            a.segment.religion,
          ],
        },
        suggested_fix_direction: p.direction,
        rule_id: p.id,
      },
    ];
  });
}
export const mockRewrite = (
  v: Campaign["variants"][number],
  flag: RiskFlag,
) => ({
  headline:
    flag.rule_id === "flag_misuse"
      ? "Langkah berani, semangat Indonesia."
      : flag.rule_id === "santa_hijab"
        ? "Akhir tahun, waktunya pulang."
        : v.headline.replace(/pahala|bebas|Parang|asli Padang/gi, "bersama"),
  copy:
    flag.rule_id === "flag_misuse"
      ? "Edisi 17 Agustus dengan aksen warna merah dan putih."
      : flag.rule_id === "santa_hijab"
        ? "Rayakan waktu bersama keluarga, dengan pilihan perjalanan yang ramah."
        : "Pilihan yang nyaman, dengan informasi yang jelas dan sikap saling menghormati.",
  visual_description:
    flag.rule_id === "flag_misuse"
      ? "Running shoes with abstract red and white color accents; no flag motif."
      : "People enjoying the product in an everyday setting without religious or restricted symbols.",
  changes: [flag.suggested_fix_direction],
  kept: [v.label],
  self_check_new_risks: [],
});
export const mockEnglish = (text: string) =>
  ({
    "Merdeka itu lari ke arah yang kamu mau.":
      "Freedom means running in your own direction.",
    "Langkah Run, dibuat di Bandung untuk semua pelari.":
      "Langkah Run, made in Bandung for every runner.",
    "Dibuat di Bandung, buat 270 juta langkah.":
      "Made in Bandung, for 270 million steps.",
    "Karya lokal untuk langkah Indonesia.":
      "Local craftsmanship for Indonesia’s next steps.",
    "Injak garis finis, pakai Merah Putih.":
      "Cross the finish line wearing red and white.",
    "Edisi 17 Agustus dengan motif bendera di sol dan sisi sepatu.":
      "An Independence Day edition with flag motifs on the soles and sides.",
    "Senang lihat pesan yang hangat dan dekat sama keseharian.":
      "I like a warm message that feels close to everyday life.",
    "Menarik sih, pesannya jelas dan bikin pengen tahu lebih jauh.":
      "Interesting—the message is clear and makes me want to learn more.",
    "Bendera di sol sepatu? Mohon hormati lambang negara.":
      "The flag on a shoe sole? Please respect the national symbol.",
    "Langkah berani, semangat Indonesia.":
      "Bold steps, the spirit of Indonesia.",
    "Edisi 17 Agustus dengan aksen warna merah dan putih.":
      "An Independence Day edition with red and white color accents.",
  })[text] ?? `[Mock translation] ${text}`;
