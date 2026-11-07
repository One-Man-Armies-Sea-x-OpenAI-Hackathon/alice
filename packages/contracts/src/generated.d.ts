export interface AggregateRequest {
  audience_id: string;
  outcomes_handle?: string;
}

export interface AggregateResponse {
  per_variant: {
    variant_id: string;
    label: string;
    overall: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
    };
    by_dimension: {
      region: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      age: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      platform: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      religion: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      tier: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
    };
    trait: string;
  }[];
  ranking: {
    dimension: "region" | "age" | "platform" | "religion" | "tier";
    group: string;
    winner: string;
    order: string[];
    margin: number;
    why: string;
  }[];
  overall: {
    winner: string;
    margin: number;
    is_tie: boolean;
    confidence: "High" | "Medium" | "Low";
    regions_won: number;
    recommended: string | null;
    recommendation_note: string;
    robustness: {
      noise_floor: number;
      checks_won: number;
      checks_total: number;
      audience_won: number;
      audience_total: number;
      constants_won: number;
      constants_total: number;
    };
  };
}

export interface Archetype {
  id: string;
  segment: {
    region: "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
    city_tier: "metro" | "tier2" | "tier3";
    age_band: "18-24" | "25-34" | "35-44" | "45+";
    religion: "islam" | "kristen" | "katolik" | "hindu" | "buddha" | "other";
    income_band: "low" | "mid" | "high";
    platform: "tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp";
    language_style: "slang" | "casual" | "formal";
    religiosity_band: "low" | "mid" | "high";
  };
  weight: number;
  persona_count: number;
  blurb: string;
  label: string;
}

export interface AudienceRequest {
  campaign: {
    id: string;
    campaign_type: "business" | "activist" | "political";
    brand: string;
    product: string;
    objective: string;
    channels: ("tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp" | "outdoor")[];
    location: string;
    target_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    outdoor_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    timing: string;
    notes: string;
    /**
     * @minItems 1
     */
    variants: [
      {
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      },
      ...{
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      }[]
    ];
    tools: {
      risk: boolean;
      calendar: boolean;
      rewrite: boolean;
    };
    depth: "quick" | "standard";
    seed: number;
  };
  depth: "quick" | "standard";
  seed: number;
}

export interface AudienceResponse {
  audience_id: string;
  archetypes: {
    id: string;
    segment: {
      region: "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
      city_tier: "metro" | "tier2" | "tier3";
      age_band: "18-24" | "25-34" | "35-44" | "45+";
      religion: "islam" | "kristen" | "katolik" | "hindu" | "buddha" | "other";
      income_band: "low" | "mid" | "high";
      platform: "tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp";
      language_style: "slang" | "casual" | "formal";
      religiosity_band: "low" | "mid" | "high";
    };
    weight: number;
    persona_count: number;
    blurb: string;
    label: string;
  }[];
  personas: {
    count: number;
    region: number[];
    city_tier: number[];
    age_band: number[];
    religion: number[];
    income_band: number[];
    platform: number[];
    language_style: number[];
    religiosity: number[];
    sensitivity: number[];
    virality: number[];
    longitude: number[];
    latitude: number[];
    archetype_index: number[];
    city: number[];
    lookups: {
      region: string[];
      platform: string[];
      religion: string[];
      city_tier: string[];
      age_band: string[];
      cities: string[];
    };
  };
}

export interface BaselineModel {
  winner: string;
  summary: string;
  risks: string[];
  segment_notes: string[];
}

export interface Baseline {
  winner: string;
  summary: string;
  risks: string[];
  segment_notes: string[];
  missed: string[];
  baseline_only: {
    text: string;
    status: "not_supported" | "not_tested";
  }[];
}

export interface Blurbs {
  blurbs: {
    archetype_id: string;
    label: string;
    blurb: string;
  }[];
}

