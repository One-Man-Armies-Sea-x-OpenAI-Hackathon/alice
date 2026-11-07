use crate::{audience::Audience, config::*};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Reaction {
    pub archetype_id: String,
    pub variant_id: String,
    pub attention: f64,
    pub sentiment: f64,
    pub share_likelihood: f64,
    pub click_likelihood: f64,
    pub backlash_risk: f64,
    pub backlash_category: String,
}
#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct Edge {
    pub from: usize,
    pub to: usize,
    pub anger: bool,
}
#[derive(Clone, Serialize, Deserialize, PartialEq, Debug)]
pub struct Outcome {
    pub variant_id: String,
    pub exposed: Vec<u8>,
    pub engaged: Vec<u8>,
    pub objected: Vec<u8>,
    pub sentiment: Vec<f64>,
    pub shared: Vec<u8>,
    pub via_anger: Vec<u8>,
    pub ticks: Vec<Vec<usize>>,
    pub edges: Vec<Vec<Edge>>,
}
pub fn gate(a: &Audience, i: usize) -> f64 {
    let p = &a.personas[i];
    let vals = |key: &str| {
        a.context[key]
            .as_array()
            .map(|xs| xs.iter().filter_map(Value::as_str).collect::<Vec<_>>())
            .unwrap_or_default()
    };
    let ch = vals("channels");
    let regions = vals("target_regions");
    let outdoor = vals("outdoor_regions");
    let online = (ch.is_empty() || ch.contains(&PLATFORMS[p.platform]))
        && (regions.is_empty() || regions.contains(&REGIONS[p.region]));
    let outdoors = ch.contains(&"outdoor") && outdoor.contains(&REGIONS[p.region]);
    if online || outdoors { 1. } else { 0.1 }
}
pub fn simulate(a: &Audience, rs: &[Reaction], c: &Constants) -> Vec<Outcome> {
    let mut groups: BTreeMap<&str, Vec<&Reaction>> = BTreeMap::new();
    for r in rs {
        groups.entry(&r.variant_id).or_default().push(r);
    }
    groups
        .into_iter()
        .map(|(id, rs)| one(a, id, &rs, c))
        .collect()
}
fn one(a: &Audience, id: &str, rs: &[&Reaction], c: &Constants) -> Outcome {
    let n = a.personas.len();
    let mut o = Outcome {
        variant_id: id.into(),
        exposed: vec![0; n],
        engaged: vec![0; n],
        objected: vec![0; n],
        sentiment: vec![0.; n],
        shared: vec![0; n],
        via_anger: vec![0; n],
        ticks: vec![vec![]; 9],
        edges: vec![vec![]; 9],
    };
    let mut attention = vec![0.; n];
    let mut share = vec![0.; n];
    let mut click = vec![0.; n];
    let lookup: std::collections::HashMap<&str, &&Reaction> =
        rs.iter().map(|r| (r.archetype_id.as_str(), r)).collect();
    for (i, p) in a.personas.iter().enumerate() {
        let arc = format!("arc-{}", p.archetype_index);
        let r = lookup.get(arc.as_str()).expect("complete reaction set");
        let d = |k| draw(a.seed, i, k);
        attention[i] = (r.attention + (d(500) - 0.5) * 0.20).clamp(0.05, 0.95);
        if r.attention == 0. {
            attention[i] = 0.;
        }
        o.sentiment[i] = (r.sentiment
            * if r.sentiment < 0. {
                0.8 + 0.4 * p.sensitivity
            } else {
                1.
            }
            + (d(501) - 0.5) * 0.28)
            .clamp(-1., 1.);
        let backlash = (r.backlash_risk
            * (0.6 + 0.8 * p.sensitivity)
            * if r.backlash_category == "sara_religion" {
                0.5 + p.religiosity
            } else {
                1.
            })
        .clamp(0., 0.95);
        o.objected[i] = u8::from(d(502) < backlash);
        share[i] = (r.share_likelihood + (d(503) - 0.5) * 0.10).clamp(0., 0.9);
        click[i] = (r.click_likelihood + (d(504) - 0.5) * 0.06).clamp(0., 0.6);
        if d(600) < attention[i] * c.initial * gate(a, i) {
            o.exposed[i] = 1;
            o.ticks[0].push(i);
        }
    }
    for tick in 1..9 {
        let prev = o.ticks[tick - 1].clone();
        let exposed_before = o.exposed.clone();
        let sentiments = o.sentiment.clone();
        let mut pending: BTreeMap<usize, (usize, bool)> = BTreeMap::new();
        for i in prev {
            let p = &a.personas[i];
            let prob =
                (share[i] * p.virality * c.share * if o.objected[i] == 1 { c.anger } else { 1. })
                    .min(0.95);
            if draw(a.seed, i, 700 + tick as u64) >= prob {
                continue;
            }
            o.shared[i] = 1;
            for &j in &a.graph[i] {
                if exposed_before[j] == 1 {
                    continue;
                }
                let prob = (c.neighbor
                    + if p.platform == a.personas[j].platform {
                        0.15
                    } else {
                        0.
                    }
                    + 0.3 * (attention[j] - 0.4))
                    .clamp(0.05, 0.9);
                if draw(a.seed, i * n + j, 800 + tick as u64) < prob {
                    pending.entry(j).or_insert((i, o.objected[i] == 1));
                }
            }
        }
        for (j, (i, anger)) in pending {
            let neighbors: Vec<_> = a.graph[j]
                .iter()
                .filter(|q| exposed_before[**q] == 1)
                .collect();
            let mean = if neighbors.is_empty() {
                sentiments[j]
            } else {
                neighbors.iter().map(|q| sentiments[**q]).sum::<f64>() / neighbors.len() as f64
            };
            o.sentiment[j] = ((1. - c.drift) * sentiments[j] + c.drift * mean
                - if anger { c.anger_hit } else { 0. })
            .clamp(-1., 1.);
            o.exposed[j] = 1;
            o.via_anger[j] = u8::from(anger);
            o.ticks[tick].push(j);
            if o.edges[tick].len() < 100 {
                o.edges[tick].push(Edge {
                    from: i,
                    to: j,
                    anger,
                })
            }
        }
    }
    for i in 0..n {
        o.objected[i] *= o.exposed[i];
        o.engaged[i] =
            u8::from(o.exposed[i] == 1 && (o.shared[i] == 1 || draw(a.seed, i, 900) < click[i]));
        o.sentiment[i] = round(o.sentiment[i]);
    }
    o
}
