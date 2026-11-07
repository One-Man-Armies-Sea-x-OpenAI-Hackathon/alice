use crate::{
    audience::Audience,
    config::*,
    sim::{Outcome, Reaction, simulate},
};
use serde_json::{Value, json};
pub fn metrics(o: &Outcome, ids: &[usize]) -> Value {
    let n = ids.len();
    let exposed = ids.iter().filter(|i| o.exposed[**i] == 1).count();
    let sum = |v: &[u8]| ids.iter().map(|i| v[*i] as usize).sum::<usize>() as f64;
    let denom = n.max(1) as f64;
    let reach = exposed as f64 / denom;
    let engagement = sum(&o.engaged) / denom;
    let backlash = sum(&o.objected) / exposed.max(1) as f64;
    let sentiment = ids
        .iter()
        .filter(|i| o.exposed[**i] == 1)
        .map(|i| o.sentiment[*i])
        .sum::<f64>()
        / exposed.max(1) as f64;
    json!({"n":n,"reach":round(reach),"engagement":round(engagement),"sentiment":round(sentiment),"backlash":round(backlash),"anger_reach":round(sum(&o.via_anger)/exposed.max(1)as f64),"score":round(score(reach,engagement,sentiment,backlash))})
}
pub fn aggregate(a: &Audience, os: &[Outcome]) -> Value {
    let mut vs = vec![];
    for o in os {
        let all: Vec<_> = (0..a.personas.len()).collect();
        let mut dims = json!({});
        for (dim, names) in [
            ("region", REGIONS.to_vec()),
            ("age", AGES.to_vec()),
            ("platform", PLATFORMS.to_vec()),
            ("religion", RELIGIONS.to_vec()),
            ("tier", TIERS.to_vec()),
        ] {
            let groups:Vec<_>=names.iter().enumerate().map(|(key,name)|{let ids:Vec<_>=a.personas.iter().enumerate().filter(|(_,p)|match dim{"region"=>p.region,"age"=>p.age_band,"platform"=>p.platform,"religion"=>p.religion,_=>p.city_tier}==key).map(|(i,_)|i).collect();let mut m=metrics(o,&ids);m["group"]=json!(name);m["share"]=json!(ids.len()as f64/a.personas.len()as f64);m}).collect();
            dims[dim] = json!(groups);
        }
        vs.push(json!({"variant_id":o.variant_id,"label":o.variant_id,"trait":"","overall":metrics(o,&all),"by_dimension":dims}));
    }
    let mut order: Vec<_> = vs.iter().collect();
    order.sort_by(|a, b| {
        b["overall"]["score"]
            .as_f64()
            .unwrap()
            .total_cmp(&a["overall"]["score"].as_f64().unwrap())
    });
    let winner = order[0]["variant_id"].as_str().unwrap();
    let margin = if order.len() > 1 {
        order[0]["overall"]["score"].as_f64().unwrap()
            - order[1]["overall"]["score"].as_f64().unwrap()
    } else {
        0.
    };
    let mut rankings = vec![];
    let mut regions_won = 0;
    for dim in ["region", "age", "platform", "religion", "tier"] {
        for g in vs[0]["by_dimension"][dim].as_array().unwrap() {
            let group = g["group"].as_str().unwrap();
            let mut scores: Vec<_> = vs
                .iter()
                .map(|v| {
                    let m = v["by_dimension"][dim]
                        .as_array()
                        .unwrap()
                        .iter()
                        .find(|m| m["group"] == group)
                        .unwrap();
                    (v["variant_id"].as_str().unwrap(), m)
                })
                .collect();
            scores.sort_by(|a, b| {
                b.1["score"]
                    .as_f64()
                    .unwrap()
                    .total_cmp(&a.1["score"].as_f64().unwrap())
            });
            let win = scores[0].0;
            let margin = if scores.len() > 1 {
                scores[0].1["score"].as_f64().unwrap() - scores[1].1["score"].as_f64().unwrap()
            } else {
                0.
            };
            if dim == "region" && win == winner {
                regions_won += 1
            }
            rankings.push(json!({"dimension":dim,"group":group,"winner":win,"order":scores.iter().map(|s|s.0).collect::<Vec<_>>(),"margin":round(margin),"why":"","drivers":if scores.len()>1{json!({"reach":scores[0].1["reach"].as_f64().unwrap()-scores[1].1["reach"].as_f64().unwrap(),"engagement":scores[0].1["engagement"].as_f64().unwrap()-scores[1].1["engagement"].as_f64().unwrap(),"sentiment":scores[0].1["sentiment"].as_f64().unwrap()-scores[1].1["sentiment"].as_f64().unwrap(),"backlash":scores[0].1["backlash"].as_f64().unwrap()-scores[1].1["backlash"].as_f64().unwrap()})}else{json!({})}}));
        }
    }
    json!({"per_variant":vs,"ranking":rankings,"overall":{"winner":winner,"margin":round(margin),"is_tie":margin<1.,"confidence":if os.len()==1{if order[0]["overall"]["backlash"].as_f64().unwrap()<0.08{"High"}else if order[0]["overall"]["backlash"].as_f64().unwrap()<0.18{"Medium"}else{"Low"}}else{"Low"},"regions_won":regions_won,"recommended":winner,"recommendation_note":"","robustness":{"noise_floor":1.,"audience_won":0,"audience_total":0,"constants_won":0,"constants_total":0,"checks_won":0,"checks_total":0}}})
}
// Recombine counts rather than averaging already-computed scores.
fn resampled_score(a: &Audience, o: &Outcome, sample: &[usize]) -> f64 {
    let ids: Vec<_> = sample
        .iter()
        .flat_map(|g| {
            a.personas
                .iter()
                .enumerate()
                .filter(move |(_, p)| p.archetype_index == *g)
                .map(|(i, _)| i)
        })
        .collect();
    metrics(o, &ids)["score"].as_f64().unwrap()
}
pub fn robustness(a: &Audience, os: &[Outcome], rs: &[Reaction], second: &[Reaction]) -> Value {
    let agg = aggregate(a, os);
    let win = agg["overall"]["winner"].as_str().unwrap();
    let all: Vec<_> = (0..a.personas.len()).collect();
    let rerun = simulate(a, second, &Constants::default());
    let min_noise = std::env::var("NOISE_FLOOR_MIN")
        .ok()
        .and_then(|v| v.parse::<f64>().ok())
        .unwrap_or(1.);
    let noise = (metrics(os.iter().find(|o| o.variant_id == win).unwrap(), &all)["score"]
        .as_f64()
        .unwrap()
        - metrics(&rerun[0], &all)["score"].as_f64().unwrap())
    .abs()
    .max(min_noise);
    let mut aw = 0;
    for check in 0..200 {
        let sample: Vec<_> = (0..a.archetypes.len())
            .map(|i| (draw(a.seed, i, 1000 + check) * a.archetypes.len() as f64) as usize)
            .collect();
        let scores: Vec<_> = os
            .iter()
            .map(|o| (&o.variant_id, resampled_score(a, o, &sample)))
            .collect();
        if scores.iter().max_by(|a, b| a.1.total_cmp(&b.1)).unwrap().0 == win {
            aw += 1
        }
    }
    let mut cw = 0;
    for key in 0..5 {
        for factor in [0.8, 1.2] {
            let mut c = Constants::default();
            match key {
                0 => c.initial *= factor,
                1 => c.neighbor *= factor,
                2 => c.share *= factor,
                3 => c.drift *= factor,
                _ => c.anger *= factor,
            }
            let outs = simulate(a, rs, &c);
            let ag = aggregate(a, &outs);
            if ag["overall"]["winner"] == win {
                cw += 1
            }
        }
    }
    let margin = agg["overall"]["margin"].as_f64().unwrap();
    json!({"robustness":{"noise_floor":round(noise),"audience_won":aw,"audience_total":200,"constants_won":cw,"constants_total":10,"checks_won":aw+cw,"checks_total":210},"confidence":if margin>=2.*noise&&aw>=160&&cw==10{"High"}else if margin>noise&&aw>=120{"Medium"}else{"Low"},"is_tie":margin<noise})
}