export interface Campaign {
  id: string;
  campaign_type: "business" | "activist" | "political";
  brand: string;
  product: string;
  objective: string;
  channels: ("tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp" | "outdoor")[];
  location: string;
  target_regions: (
    "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
  )[];
  outdoor_regions: (
    "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
  )[];
  timing: string;
  notes: string;
  /**
   * @minItems 1
   */
  variants: [
    {
      id: string;
      label: string;
      headline: string;
      copy: string;
      visual_description: string;
      attachment_ids: string[];
      ai_drafted: boolean;
    },
    ...{
      id: string;
      label: string;
      headline: string;
      copy: string;
      visual_description: string;
      attachment_ids: string[];
      ai_drafted: boolean;
    }[]
  ];
  tools: {
    risk: boolean;
    calendar: boolean;
    rewrite: boolean;
  };
  depth: "quick" | "standard";
  seed: number;
}

export interface Clarifier {
  ready: boolean;
  /**
   * @maxItems 3
   */
  questions:
    | []
    | [
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        }
      ]
    | [
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        },
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        }
      ]
    | [
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        },
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        },
        {
          id: string;
          text: string;
          options: string[];
          allows_free_text: boolean;
        }
      ];
  extracted: {
    brand: string;
    product: string;
    campaign_type: "business" | "activist" | "political";
    channels: ("tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp" | "outdoor")[];
    location: string;
    target_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    outdoor_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    timing: string;
    /**
     * @minItems 1
     */
    variants: [
      {
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      },
      ...{
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      }[]
    ];
    detected_missing: string[];
  };
}

export interface ClarifyRequest {
  campaign: {
    id: string;
    campaign_type: "business" | "activist" | "political";
    brand: string;
    product: string;
    objective: string;
    channels: ("tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp" | "outdoor")[];
    location: string;
    target_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    outdoor_regions: (
      "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua"
    )[];
    timing: string;
    notes: string;
    /**
     * @minItems 1
     */
    variants: [
      {
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      },
      ...{
        id: string;
        label: string;
        headline: string;
        copy: string;
        visual_description: string;
        attachment_ids: string[];
        ai_drafted: boolean;
      }[]
    ];
    tools: {
      risk: boolean;
      calendar: boolean;
      rewrite: boolean;
    };
    depth: "quick" | "standard";
    seed: number;
  };
  answers?: {
    [k: string]: string;
  };
}

export type DirectionId = string;

export interface Edge {
  from: number;
  to: number;
  anger: boolean;
}

export interface Event {
  run_id: string;
  seq: number;
  time_ms: number;
  type:
    | "stage"
    | "brief"
    | "audience"
    | "reaction"
    | "spread"
    | "rollup"
    | "robustness"
    | "baseline"
    | "risk"
    | "fix"
    | "done"
    | "error";
  data: {
    [k: string]: unknown;
  };
}

export interface Explain {
  rows: {
    dimension: string;
    group: string;
    why: string;
  }[];
  insights: string[];
  next_steps: string[];
}

export interface FixRequest {
  flag_id: string;
}

export interface Fix {
  flag_id: string;
  variant_id: string;
  original: {
    headline: string;
    copy: string;
    visual: string;
  };
  rewrite: {
    headline: string;
    copy: string;
    visual: string;
  };
  changes: string[];
  self_check_new_risks: string[];
  rounds: number;
  status: "cleared" | "needs_human";
  rerun?: {
    before: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
    };
    after: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
    };
    method: "rescored" | "neutralized";
    archetypes_rescored: number;
    control_archetypes: number;
  };
}

export interface Guardrail {
  decision: "allowed" | "blocked";
  reason: string;
}

export interface Metrics {
  n: number;
  reach: number;
  engagement: number;
  sentiment: number;
  backlash: number;
  anger_reach: number;
  score: number;
}

export interface Outcome {
  variant_id: string;
  exposed: number[];
  engaged: number[];
  objected: number[];
  sentiment: number[];
  shared: number[];
  via_anger: number[];
  ticks: number[][];
  edges: {
    from: number;
    to: number;
    anger: boolean;
  }[][];
}

