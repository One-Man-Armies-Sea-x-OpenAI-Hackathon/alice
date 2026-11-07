pub const REGIONS: [&str; 7] = [
    "jabodetabek",
    "jawa_other",
    "sumatra",
    "kalimantan",
    "sulawesi",
    "bali_nusa",
    "maluku_papua",
];
pub const RELIGIONS: [&str; 6] = ["islam", "kristen", "katolik", "hindu", "buddha", "other"];
pub const PLATFORMS: [&str; 6] = [
    "tiktok",
    "instagram",
    "youtube",
    "facebook",
    "x",
    "whatsapp",
];
pub const AGES: [&str; 4] = ["18-24", "25-34", "35-44", "45+"];
pub const TIERS: [&str; 3] = ["metro", "tier2", "tier3"];
pub const REGION_WEIGHTS: [f64; 7] = [0.1301, 0.4578, 0.2068, 0.0603, 0.0651, 0.0528, 0.0270];
pub const RELIGION_MIX: [[f64; 6]; 7] = [
    [0.887, 0.060, 0.026, 0.002, 0.024, 0.001],
    [0.964, 0.017, 0.011, 0.003, 0.003, 0.002],
    [0.886, 0.085, 0.015, 0.003, 0.010, 0.001],
    [0.780, 0.120, 0.070, 0.006, 0.020, 0.004],
    [0.812, 0.160, 0.015, 0.008, 0.003, 0.002],
    [0.425, 0.130, 0.185, 0.255, 0.004, 0.001],
    [0.390, 0.480, 0.120, 0.005, 0.002, 0.003],
];
pub const TIER_MIX: [[f64; 3]; 7] = [
    [0.62, 0.28, 0.10],
    [0.12, 0.38, 0.50],
    [0.12, 0.28, 0.60],
    [0.05, 0.32, 0.63],
    [0.12, 0.25, 0.63],
    [0.08, 0.27, 0.65],
    [0.02, 0.25, 0.73],
];
pub const AGE_MIX: [f64; 4] = [0.19, 0.27, 0.23, 0.31];
pub const INCOME_MIX: [[f64; 3]; 3] = [[0.20, 0.55, 0.25], [0.35, 0.50, 0.15], [0.55, 0.38, 0.07]];
pub const PLATFORM_MIX: [[f64; 6]; 4] = [
    [0.38, 0.28, 0.12, 0.10, 0.06, 0.06],
    [0.33, 0.18, 0.17, 0.20, 0.06, 0.06],
    [0.26, 0.12, 0.20, 0.28, 0.04, 0.10],
    [0.15, 0.04, 0.33, 0.30, 0.01, 0.17],
];
pub const LANG_MIX: [[f64; 3]; 4] = [
    [0.50, 0.45, 0.05],
    [0.25, 0.62, 0.13],
    [0.10, 0.65, 0.25],
    [0.04, 0.50, 0.46],
];
#[derive(Clone)]
pub struct Constants {
    pub initial: f64,
    pub neighbor: f64,
    pub share: f64,
    pub drift: f64,
    pub anger: f64,
    pub anger_hit: f64,
}
impl Default for Constants {
    fn default() -> Self {
        Self {
            initial: 0.62,
            neighbor: 0.50,
            share: 1.5,
            drift: 0.28,
            anger: 1.4,
            anger_hit: 0.10,
        }
    }
}
pub fn score(reach: f64, engagement: f64, sentiment: f64, backlash: f64) -> f64 {
    100. * (0.35 * (engagement * 3.2).min(1.) + 0.25 * reach + 0.25 * (sentiment + 1.) / 2.
        - 0.35 * backlash
        + 0.10)
        .clamp(0., 1.)
}
// SplitMix64: explicitly specified arithmetic makes streams stable across crate versions.
pub fn draw(seed: u64, id: usize, purpose: u64) -> f64 {
    let mut x = seed
        .wrapping_add((id as u64).wrapping_mul(0x9e3779b97f4a7c15))
        .wrapping_add(purpose.wrapping_mul(0xbf58476d1ce4e5b9));
    x = (x ^ (x >> 30)).wrapping_mul(0xbf58476d1ce4e5b9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94d049bb133111eb);
    ((x ^ (x >> 31)) >> 11) as f64 / (1u64 << 53) as f64
}
pub fn pick(weights: &[f64], r: f64) -> usize {
    let t = r * weights.iter().sum::<f64>();
    let mut sum = 0.;
    for (i, w) in weights.iter().enumerate() {
        sum += w;
        if t < sum {
            return i;
        }
    }
    weights.len() - 1
}
pub fn round(x: f64) -> f64 {
    (x * 10000.).round() / 10000.
}
