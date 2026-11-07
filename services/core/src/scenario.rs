use crate::config::{round, score};
use axum::{Json, http::StatusCode};
use serde_json::{Value, json};
// Calendar time is an explicit scenario assumption, never inferred from the original eight diffusion ticks.
pub fn calculate(v: &Value) -> Result<Value, String> {
    let days = v["days"].as_u64().unwrap_or(30);
    if !(1..=180).contains(&days) {
        return Err("Choose 1–180 scenario days".into());
    }
    let daily = v["daily_exposure"].as_f64().unwrap_or(0.04);
    let organic = v["organic_multiplier"].as_f64().unwrap_or(1.);
    let decay = v["sentiment_decay"].as_f64().unwrap_or(0.01);
    if !(0.0..=1.).contains(&daily)
        || !(0.0..=3.).contains(&organic)
        || !(0.0..=0.2).contains(&decay)
    {
        return Err("Scenario assumptions outside supported ranges".into());
    }
    let variants = v["per_variant"].as_array().ok_or("Results required")?;
    let mut points = Vec::new();
    for day in 1..=days {
        for pv in variants {
            let m = &pv["overall"];
            let baseline = m["reach"].as_f64().unwrap_or(0.);
            let engagement = m["engagement"].as_f64().unwrap_or(0.);
            let backlash = m["backlash"].as_f64().unwrap_or(0.);
            let initial_sentiment = m["sentiment"].as_f64().unwrap_or(0.);
            let hazard = (daily * (1. + organic * engagement)).clamp(0., 1.);
            let reach = (1. - (1. - hazard).powi(day as i32)).clamp(0., 1.);
            let new_reach = if day == 1 {
                reach
            } else {
                reach - (1. - (1. - hazard).powi(day as i32 - 1))
            };
            let sentiment = initial_sentiment * (1. - decay).powi(day as i32 - 1);
            let engaged = (engagement / baseline.max(0.0001) * reach).clamp(0., reach);
            points.push(json!({"day":day,"variant_id":pv["variant_id"],"reach":round(reach),"new_reach":round(new_reach),"sentiment":round(sentiment),"backlash":round(backlash),"score":round(score(reach,engaged,sentiment,backlash))}));
        }
    }
    Ok(
        json!({"points":points,"assumptions":{"days":days,"daily_exposure":daily,"organic_multiplier":organic,"sentiment_decay":decay},"kind":"hypothetical_calendar_scenario","note":"Scenario assumptions, not an observed forecast. Original spread ticks have no calibrated duration. Backlash is held constant and sentiment decays toward neutral."}),
    )
}
pub async fn endpoint(Json(v): Json<Value>) -> Result<Json<Value>, (StatusCode, String)> {
    calculate(&v)
        .map(Json)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn daily_scenario_is_deterministic_bounded_and_cumulative() {
        let v = json!({"days":60,"daily_exposure":0.04,"per_variant":[{"variant_id":"A","overall":{"reach":0.5,"engagement":0.1,"sentiment":0.4,"backlash":0.05}}]});
        let x = calculate(&v).unwrap();
        assert_eq!(x, calculate(&v).unwrap());
        let ps = x["points"].as_array().unwrap();
        assert_eq!(ps.len(), 60);
        for p in ps {
            assert!((0.0..=1.).contains(&p["reach"].as_f64().unwrap()));
            assert!((0.0..=100.).contains(&p["score"].as_f64().unwrap()));
        }
        let sum: f64 = ps.iter().map(|p| p["new_reach"].as_f64().unwrap()).sum();
        assert!((sum - ps[59]["reach"].as_f64().unwrap()).abs() < 0.01);
    }
    #[test]
    fn rejects_invalid_horizon() {
        assert!(calculate(&json!({"days":999})).is_err());
    }
}