export interface PerVariant {
  variant_id: string;
  label: string;
  overall: {
    n: number;
    reach: number;
    engagement: number;
    sentiment: number;
    backlash: number;
    anger_reach: number;
    score: number;
  };
  by_dimension: {
    region: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
      group: string;
      share: number;
    }[];
    age: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
      group: string;
      share: number;
    }[];
    platform: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
      group: string;
      share: number;
    }[];
    religion: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
      group: string;
      share: number;
    }[];
    tier: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
      group: string;
      share: number;
    }[];
  };
  trait: string;
}

export interface PersonaTable {
  count: number;
  region: number[];
  city_tier: number[];
  age_band: number[];
  religion: number[];
  income_band: number[];
  platform: number[];
  language_style: number[];
  religiosity: number[];
  sensitivity: number[];
  virality: number[];
  longitude: number[];
  latitude: number[];
  archetype_index: number[];
  city: number[];
  lookups: {
    region: string[];
    platform: string[];
    religion: string[];
    city_tier: string[];
    age_band: string[];
    cities: string[];
  };
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  allows_free_text: boolean;
}

export interface Ranking {
  dimension: "region" | "age" | "platform" | "religion" | "tier";
  group: string;
  winner: string;
  order: string[];
  margin: number;
  why: string;
}

export interface Reaction {
  archetype_id: string;
  variant_id: string;
  attention: number;
  sentiment: number;
  share_likelihood: number;
  click_likelihood: number;
  backlash_risk: number;
  backlash_category:
    | "none"
    | "sara_religion"
    | "sara_ethnicity"
    | "sara_class"
    | "local_norms"
    | "language_tone"
    | "political"
    | "copycat_legal"
    | "other";
  reason: string;
  sample_comment: string;
}

export interface RerunRequest {
  audience_id: string;
  variant_id: string;
  method: "rescored" | "neutralized";
  reactions: {
    archetype_id: string;
    variant_id: string;
    attention: number;
    sentiment: number;
    share_likelihood: number;
    click_likelihood: number;
    backlash_risk: number;
    backlash_category:
      | "none"
      | "sara_religion"
      | "sara_ethnicity"
      | "sara_class"
      | "local_norms"
      | "language_tone"
      | "political"
      | "copycat_legal"
      | "other";
    reason: string;
    sample_comment: string;
  }[];
}

export interface RerunResponse {
  before: {
    n: number;
    reach: number;
    engagement: number;
    sentiment: number;
    backlash: number;
    anger_reach: number;
    score: number;
  };
  after: {
    n: number;
    reach: number;
    engagement: number;
    sentiment: number;
    backlash: number;
    anger_reach: number;
    score: number;
  };
  method: "rescored" | "neutralized";
  aggregate: {
    per_variant: {
      variant_id: string;
      label: string;
      overall: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
      };
      by_dimension: {
        region: {
          n: number;
          reach: number;
          engagement: number;
          sentiment: number;
          backlash: number;
          anger_reach: number;
          score: number;
          group: string;
          share: number;
        }[];
        age: {
          n: number;
          reach: number;
          engagement: number;
          sentiment: number;
          backlash: number;
          anger_reach: number;
          score: number;
          group: string;
          share: number;
        }[];
        platform: {
          n: number;
          reach: number;
          engagement: number;
          sentiment: number;
          backlash: number;
          anger_reach: number;
          score: number;
          group: string;
          share: number;
        }[];
        religion: {
          n: number;
          reach: number;
          engagement: number;
          sentiment: number;
          backlash: number;
          anger_reach: number;
          score: number;
          group: string;
          share: number;
        }[];
        tier: {
          n: number;
          reach: number;
          engagement: number;
          sentiment: number;
          backlash: number;
          anger_reach: number;
          score: number;
          group: string;
          share: number;
        }[];
      };
      trait: string;
    }[];
    ranking: {
      dimension: "region" | "age" | "platform" | "religion" | "tier";
      group: string;
      winner: string;
      order: string[];
      margin: number;
      why: string;
    }[];
    overall: {
      winner: string;
      margin: number;
      is_tie: boolean;
      confidence: "High" | "Medium" | "Low";
      regions_won: number;
      recommended: string | null;
      recommendation_note: string;
      robustness: {
        noise_floor: number;
        checks_won: number;
        checks_total: number;
        audience_won: number;
        audience_total: number;
        constants_won: number;
        constants_total: number;
      };
    };
  };
  outcomes: {
    variant_id: string;
    exposed: number[];
    engaged: number[];
    objected: number[];
    sentiment: number[];
    shared: number[];
    via_anger: number[];
    ticks: number[][];
    edges: {
      from: number;
      to: number;
      anger: boolean;
    }[][];
  }[];
}

