use crate::config::*;
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::collections::BTreeMap;
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Persona {
    pub region: usize,
    pub city_tier: usize,
    pub age_band: usize,
    pub religion: usize,
    pub income_band: usize,
    pub platform: usize,
    pub language_style: usize,
    pub religiosity: f64,
    pub sensitivity: f64,
    pub virality: f64,
    pub longitude: f64,
    pub latitude: f64,
    pub archetype_index: usize,
    pub city: usize,
}
#[derive(Clone)]
pub struct Audience {
    pub id: String,
    pub seed: u64,
    pub context: Value,
    pub personas: Vec<Persona>,
    pub archetypes: Vec<Value>,
    pub graph: Vec<Vec<usize>>,
}
#[derive(Deserialize)]
struct City {
    region: String,
    weight: f64,
    longitude: f64,
    latitude: f64,
}
fn distance(a: &Persona, b: &Persona) -> usize {
    3 * usize::from(a.region != b.region)
        + 2 * usize::from(a.platform != b.platform)
        + 2 * usize::from(a.age_band != b.age_band)
        + 2 * usize::from(a.religion != b.religion)
        + usize::from(a.city_tier != b.city_tier)
        + usize::from(a.language_style != b.language_style)
        + usize::from(a.income_band != b.income_band)
}
pub fn build(depth: &str, seed: u64, context: Value) -> Audience {
    let (n, k) = if depth == "standard" {
        (1500, 48)
    } else {
        (500, 24)
    };
    let cities: Vec<City> = serde_json::from_str(include_str!("../cities.json")).unwrap();
    let dots: Vec<(f64, f64, usize)> = serde_json::from_str(include_str!("../land.json")).unwrap();
    let mut ps = Vec::with_capacity(n);
    for i in 0..n {
        let r = |p| draw(seed, i, p);
        let region = pick(&REGION_WEIGHTS, r(1));
        let religion = pick(&RELIGION_MIX[region], r(2));
        let city_tier = pick(&TIER_MIX[region], r(3));
        let age_band = pick(&AGE_MIX, r(4));
        let income_band = pick(&INCOME_MIX[city_tier], r(5));
        let platform = pick(&PLATFORM_MIX[age_band], r(6));
        let mut lang = LANG_MIX[age_band];
        let shift = match platform {
            0 | 4 => [0.15, -0.05, -0.10],
            1 => [0.05, 0., -0.05],
            3 => [-0.05, 0., 0.05],
            5 => [-0.05, 0.05, 0.],
            _ => [0.; 3],
        };
        for j in 0..3 {
            lang[j] = (lang[j] + shift[j]).max(0.01)
        }
        let language_style = pick(&lang, r(7));
        let cs: Vec<usize> = cities
            .iter()
            .enumerate()
            .filter(|(_, c)| c.region == REGIONS[region])
            .map(|(j, _)| j)
            .collect();
        let city = cs[pick(
            &cs.iter().map(|j| cities[*j].weight).collect::<Vec<_>>(),
            r(8),
        )];
        let c = &cities[city];
        let near: Vec<_> = dots
            .iter()
            .filter(|d| {
                d.2 == region && (d.0 - c.longitude).abs() < 1.0 && (d.1 - c.latitude).abs() < 1.0
            })
            .collect();
        let (lon, lat) = if near.is_empty() {
            (c.longitude, c.latitude)
        } else {
            let d = near[(r(9) * near.len() as f64) as usize];
            (d.0, d.1)
        };
        ps.push(Persona {
            region,
            religion,
            city_tier,
            age_band,
            income_band,
            platform,
            language_style,
            religiosity: round(
                ([0.62, 0.60, 0.60, 0.70, 0.40, 0.30][religion]
                    + if region == 2 { 0.1 } else { 0. }
                    + if region == 5 && religion == 3 {
                        0.1
                    } else {
                        0.
                    }
                    + (r(10) - 0.5) * 0.44)
                    .clamp(0.05, 1.),
            ),
            sensitivity: round(
                (0.30 + 0.70 * r(11).powf(0.8) + if age_band == 3 { 0.05 } else { 0. })
                    .clamp(0.2, 1.),
            ),
            virality: round(
                (0.25
                    + 0.40 * r(12)
                    + if platform == 0 || platform == 4 {
                        0.15
                    } else {
                        0.
                    }
                    + if age_band == 0 { 0.10 } else { 0. })
                .clamp(0.1, 1.),
            ),
            longitude: ((lon + (r(13) - 0.5) * 0.12) * 100.).round() / 100.,
            latitude: ((lat + (r(14) - 0.5) * 0.12) * 100.).round() / 100.,
            archetype_index: 0,
            city,
        });
    }
    let mut groups: BTreeMap<(usize, usize, usize, usize, usize, usize), Vec<usize>> =
        BTreeMap::new();
    for (i, p) in ps.iter().enumerate() {
        groups
            .entry((
                p.region,
                p.age_band,
                p.platform,
                p.religion,
                p.city_tier,
                p.language_style,
            ))
            .or_default()
            .push(i);
    }
    let mut gs: Vec<_> = groups.values().cloned().collect();
    gs.sort_by_key(|g| std::cmp::Reverse(g.len()));
    let mut chosen: Vec<usize> = Vec::new();
    // Coverage selects existing sampled profiles; tiny categories are never invented.
    for dim in 0..5 {
        let count = [7, 6, 6, 4, 3][dim];
        for key in 0..count {
            if chosen.iter().any(|g| {
                let p = &ps[gs[*g][0]];
                [p.region, p.religion, p.platform, p.age_band, p.city_tier][dim] == key
            }) {
                continue;
            }
            if let Some(g) = gs.iter().position(|g| {
                let p = &ps[g[0]];
                [p.region, p.religion, p.platform, p.age_band, p.city_tier][dim] == key
            }) {
                if !chosen.contains(&g) {
                    chosen.push(g)
                }
            }
        }
    }
    for g in 0..gs.len() {
        if chosen.len() >= k {
            break;
        }
        if !chosen.contains(&g) {
            chosen.push(g)
        }
    }
    let individual = context["individual_agents"].as_bool().unwrap_or(false);
    let profiles: Vec<_> = if individual {
        ps.clone()
    } else {
        chosen.iter().map(|g| ps[gs[*g][0]].clone()).collect()
    };
    for (i, p) in ps.iter_mut().enumerate() {
        p.archetype_index = if individual {
            i
        } else {
            profiles
                .iter()
                .enumerate()
                .min_by_key(|(_, q)| distance(p, q))
                .unwrap()
                .0
        };
    }
    let archetypes=profiles.iter().enumerate().map(|(j,p)|{let count=ps.iter().filter(|p|p.archetype_index==j).count();json!({"id":format!("arc-{j}"),"segment":{"region":REGIONS[p.region],"city_tier":TIERS[p.city_tier],"age_band":AGES[p.age_band],"religion":RELIGIONS[p.religion],"income_band":(["low","mid","high"][p.income_band]),"platform":PLATFORMS[p.platform],"language_style":(["slang","casual","formal"][p.language_style]),"religiosity_band":if p.religiosity<0.45{"low"}else if p.religiosity<0.7{"mid"}else{"high"}},"weight":count as f64/n as f64,"persona_count":count,"label":format!("{} · {} · {}",REGIONS[p.region],AGES[p.age_band],PLATFORMS[p.platform]),"blurb":if individual{format!("Individual synthetic agent {j}. Openness {:.2}; sociability {:.2}; skepticism {:.2}; price sensitivity {:.2}; community orientation {:.2}. Values: {}. Current concern: {}. These are seeded individual attributes, not inferred from religion or ethnicity.",draw(seed,j,1500),draw(seed,j,1501),draw(seed,j,1502),draw(seed,j,1503),draw(seed,j,1504),["practical benefits","creative self-expression","family wellbeing","fairness and transparency","craft and provenance"][((draw(seed,j,1505)*5.) as usize).min(4)],["household budget","time pressure","product credibility","social belonging","environmental impact"][((draw(seed,j,1506)*5.) as usize).min(4)])}else{String::new()}})}).collect();
    let mut graph = vec![vec![]; n];
    let rb: Vec<Vec<usize>> = (0..7)
        .map(|g| {
            ps.iter()
                .enumerate()
                .filter(|(_, p)| p.region == g)
                .map(|(i, _)| i)
                .collect()
        })
        .collect();
    let pb: Vec<Vec<usize>> = (0..6)
        .map(|g| {
            ps.iter()
                .enumerate()
                .filter(|(_, p)| p.platform == g)
                .map(|(i, _)| i)
                .collect()
        })
        .collect();
    for i in 0..n {
        let p = &ps[i];
        let mut candidates = Vec::new();
        for j in 0..40 {
            let bucket = if j < 24 {
                &rb[p.region]
            } else if j < 34 {
                &pb[p.platform]
            } else {
                &rb[j % 7]
            };
            if bucket.is_empty() {
                continue;
            }
            let v = bucket[(draw(seed, i, 100 + j as u64) * bucket.len() as f64) as usize];
            if v == i || candidates.iter().any(|(q, _)| *q == v) {
                continue;
            }
            let q = &ps[v];
            let score = if p.region == q.region { 2. } else { 0. }
                + if p.platform == q.platform { 1.5 } else { 0. }
                + if p.age_band == q.age_band { 1. } else { 0. }
                + if p.religion == q.religion { 0.5 } else { 0. }
                + draw(seed, i, 200 + j as u64) * 1.2;
            candidates.push((v, score));
        }
        candidates.sort_by(|a, b| b.1.total_cmp(&a.1));
        graph[i] = candidates.iter().take(7).map(|x| x.0).collect();
    }
    for i in 0..n {
        for j in graph[i].clone() {
            if graph[j].len() < 12 && !graph[j].contains(&i) {
                graph[j].push(i)
            }
        }
    }
    let id = format!("{depth}-{seed}-{:016x}", stable_hash(&context.to_string()));
    Audience {
        id,
        seed,
        context,
        personas: ps,
        archetypes,
        graph,
    }
}
pub fn stable_hash(s: &str) -> u64 {
    s.bytes().fold(14695981039346656037u64, |h, b| {
        (h ^ b as u64).wrapping_mul(1099511628211)
    })
}
impl Audience {
    pub fn wire(&self) -> Value {
        let p = &self.personas;
        json!({"audience_id":self.id,"archetypes":self.archetypes,"connections":self.graph.iter().enumerate().filter_map(|(from,ns)|ns.first().map(|to|json!({"from":from,"to":to,"anger":false}))).take(1500).collect::<Vec<_>>(),"personas":{"count":p.len(),"region":p.iter().map(|p|p.region).collect::<Vec<_>>(),"platform":p.iter().map(|p|p.platform).collect::<Vec<_>>(),"city_tier":p.iter().map(|p|p.city_tier).collect::<Vec<_>>(),"age_band":p.iter().map(|p|p.age_band).collect::<Vec<_>>(),"religion":p.iter().map(|p|p.religion).collect::<Vec<_>>(),"income_band":p.iter().map(|p|p.income_band).collect::<Vec<_>>(),"language_style":p.iter().map(|p|p.language_style).collect::<Vec<_>>(),"religiosity":p.iter().map(|p|p.religiosity).collect::<Vec<_>>(),"sensitivity":p.iter().map(|p|p.sensitivity).collect::<Vec<_>>(),"virality":p.iter().map(|p|p.virality).collect::<Vec<_>>(),"longitude":p.iter().map(|p|p.longitude).collect::<Vec<_>>(),"latitude":p.iter().map(|p|p.latitude).collect::<Vec<_>>(),"archetype_index":p.iter().map(|p|p.archetype_index).collect::<Vec<_>>(),"city":p.iter().map(|p|p.city).collect::<Vec<_>>(),"lookups":{"region":REGIONS,"platform":PLATFORMS,"religion":RELIGIONS,"city_tier":TIERS,"age_band":AGES,"cities":serde_json::from_str::<Value>(include_str!("../cities.json")).unwrap().as_array().unwrap().iter().map(|c|c["name"].clone()).collect::<Vec<_>>()}}})
    }
}
