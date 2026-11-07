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
    const weight = (r: Reaction) => {
      const profile = people.find((a) => a.id === r.archetype_id);
      return profile?.persona_count ?? profile?.weight ?? 1;
    };
    const represented = rs.reduce((sum, r) => sum + weight(r), 0);
    const weakRepresented = weak.reduce((sum, r) => sum + weight(r), 0);
    if (
      !rs.length ||
      !weak.length ||
      represented <= 0 ||
      weakRepresented < represented * 0.5
    )
      continue;
    const evidence = weak[0];
    const person = people.find((a) => a.id === evidence.archetype_id)!;
    const metric = result.per_variant.find((x) => x.variant_id === v.id)!;
    findings.push({
      id: `${v.id}-weak-value`,
      variant_id: v.id,
      severity: "medium",
      category: "other",
      title: "Effectiveness: unclear audience benefit",
      explanation: `${weak.length} of ${rs.length} model reaction profiles, representing ${((100 * weakRepresented) / represented).toFixed(0)}% of the synthetic audience, combined low attention with comments about vague benefits or general messaging. These are shared archetype judgments, not measured public opinion.`,
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
