use alice_core::{
    api,
    store::{self, Store},
};
use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use serde_json::{Value, json};
use std::sync::Arc;
use tower::ServiceExt;
async fn request(app: Router, method: &str, path: &str, body: Value) -> (StatusCode, Value) {
    let response = app
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("content-type", "application/json")
                .body(Body::from(body.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 10_000_000).await.unwrap();
    (
        status,
        serde_json::from_slice(&bytes).unwrap_or(Value::Null),
    )
}
#[tokio::test]
async fn persisted_documents_survive_reopen() {
    let dir = std::env::temp_dir().join(format!("alice-store-{}", std::process::id()));
    let store = Store::local(dir.clone());
    store
        .write("llm_cache", "cache-a", json!({"response":{"ok":true}}))
        .await
        .unwrap();
    let reopened = Store::local(dir.clone());
    assert_eq!(
        reopened.read("llm_cache", "cache-a").await.unwrap()["response"]["ok"],
        true
    );
    tokio::fs::remove_dir_all(dir).await.unwrap();
}
#[tokio::test]
async fn store_crud_and_cascade() {
    let dir = std::env::temp_dir().join(format!("alice-cascade-{}", std::process::id()));
    let app = store::router(Arc::new(Store::local(dir.clone())));
    for t in ["runs", "results", "recordings"] {
        assert_eq!(
            request(
                app.clone(),
                "PUT",
                &format!("/v1/store/{t}/run-a"),
                json!({"ok":true})
            )
            .await
            .0,
            StatusCode::OK
        );
    }
    assert_eq!(
        request(app.clone(), "GET", "/v1/store/results/run-a", Value::Null)
            .await
            .0,
        StatusCode::OK
    );
    assert_eq!(
        request(app.clone(), "DELETE", "/v1/store/runs/run-a", Value::Null)
            .await
            .0,
        StatusCode::OK
    );
    for t in ["runs", "results", "recordings"] {
        assert_eq!(
            request(
                app.clone(),
                "GET",
                &format!("/v1/store/{t}/run-a"),
                Value::Null
            )
            .await
            .0,
            StatusCode::NOT_FOUND
        );
    }
    assert_eq!(
        request(app.clone(), "PUT", "/v1/store/unknown/item", json!({}))
            .await
            .0,
        StatusCode::NOT_FOUND
    );
    tokio::fs::remove_dir_all(dir).await.unwrap();
}
#[tokio::test]
async fn core_rejects_missing_or_incomplete_reactions() {
    let app = api::router();
    let (status, a) = request(
        app.clone(),
        "POST",
        "/v1/audience",
        json!({"depth":"quick","seed":42,"campaign":{}}),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(a["personas"]["count"], 500);
    let (status, _) = request(
        app.clone(),
        "POST",
        "/v1/simulate",
        json!({"audience_id":a["audience_id"],"reactions":[]}),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(
        request(app, "POST", "/v1/audience", json!({"depth":"deep"}))
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
}
