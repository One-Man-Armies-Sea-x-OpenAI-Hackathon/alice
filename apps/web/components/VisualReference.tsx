"use client";
import { useEffect, useRef, useState } from "react";
import { uploadReference } from "../lib/http";

export default function VisualReference({
  onRead,
  disabled,
  onBusy,
}: {
  onRead: (description: string, filename: string) => void;
  disabled?: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [stage, setStage] = useState("selected");
  const [upload, setUpload] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const busy = stage === "uploading" || stage === "reading";
  useEffect(() => {
    if (!file) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!busy) return;
    const started = Date.now();
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [busy]);
  function choose(next?: File) {
    if (!next) return;
    setError("");
    if (
      !["image/png", "image/jpeg", "image/webp"].includes(next.type) ||
      next.size > 3_000_000
    ) {
      setError("Choose a PNG, JPEG or WebP under 3 MB.");
      return;
    }
    setFile(next);
    setStage("selected");
    setUpload(0);
    setElapsed(0);
  }
  async function confirm() {
    if (!file || busy) return;
    setError("");
    onBusy(true);
    setStage("uploading");
    setElapsed(0);
    try {
      const result = await uploadReference(file, setUpload, () =>
        setStage("reading"),
      );
      const description = [
        result.description,
        result.detected_text?.length
          ? `Visible text: ${result.detected_text.join(" · ")}`
          : "",
        result.uncertainties?.length
          ? `Uncertainties: ${result.uncertainties.join("; ")}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");
      onRead(description, file.name);
      setStage("done");
    } catch (e) {
      setStage("failed");
      setError(
        e instanceof Error ? e.message : "Reading failed. Please try again.",
      );
    } finally {
      onBusy(false);
    }
  }
  return (
    <div className="visual-reference">
      <input
        ref={input}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(e) => {
          choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        className="visual-reference-button"
        disabled={disabled || busy}
        onClick={() => input.current?.click()}
      >
        ＋ {file ? "Choose another reference" : "Attach visual reference"}
      </button>
      {file && (
        <div className="reference-preview">
          {preview && (
            <img src={preview} alt="Selected visual reference preview" />
          )}
          <div>
            <strong>{file.name}</strong>
            <small>
              {Math.ceil(file.size / 1000)} KB ·{" "}
              {stage === "done" ? "Reference added" : "Image reference"}
            </small>
          </div>
          {!busy && stage !== "done" && (
            <div className="reference-confirm-actions">
              <button className="primary" disabled={disabled} onClick={confirm}>
                {stage === "failed"
                  ? "Retry reading reference"
                  : "Confirm and read reference"}
              </button>
              <button
                aria-label="Remove selected reference"
                onClick={() => {
                  setFile(null);
                  setError("");
                }}
              >
                Remove
              </button>
            </div>
          )}
          {busy && (
            <div
              className="reference-progress"
              role="status"
              aria-live="polite"
            >
              <span>
                {stage === "uploading"
                  ? `Uploading reference · ${upload}%`
                  : `Reading reference · ${elapsed}s`}
              </span>
              <progress
                aria-label={
                  stage === "uploading"
                    ? "Uploading visual reference"
                    : "Reading visual reference"
                }
                max={100}
                {...(stage === "uploading" ? { value: upload } : {})}
              />
              <small>
                {stage === "reading"
                  ? "Waiting for the model’s description. You can keep working."
                  : "Sending the confirmed file securely."}
              </small>
            </div>
          )}
        </div>
      )}
      {error && (
        <p className="reference-error bad" role="alert">
          ! {error}
        </p>
      )}
    </div>
  );
}
