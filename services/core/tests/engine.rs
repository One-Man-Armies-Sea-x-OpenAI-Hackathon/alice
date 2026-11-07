use alice_core::{
    aggregate::{aggregate, robustness},
    audience::build,
    config::*,
    sim::{Reaction, simulate},
};
use serde_json::json;
fn reactions(
    a: &alice_core::audience::Audience,
    id: &str,
    sentiment: f64,
    backlash: f64,
) -> Vec<Reaction> {
    a.archetypes
        .iter()
        .map(|g| Reaction {
            archetype_id: g["id"].as_str().unwrap().into(),
            variant_id: id.into(),
            attention: 0.7,
            sentiment,
            share_likelihood: 0.4,
            click_likelihood: 0.2,
            backlash_risk: backlash,
            backlash_category: if backlash > 0.1 { "other" } else { "none" }.into(),
        })
        .collect()
}
#[test]
fn arbitrary_direction_ids_keep_the_same_audience_and_deterministic_results() {
    let a = build("quick", 42, json!({"individual_agents":true}));
    let ids = ["A", "B", "D", "AA"];
    let rs: Vec<_> = ids.iter().flat_map(|id| reactions(&a, id, 0.5, 0.02)).collect();
    let outcomes = simulate(&a, &rs, &Constants::default());
    assert_eq!(outcomes, simulate(&a, &rs, &Constants::default()));
    assert_eq!(outcomes.len(), 4);
    let first = &outcomes[0];
    for outcome in &outcomes {
        assert!(ids.contains(&outcome.variant_id.as_str()));
        assert_eq!(outcome.exposed, first.exposed);
        assert_eq!(outcome.sentiment, first.sentiment);
    }
    assert_eq!(aggregate(&a, &outcomes)["per_variant"].as_array().unwrap().len(), 4);
}
#[test]
fn audience_determinism_sums_and_coverage() {
    for depth in ["quick", "standard"] {
        let a = build(depth, 42, json!({}));
        let b = build(depth, 42, json!({}));
        assert_eq!(a.wire(), b.wire());
        let expected = if depth == "quick" { 500 } else { 1500 };
        assert_eq!(a.personas.len(), expected);
        assert_eq!(a.archetypes.len(), if depth == "quick" { 24 } else { 48 });
        assert!(
            (a.archetypes
                .iter()
                .map(|v| v["weight"].as_f64().unwrap())
                .sum::<f64>()
                - 1.)
                .abs()
                < 1e-9
        );
        assert_eq!(
            a.archetypes
                .iter()
                .map(|v| v["persona_count"].as_u64().unwrap())
                .sum::<u64>(),
            expected as u64
        );
        for reg in REGIONS {
            assert!(
                a.archetypes.iter().any(|g| g["segment"]["region"] == reg),
                "missing {reg}"
            )
        }
        for rel in RELIGIONS {
            if a.personas.iter().any(|p| RELIGIONS[p.religion] == rel) {
                assert!(
                    a.archetypes.iter().any(|g| g["segment"]["religion"] == rel),
                    "missing {rel}"
                )
            }
        }
        assert!(a.graph.iter().all(|g| g.len() <= 12));
        for (i, g) in a.graph.iter().enumerate() {
            assert!(!g.contains(&i));
        }
    }
}
#[test]
fn fairness_isolation_ranges_and_sums() {
    let a = build("standard", 42, json!({}));
    let mut rs = reactions(&a, "A", 0.5, 0.02);
    rs.extend(reactions(&a, "B", 0.5, 0.02));
    let os = simulate(&a, &rs, &Constants::default());
    let mut comparable = os[1].clone();
    comparable.variant_id = "A".into();
    assert_eq!(os[0], comparable);
    let again = simulate(&a, &rs, &Constants::default());
    assert_eq!(os, again);
    for r in &mut rs {
        if r.variant_id == "B" {
            r.sentiment = -0.5;
            r.backlash_risk = 0.7
        }
    }
    assert_eq!(os[0], simulate(&a, &rs, &Constants::default())[0]);
    let result = aggregate(&a, &os);
    for v in result["per_variant"].as_array().unwrap() {
        for dim in ["region", "age", "platform", "religion", "tier"] {
            let xs = v["by_dimension"][dim].as_array().unwrap();
            assert!(
                (xs.iter().map(|g| g["share"].as_f64().unwrap()).sum::<f64>() - 1.).abs() < 1e-9
            );
            for g in xs {
                assert!((0.0..=100.).contains(&g["score"].as_f64().unwrap()));
                for m in ["reach", "engagement", "backlash", "anger_reach"] {
                    assert!((0.0..=1.).contains(&g[m].as_f64().unwrap()))
                }
            }
        }
    }
}
#[test]
fn placement_and_monotonic_score() {
    let a = build(
        "standard",
        42,
        json!({"channels":["outdoor"],"outdoor_regions":["jabodetabek"]}),
    );
    assert!(
        a.personas
            .iter()
            .enumerate()
            .all(|(i, p)| alice_core::sim::gate(&a, i) == if p.region == 0 { 1. } else { 0.1 })
    );
    assert!(score(0.6, 0.2, 0.4, 0.5) < score(0.6, 0.2, 0.4, 0.0));
    let rs = reactions(&a, "A", 0.5, 0.0);
    let os = simulate(&a, &rs, &Constants::default());
    assert!(os[0].ticks[0].len() < a.personas.len() / 4);
    let b = build("quick", 42, json!({}));
    assert!(
        b.personas
            .iter()
            .enumerate()
            .all(|(i, _)| alice_core::sim::gate(&b, i) == 1.)
    );
}
#[test]
fn robustness_is_reproducible_and_near_tie_is_low() {
    let a = build("quick", 42, json!({}));
    let mut rs = reactions(&a, "A", 0.5, 0.02);
    let second = reactions(&a, "A", 0.5, 0.02);
    rs.extend(reactions(&a, "B", 0.5, 0.02));
    let os = simulate(&a, &rs, &Constants::default());
    let r = robustness(&a, &os, &rs, &second);
    assert_eq!(r, robustness(&a, &os, &rs, &second));
    assert_eq!(r["robustness"]["noise_floor"], 1.0);
    assert_eq!(r["confidence"], "Low");
    assert_eq!(r["is_tie"], true);
}
#[test]
fn distribution_matches_reference() {
    let a = build("standard", 42, json!({}));
    for (r, w) in REGION_WEIGHTS.iter().enumerate() {
        let share =
            a.personas.iter().filter(|p| p.region == r).count() as f64 / a.personas.len() as f64;
        assert!((share - w).abs() < 0.045)
    }
    for (i, w) in AGE_MIX.iter().enumerate() {
        let share =
            a.personas.iter().filter(|p| p.age_band == i).count() as f64 / a.personas.len() as f64;
        assert!((share - w).abs() < 0.045)
    }
}

#[test]
fn single_campaign_high_backlash_is_low_confidence() {
    let a = build("quick", 42, json!({}));
    let rs = reactions(&a, "A", -0.5, 0.7);
    let os = simulate(&a, &rs, &Constants::default());
    assert_eq!(aggregate(&a, &os)["overall"]["confidence"], "Low");
}
#[test]
fn individual_mode_has_one_unique_personality_per_person(){for depth in ["quick","standard"]{let a=build(depth,42,json!({"individual_agents":true}));assert_eq!(a.archetypes.len(),a.personas.len());for(i,p)in a.personas.iter().enumerate(){assert_eq!(p.archetype_index,i);assert_eq!(a.archetypes[i]["persona_count"],1);assert!(a.archetypes[i]["blurb"].as_str().unwrap().contains("skepticism"));}assert_eq!(a.wire(),build(depth,42,json!({"individual_agents":true})).wire());}}
