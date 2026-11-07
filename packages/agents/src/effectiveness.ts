import type {
  Campaign,
  Result,
  Reaction,
  Archetype,
  RiskFlag,
} from "@alice/contracts";
export function effectivenessFindings(
  c: Campaign,
  result: Pick<Result, "per_variant">,
  reactions: Reaction[],
  people: Archetype[],
): RiskFlag[] {
  const findings: RiskFlag[] = [];
  for (const v of c.variants) {
    const rs = reactions.filter((r) => r.variant_id === v.id);
    const weak = rs.filter(
      (r) =>
        r.attention < 0.4 &&
        r.sentiment < 0.15 &&
        /umum|generik|jelas|manfaat|beda|keunggulan|biasa|general|specific|benefit|selling/i.test(
          r.reason + " " + r.sample_comment,
        ),
    );
    if (!rs.length || weak.length < Math.ceil(rs.length * 0.5)) continue;
    const evidence = weak[0];
    const person = people.find((a) => a.id === evidence.archetype_id)!;
    const metric = result.per_variant.find((x) => x.variant_id === v.id)!;
    findings.push({
      id: `${v.id}-weak-value`,
      variant_id: v.id,
      severity: "medium",
      category: "other",
      title: "Effectiveness: unclear audience benefit",
      explanation: `${weak.length} of ${rs.length} returned individual judgments combined low attention with comments about vague benefits or general messaging. This describes the synthetic sample, not public opinion.`,
      segments: metric.by_dimension.region
        .filter((g) => g.n > 0)
        .map((g) => ({ key: g.group, backlash: g.backlash })),
      map_region: person.segment.region,
      evidence: {
        comment: evidence.sample_comment,
        persona_tags: [person.segment.age_band, person.segment.platform],
      },
      suggested_fix_direction:
        "Name the intended user and an existing, concrete product benefit. Keep claims supported by the brief; ask for the missing selling point when it is unknown.",
      rule_id: "weak_value_proposition",
    });
  }
  return findings;
}
