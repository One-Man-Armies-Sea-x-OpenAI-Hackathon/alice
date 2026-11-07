use alice_core::{api, store::Store};
use axum::{Json, Router, routing::get};
use serde_json::json;
use std::sync::Arc;
use tower_http::{compression::CompressionLayer, cors::CorsLayer, trace::TraceLayer};
#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter("alice_core=info,tower_http=info")
        .init();
    let store = Arc::new(Store::new().await);
    let mode = store.mode().to_string();
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
        .layer(CorsLayer::permissive())
        .layer(TraceLayer::new_for_http());
    let port = std::env::var("CORE_PORT").unwrap_or_else(|_| "4000".into());
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{port}"))
        .await
        .unwrap();
    tracing::info!(port, "Alice Core ready");
    axum::serve(listener, app).await.unwrap();
}