export interface Result {
  run_id: string;
  campaign_id: string;
  seed: number;
  depth: "quick" | "standard";
  status: "running" | "done" | "failed";
  personas_total: number;
  archetypes_total: number;
  llm_calls: number;
  cache_hits: number;
  failures: number;
  per_variant: {
    variant_id: string;
    label: string;
    overall: {
      n: number;
      reach: number;
      engagement: number;
      sentiment: number;
      backlash: number;
      anger_reach: number;
      score: number;
    };
    by_dimension: {
      region: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      age: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      platform: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      religion: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
      tier: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
        group: string;
        share: number;
      }[];
    };
    trait: string;
  }[];
  ranking: {
    dimension: "region" | "age" | "platform" | "religion" | "tier";
    group: string;
    winner: string;
    order: string[];
    margin: number;
    why: string;
  }[];
  overall: {
    winner: string;
    margin: number;
    is_tie: boolean;
    confidence: "High" | "Medium" | "Low";
    regions_won: number;
    recommended: string | null;
    recommendation_note: string;
    robustness: {
      noise_floor: number;
      checks_won: number;
      checks_total: number;
      audience_won: number;
      audience_total: number;
      constants_won: number;
      constants_total: number;
    };
  };
  baseline: {
    winner: string;
    summary: string;
    risks: string[];
    segment_notes: string[];
    missed: string[];
    baseline_only: {
      text: string;
      status: "not_supported" | "not_tested";
    }[];
  };
  risk_flags: {
    id: string;
    variant_id: string;
    severity: "high" | "medium" | "low";
    category:
      | "none"
      | "sara_religion"
      | "sara_ethnicity"
      | "sara_class"
      | "local_norms"
      | "language_tone"
      | "political"
      | "copycat_legal"
      | "other";
    title: string;
    explanation: string;
    segments: {
      key: string;
      backlash: number;
    }[];
    map_region: "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
    evidence: {
      comment: string;
      persona_tags: string[];
    };
    suggested_fix_direction: string;
    rule_id: string;
  }[];
  fixes: {
    flag_id: string;
    variant_id: string;
    original: {
      headline: string;
      copy: string;
      visual: string;
    };
    rewrite: {
      headline: string;
      copy: string;
      visual: string;
    };
    changes: string[];
    self_check_new_risks: string[];
    rounds: number;
    status: "cleared" | "needs_human";
    rerun?: {
      before: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
      };
      after: {
        n: number;
        reach: number;
        engagement: number;
        sentiment: number;
        backlash: number;
        anger_reach: number;
        score: number;
      };
      method: "rescored" | "neutralized";
      archetypes_rescored: number;
      control_archetypes: number;
    };
  }[];
  insights: string[];
  next_steps: string[];
  translations: {
    source: string;
    english: string;
  }[];
}

export interface Rewrite {
  headline: string;
  copy: string;
  visual_description: string;
  changes: string[];
  kept: string[];
  self_check_new_risks: string[];
}

