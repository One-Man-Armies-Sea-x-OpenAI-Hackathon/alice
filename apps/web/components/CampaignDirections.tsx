"use client";
import AutoTextarea from "./AutoTextarea";
import type { Campaign } from "@alice/contracts";
import VisualReference from "./VisualReference";
import { nextDirectionId, directionColor } from "../lib/display";
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
export default function CampaignDirections({
  campaign: c,
  onChange,
  onReference,
  onReferenceBusy,
  disabled,
  open,
  onClose,
}: {
  campaign: Campaign;
  onChange: (c: Campaign) => void;
  onReference: (
    campaignId: string,
    variantId: string,
    description: string,
    filename: string,
  ) => void;
  onReferenceBusy: (
    campaignId: string,
    variantId: string,
    busy: boolean,
  ) => void;
  disabled?: boolean;
  open?: boolean;
  onClose: () => void;
}) {
  return (
    <aside
      className={`directions-panel ${open ? "open" : ""}`}
      aria-label="Campaign directions"
    >
      <header className="directions-heading">
        <h2>Campaign directions</h2>
        <button
          className="directions-close icon-button"
          aria-label="Close directions panel"
          onClick={onClose}
        >
          ×
        </button>
        <p>One campaign. Explore a single direction or compare several.</p>
      </header>
      <fieldset disabled={disabled}>
        <div className="composer-header">
          <div className="segmented">
            <button
              className={c.variants.length === 1 ? "active" : ""}
              onClick={() => onChange({ ...c, variants: [c.variants[0]] })}
            >
              Single direction
            </button>
            <button
              className={c.variants.length > 1 ? "active" : ""}
              onClick={() =>
                onChange({
                  ...c,
                  variants:
                    c.variants.length > 1
                      ? c.variants
                      : [
                          ...c.variants,
                          {
                            ...clone(c.variants[0]),
                            id: nextDirectionId(c.variants.map((v) => v.id)),
                            label: `Direction ${nextDirectionId(c.variants.map((v) => v.id))}`,
                            headline: "",
                            copy: "",
                            visual_description: "",
                            attachment_ids: [],
                          },
                        ],
                })
              }
            >
              Multiple directions
            </button>
          </div>
          <label className="brand-field">
            Brand{" "}
            <input
              value={c.brand}
              placeholder="Your brand"
              onChange={(e) => onChange({ ...c, brand: e.target.value })}
            />
          </label>
        </div>
        <p className="mode-description">
          {c.variants.length > 1
            ? "Add as many creative directions as you need. Each simulation uses the same audience and a capped model-call budget."
            : "Explore how one campaign lands, where it loses interest, and what to improve."}
        </p>
        <div className="variant-tray">
          {c.variants.map((v, i) => (
            <div className="variant-card" key={v.id}>
              <div>
                <span
                  style={{
                    color: directionColor(v.id),
                  }}
                >
                  ●
                </span>
                <input
                  aria-label={`Variant ${v.id} label`}
                  value={v.label}
                  onChange={(e) =>
                    onChange({
                      ...c,
                      variants: c.variants.map((x, j) =>
                        j === i ? { ...x, label: e.target.value } : x,
                      ),
                    })
                  }
                />
                <b>{v.id}</b>
                {c.variants.length > 1 && (
                  <button
                    aria-label={`Remove variant ${v.id}`}
                    onClick={() =>
                      onChange({
                        ...c,
                        variants: c.variants.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </button>
                )}
              </div>
              <label className="creative-label" htmlFor={`headline-${v.id}`}>
                Headline
                <small>The main line that catches attention.</small>
              </label>
              <AutoTextarea
                id={`headline-${v.id}`}
                className="creative-field headline-field"
                aria-label={`Variant ${v.id} headline`}
                placeholder="Headline in Indonesian…"
                value={v.headline}
                onChange={(e) =>
                  onChange({
                    ...c,
                    variants: c.variants.map((x, j) =>
                      j === i ? { ...x, headline: e.target.value } : x,
                    ),
                  })
                }
              />
              <label className="creative-label" htmlFor={`message-${v.id}`}>
                Supporting message
                <small>
                  The offer, product benefit, or next action under the headline.
                </small>
              </label>
              <AutoTextarea
                id={`message-${v.id}`}
                className="creative-field"
                aria-label={`Variant ${v.id} copy`}
                placeholder="Supporting message: explain the offer, benefit or call to action…"
                value={v.copy}
                onChange={(e) =>
                  onChange({
                    ...c,
                    variants: c.variants.map((x, j) =>
                      j === i ? { ...x, copy: e.target.value } : x,
                    ),
                  })
                }
              />
              <label className="creative-label" htmlFor={`visual-${v.id}`}>
                Visual reference or scene
                <small>
                  Attach a reference image, or describe what the audience will
                  see.
                </small>
              </label>
              <AutoTextarea
                id={`visual-${v.id}`}
                className="creative-field"
                aria-label={`Variant ${v.id} visual idea`}
                placeholder="What people will see: scene, people, product and on-screen text"
                value={v.visual_description}
                onChange={(e) =>
                  onChange({
                    ...c,
                    variants: c.variants.map((x, j) =>
                      j === i
                        ? { ...x, visual_description: e.target.value }
                        : x,
                    ),
                  })
                }
              />
              <VisualReference
                key={`${c.id}-${v.id}`}
                disabled={disabled}
                onBusy={(busy) => onReferenceBusy(c.id, v.id, busy)}
                onRead={(description, filename) =>
                  onReference(c.id, v.id, description, filename)
                }
              />
            </div>
          ))}
          {c.variants.length >= 2 && (
            <button
              className="add-variant"
              aria-label="Add direction"
              onClick={() =>
                onChange({
                  ...c,
                  variants: [
                    ...c.variants,
                    {
                      ...clone(c.variants[0]),
                      id: nextDirectionId(c.variants.map((v) => v.id)),
                      label: `Direction ${nextDirectionId(c.variants.map((v) => v.id))}`,
                      headline: "",
                      copy: "",
                      visual_description: "",
                      attachment_ids: [],
                    },
                  ],
                })
              }
            >
              ＋<span>Add direction</span>
            </button>
          )}
        </div>
      </fieldset>
    </aside>
  );
}
