use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, put},
};
use serde_json::{Value, json};
use sqlx::{PgPool, postgres::PgPoolOptions};
use std::{path::PathBuf, sync::Arc};
#[derive(Clone)]
pub struct Store {
    pool: Option<PgPool>,
    root: PathBuf,
}
impl Store {
    pub fn local(root: PathBuf) -> Self {
        Self { pool: None, root }
    }
    pub async fn new() -> Self {
        let root = std::env::var("ALICE_DATA_DIR")
            .unwrap_or_else(|_| ".data".into())
            .into();
        let pool = if let Ok(url) = std::env::var("DATABASE_URL") {
            let p = PgPoolOptions::new()
                .max_connections(8)
                .connect(&url)
                .await
                .expect("DATABASE_URL configured but Postgres unavailable");
            sqlx::raw_sql(include_str!("../../../db/migrations/001_initial.sql"))
                .execute(&p)
                .await
                .expect("migration");
            Some(p)
        } else {
            tracing::warn!("Using local file store; set DATABASE_URL for Postgres");
            None
        };
        Self { pool, root }
    }
    pub fn mode(&self) -> &str {
        if self.pool.is_some() {
            "postgres"
        } else {
            "local-files"
        }
    }
    pub async fn read(&self, table: &str, id: &str) -> Result<Value, StatusCode> {
        if let Some(pool) = &self.pool {
            let q = format!("SELECT document FROM {table} WHERE id=$1");
            sqlx::query_scalar::<_, Value>(&q)
                .bind(id)
                .fetch_optional(pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
                .ok_or(StatusCode::NOT_FOUND)
        } else {
            let data = tokio::fs::read(self.path(table, id))
                .await
                .map_err(|_| StatusCode::NOT_FOUND)?;
            serde_json::from_slice(&data).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
    pub async fn write(&self, table: &str, id: &str, value: Value) -> Result<(), StatusCode> {
        if let Some(pool) = &self.pool {
            let q = format!(
                "INSERT INTO {table}(id,document) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET document=excluded.document"
            );
            sqlx::query(&q)
                .bind(id)
                .bind(value)
                .execute(pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        } else {
            let path = self.path(table, id);
            tokio::fs::create_dir_all(path.parent().unwrap())
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            let tmp = path.with_extension(format!(
                "{}.tmp",
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_nanos()
            ));
            tokio::fs::write(&tmp, serde_json::to_vec(&value).unwrap())
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
            tokio::fs::rename(tmp, path)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
        Ok(())
    }
    fn path(&self, table: &str, id: &str) -> PathBuf {
        self.root.join(table).join(format!("{id}.json"))
    }
}
fn table(s: &str) -> Result<&str, StatusCode> {
    match s {
        "runs" | "results" | "llm_cache" | "recordings" => Ok(s),
        _ => Err(StatusCode::NOT_FOUND),
    }
}
fn valid_id(s: &str) -> Result<(), StatusCode> {
    if !s.is_empty()
        && s.len() < 200
        && s.chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
    {
        Ok(())
    } else {
        Err(StatusCode::BAD_REQUEST)
    }
}
async fn read(
    State(s): State<Arc<Store>>,
    Path((t, id)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    Ok(Json(s.read(table(&t)?, &id).await?))
}
async fn write(
    State(s): State<Arc<Store>>,
    Path((t, id)): Path<(String, String)>,
    Json(v): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    table(&t)?;
    if !v.is_object() {
        return Err(StatusCode::BAD_REQUEST);
    }
    s.write(&t, &id, v).await?;
    Ok(Json(json!({"ok":true})))
}
async fn delete(
    State(s): State<Arc<Store>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    if let Some(pool) = &s.pool {
        sqlx::query("DELETE FROM runs WHERE id=$1")
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    } else {
        for table in ["runs", "results", "recordings"] {
            let _ = tokio::fs::remove_file(s.path(table, &id)).await;
        }
    }
    Ok(Json(json!({"ok":true})))
}
pub fn router(s: Arc<Store>) -> Router {
    Router::new()
        .route("/v1/store/{table}/{id}", get(read).put(write))
        .route(
            "/v1/store/runs/{id}",
            put(write_run).get(read_run).delete(delete),
        )
        .with_state(s)
}
async fn write_run(
    State(s): State<Arc<Store>>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    s.write("runs", &id, v).await?;
    Ok(Json(json!({"ok":true})))
}
async fn read_run(
    State(s): State<Arc<Store>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    Ok(Json(s.read("runs", &id).await?))
}
