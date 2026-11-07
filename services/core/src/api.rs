use crate::{
    aggregate,
    audience::{self, Audience},
    config::Constants,
    sim::{Outcome, Reaction, simulate},
};
use axum::{Json, Router, extract::State, http::StatusCode, routing::post};
use serde_json::{Value, json};
use std::{
    collections::BTreeMap,
    sync::{Arc, Mutex},
};
#[derive(Default)]
pub struct Engine {
    audiences: Mutex<BTreeMap<String, Audience>>,
    outcomes: Mutex<BTreeMap<String, (Vec<Outcome>, Vec<Reaction>)>>,
}
type Err = (StatusCode, String);
fn bad(s: &str) -> Err {
    (StatusCode::BAD_REQUEST, s.into())
}
fn get_a(e: &Engine, v: &Value) -> Result<Audience, Err> {
    e.audiences
        .lock()
        .unwrap()
        .get(
            v["audience_id"]
                .as_str()
                .ok_or(bad("audience_id required"))?,
        )
        .cloned()
        .ok_or(bad("Audience expired; start a new run"))
}
fn reactions(v: &Value, a: &Audience) -> Result<Vec<Reaction>, Err> {
    let rs: Vec<Reaction> =
        serde_json::from_value(v.clone()).map_err(|_| bad("Invalid reactions"))?;
    if rs.is_empty() || rs.len() > a.archetypes.len() * 3 {
        return Err(bad("Invalid reaction count"));
    }
    let variants: std::collections::BTreeSet<_> = rs.iter().map(|r| r.variant_id.clone()).collect();
    for id in variants {
        for arc in &a.archetypes {
            if rs
                .iter()
                .filter(|r| r.variant_id == id && r.archetype_id == arc["id"])
                .count()
                != 1
            {
                return Err(bad(
                    "Every archetype needs exactly one reaction per variant",
                ));
            }
        }
    }
    for r in &rs {
        if !(-1.0..=1.0).contains(&r.sentiment)
            || [
                r.attention,
                r.backlash_risk,
                r.share_likelihood,
                r.click_likelihood,
            ]
            .iter()
            .any(|v| !v.is_finite() || !(0.0..=1.0).contains(v))
        {
            return Err(bad("Reaction values outside ranges"));
        }
    }
    Ok(rs)
}
async fn audience(State(e): State<Arc<Engine>>, Json(v): Json<Value>) -> Result<Json<Value>, Err> {
    let depth = v["depth"].as_str().unwrap_or("quick");
    if !["quick", "standard"].contains(&depth) {
        return Err(bad("Unsupported depth"));
    }
    let a = audience::build(
        depth,
        v["seed"].as_u64().unwrap_or(42),
        v["campaign"].clone(),
    );
    let wire = a.wire();
    let mut cache = e.audiences.lock().unwrap();
    if cache.len() >= 32 {
        let id = cache.keys().next().cloned().unwrap();
        cache.remove(&id);
        e.outcomes.lock().unwrap().remove(&id);
    }
    cache.insert(a.id.clone(), a);
    Ok(Json(wire))
}
async fn sim(State(e): State<Arc<Engine>>, Json(v): Json<Value>) -> Result<Json<Value>, Err> {
    let a = get_a(&e, &v)?;
    let rs = reactions(&v["reactions"], &a)?;
    let os = simulate(&a, &rs, &Constants::default());
    e.outcomes
        .lock()
        .unwrap()
        .insert(a.id.clone(), (os.clone(), rs));
    Ok(Json(json!({"outcomes_handle":a.id,"outcomes":os})))
}
async fn agg(State(e): State<Arc<Engine>>, Json(v): Json<Value>) -> Result<Json<Value>, Err> {
    let a = get_a(&e, &v)?;
    let cache = e.outcomes.lock().unwrap();
    let (os, _) = cache.get(&a.id).ok_or(bad("Simulate first"))?;
    Ok(Json(aggregate::aggregate(&a, os)))
}
async fn robust(State(e): State<Arc<Engine>>, Json(v): Json<Value>) -> Result<Json<Value>, Err> {
    let a = get_a(&e, &v)?;
    let second = reactions(&v["reactions"], &a)?;
    let cache = e.outcomes.lock().unwrap();
    let (os, rs) = cache.get(&a.id).ok_or(bad("Simulate first"))?;
    if second
        .iter()
        .any(|r| r.variant_id != aggregate::aggregate(&a, os)["overall"]["winner"])
    {
        return Err(bad("Noise sample must be the top scorer"));
    }
    Ok(Json(aggregate::robustness(&a, os, rs, &second)))
}
async fn rerun(State(e): State<Arc<Engine>>, Json(v): Json<Value>) -> Result<Json<Value>, Err> {
    let a = get_a(&e, &v)?;
    let cache = e.outcomes.lock().unwrap();
    let (os, old) = cache.get(&a.id).ok_or(bad("Simulate first"))?;
    let id = v["variant_id"].as_str().ok_or(bad("variant_id required"))?;
    if v["method"] != "rescored" {
        return Err(bad("Only rescored reruns are implemented"));
    }
    let new = reactions(&v["reactions"], &a)?;
    if new.iter().any(|r| r.variant_id != id) {
        return Err(bad("Mismatched variant"));
    }
    let outs = simulate(&a, &new, &Constants::default());
    let all: Vec<_> = (0..a.personas.len()).collect();
    let before = os
        .iter()
        .find(|o| o.variant_id == id)
        .ok_or(bad("Unknown variant"))?;
    let _ = old;
    Ok(Json(
        json!({"before":aggregate::metrics(before,&all),"after":aggregate::metrics(&outs[0],&all),"method":"rescored","aggregate":aggregate::aggregate(&a,&outs),"outcomes":outs}),
    ))
}
pub fn router() -> Router {
    Router::new()
        .route("/v1/audience", post(audience))
        .route("/v1/simulate", post(sim))
        .route("/v1/aggregate", post(agg))
        .route("/v1/robustness", post(robust))
        .route("/v1/rerun", post(rerun))
        .with_state(Arc::new(Engine::default()))
}
