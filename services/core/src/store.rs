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
            sqlx::raw_sql(include_str!("../../../db/migrations/002_accounts.sql"))
                .execute(&p)
                .await
                .expect("account migration");
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
        "runs" | "results" | "llm_cache" | "recordings" | "users" | "sessions"
        | "conversations" => Ok(s),
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
        .route(
            "/v1/store/{table}/{id}",
            get(read).put(write).post(create).delete(remove_document),
        )
        .route(
            "/v1/store/runs/{id}",
            put(write_run).get(read_run).delete(delete),
        )
        .route("/v1/account/{id}", axum::routing::delete(remove_account))
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

async fn create(
    State(s): State<Arc<Store>>,
    Path((t, id)): Path<(String, String)>,
    Json(v): Json<Value>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    table(&t)?;
    if t != "users" || !v.is_object() {
        return Err(StatusCode::BAD_REQUEST);
    }
    if let Some(pool) = &s.pool {
        let result =
            sqlx::query("INSERT INTO users(id,document) VALUES($1,$2) ON CONFLICT DO NOTHING")
                .bind(&id)
                .bind(v)
                .execute(pool)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        if result.rows_affected() == 0 {
            return Err(StatusCode::CONFLICT);
        }
    } else {
        use tokio::io::AsyncWriteExt;
        let path = s.path(&t, &id);
        tokio::fs::create_dir_all(path.parent().unwrap())
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        let mut file = tokio::fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(path)
            .await
            .map_err(|_| StatusCode::CONFLICT)?;
        file.write_all(&serde_json::to_vec(&v).unwrap())
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }
    Ok(Json(json!({"ok":true})))
}
async fn remove_document(
    State(s): State<Arc<Store>>,
    Path((t, id)): Path<(String, String)>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    table(&t)?;
    if t != "sessions" {
        return Err(StatusCode::BAD_REQUEST);
    }
    if let Some(pool) = &s.pool {
        sqlx::query("DELETE FROM sessions WHERE id=$1")
            .bind(&id)
            .execute(pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    } else {
        let _ = tokio::fs::remove_file(s.path(&t, &id)).await;
    }
    Ok(Json(json!({"ok":true})))
}
async fn remove_account(
    State(s): State<Arc<Store>>,
    Path(id): Path<String>,
) -> Result<Json<Value>, StatusCode> {
    valid_id(&id)?;
    if let Some(pool) = &s.pool {
        let mut tx = pool
            .begin()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        for table in ["runs", "sessions", "llm_cache"] {
            let q = format!("DELETE FROM {table} WHERE document->>'user_id'=$1");
            sqlx::query(&q)
                .bind(&id)
                .execute(&mut *tx)
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
        sqlx::query("DELETE FROM users WHERE id=$1")
            .bind(&id)
            .execute(&mut *tx)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        tx.commit()
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    } else {
        for table in ["runs", "sessions", "llm_cache"] {
            let mut entries = match tokio::fs::read_dir(s.root.join(table)).await {
                Ok(e) => e,
                Err(_) => continue,
            };
            while let Some(entry) = entries
                .next_entry()
                .await
                .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
            {
                let data = tokio::fs::read(entry.path()).await.unwrap_or_default();
                if let Ok(doc) = serde_json::from_slice::<Value>(&data) {
                    if doc["user_id"] == id {
                        let name = entry
                            .path()
                            .file_stem()
                            .unwrap()
                            .to_string_lossy()
                            .to_string();
                        if table == "runs" {
                            for related in ["results", "recordings"] {
                                let _ = tokio::fs::remove_file(s.path(related, &name)).await;
                            }
                        }
                        let _ = tokio::fs::remove_file(entry.path()).await;
                    }
                }
            }
        }
        for table in ["users", "conversations"] {
            let _ = tokio::fs::remove_file(s.path(table, &id)).await;
        }
    }
    Ok(Json(json!({"ok":true})))
}
