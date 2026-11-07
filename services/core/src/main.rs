use alice_core::{api, store::Store};
use axum::response::IntoResponse;
use axum::{Json, Router, routing::get};
use serde_json::json;
use std::sync::Arc;
use tower_http::{compression::CompressionLayer, trace::TraceLayer};
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("alice_core=info,tower_http=info")
        .init();
    let store = Arc::new(Store::new().await);
    let mode = store.mode().to_string();
    let internal_token = std::env::var("CORE_INTERNAL_TOKEN").ok();
    let app = Router::new()
        .route(
            "/v1/health",
            get(move || {
                let mode = mode.clone();
                async move { Json(json!({"ok":true,"engine":"rust","storage":mode})) }
            }),
        )
        .merge(api::router())
        .merge(alice_core::store::router(store))
        .layer(axum::extract::DefaultBodyLimit::max(8 * 1024 * 1024))
        .layer(CompressionLayer::new())
        .layer(axum::middleware::from_fn(
            move |req: axum::extract::Request, next: axum::middleware::Next| {
                let token = internal_token.clone();
                async move {
                    if req.uri().path() != "/v1/health" {
                        if let Some(token) = token {
                            let expected = format!("Bearer {token}");
                            if req
                                .headers()
                                .get("authorization")
                                .and_then(|v| v.to_str().ok())
                                != Some(expected.as_str())
                            {
                                return (
                                    axum::http::StatusCode::UNAUTHORIZED,
                                    "Internal access required",
                                )
                                    .into_response();
                            }
                        }
                    }
                    next.run(req).await
                }
            },
        ))
        .layer(TraceLayer::new_for_http());
    let port = std::env::var("CORE_PORT").unwrap_or_else(|_| "4000".into());
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{port}"))
        .await
        .unwrap();
    tracing::info!(port, "Alice Core ready");
    axum::serve(listener, app).await.unwrap();
}