export interface RiskFlag {
  id: string;
  variant_id: string;
  severity: "high" | "medium" | "low";
  category:
    | "none"
    | "sara_religion"
    | "sara_ethnicity"
    | "sara_class"
    | "local_norms"
    | "language_tone"
    | "political"
    | "copycat_legal"
    | "other";
  title: string;
  explanation: string;
  segments: {
    key: string;
    backlash: number;
  }[];
  map_region: "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
  evidence: {
    comment: string;
    persona_tags: string[];
  };
  suggested_fix_direction: string;
  rule_id: string;
}

export interface RiskList {
  /**
   * @maxItems 6
   */
  flags:
    | []
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ]
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ]
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ]
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ]
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ]
    | [
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        },
        {
          id: string;
          variant_id: string;
          severity: "high" | "medium" | "low";
          category:
            | "none"
            | "sara_religion"
            | "sara_ethnicity"
            | "sara_class"
            | "local_norms"
            | "language_tone"
            | "political"
            | "copycat_legal"
            | "other";
          title: string;
          explanation: string;
          segments: {
            key: string;
            backlash: number;
          }[];
          map_region:
            "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
          evidence: {
            comment: string;
            persona_tags: string[];
          };
          suggested_fix_direction: string;
          rule_id: string;
        }
      ];
}

export interface RobustnessRequest {
  audience_id: string;
  reactions: {
    archetype_id: string;
    variant_id: string;
    attention: number;
    sentiment: number;
    share_likelihood: number;
    click_likelihood: number;
    backlash_risk: number;
    backlash_category:
      | "none"
      | "sara_religion"
      | "sara_ethnicity"
      | "sara_class"
      | "local_norms"
      | "language_tone"
      | "political"
      | "copycat_legal"
      | "other";
    reason: string;
    sample_comment: string;
  }[];
}

export interface RobustnessResponse {
  robustness: {
    noise_floor: number;
    checks_won: number;
    checks_total: number;
    audience_won: number;
    audience_total: number;
    constants_won: number;
    constants_total: number;
  };
  confidence: "High" | "Medium" | "Low";
  is_tie: boolean;
}

export interface Robustness {
  noise_floor: number;
  checks_won: number;
  checks_total: number;
  audience_won: number;
  audience_total: number;
  constants_won: number;
  constants_total: number;
}

export interface Segment {
  region: "jabodetabek" | "jawa_other" | "sumatra" | "kalimantan" | "sulawesi" | "bali_nusa" | "maluku_papua";
  city_tier: "metro" | "tier2" | "tier3";
  age_band: "18-24" | "25-34" | "35-44" | "45+";
  religion: "islam" | "kristen" | "katolik" | "hindu" | "buddha" | "other";
  income_band: "low" | "mid" | "high";
  platform: "tiktok" | "instagram" | "youtube" | "facebook" | "x" | "whatsapp";
  language_style: "slang" | "casual" | "formal";
  religiosity_band: "low" | "mid" | "high";
}

export interface SimulateRequest {
  audience_id: string;
  seed?: number;
  reactions: {
    archetype_id: string;
    variant_id: string;
    attention: number;
    sentiment: number;
    share_likelihood: number;
    click_likelihood: number;
    backlash_risk: number;
    backlash_category:
      | "none"
      | "sara_religion"
      | "sara_ethnicity"
      | "sara_class"
      | "local_norms"
      | "language_tone"
      | "political"
      | "copycat_legal"
      | "other";
    reason: string;
    sample_comment: string;
  }[];
}

export interface SimulateResponse {
  outcomes_handle: string;
  outcomes: {
    variant_id: string;
    exposed: number[];
    engaged: number[];
    objected: number[];
    sentiment: number[];
    shared: number[];
    via_anger: number[];
    ticks: number[][];
    edges: {
      from: number;
      to: number;
      anger: boolean;
    }[][];
  }[];
}

export interface StartResponse {
  run_id: string;
  mock: boolean;
  replay: boolean;
}

export interface Translation {
  translations: {
    source: string;
    english: string;
  }[];
}

export interface Variant {
  id: string;
  label: string;
  headline: string;
  copy: string;
  visual_description: string;
  attachment_ids: string[];
  ai_drafted: boolean;
}
