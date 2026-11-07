# 05. Indonesia data spec

Reference numbers for the audience builder. The engine samples personas from these distributions. Treat the confidence column honestly in the pitch. This file is a public-statistics reference written into a prompt; confirm with the organizers that this is allowed (see README).

## 1. Sources
| Id | What | Link |
|---|---|---|
| BPS SP2020 | Island population shares (Java 56.10, Sumatra 21.68, Sulawesi 7.36, Kalimantan 6.15, Bali and Nusa Tenggara 5.54, Maluku and Papua 3.17, percent) | https://setkab.go.id/hasil-sensus-penduduk-2020-bps-meski-lambat-ada-pergeseran-penduduk-antarpulau/ |
| APJII 2026 | Internet penetration by island and generation | https://selular.id/2026/06/penggunan-internet-indonesia-tahun-2026-capai-235-juta-jiwa/ |
| Dukcapil 2024 | National religion shares (Islam 87.08, Kristen 7.40, Katolik 3.07, Hindu 1.68, Buddha 0.71, percent) | https://databoks.katadata.co.id/datapublish/2024/08/08/mayoritas-penduduk-indonesia-beragama-islam-pada-semester-i-2024 |
| GWI / We Are Social | Monthly platform use among internet users | https://selular.id/2025/12/peringkat-10-besar-media-sosial-paling-populer-di-indonesia-2025/ |
| APJII platform surveys | Platform preference by generation | https://investortrust.id/business/76754/tiktok-tops-indonesias-social-media-landscape-apjii-survey-shows |
Codex may re-check these pages at build time; if a newer figure exists, use it and note the change.

## 2. Regions
Seven regions. Sample personas by **online weight**, not population weight.
| Region | Population share | Internet penetration | Online weight | Confidence |
|---|---|---|---|---|
| jabodetabek | 0.116 | 0.920 | 0.1301 | Estimate (split from Java) |
| jawa_other | 0.445 | 0.8437 | 0.4578 | Population: BPS minus Jabodetabek estimate; penetration derived so Java averages 85.95 |
| sumatra | 0.2168 | 0.7824 | 0.2068 | Official |
| kalimantan | 0.0615 | 0.8040 | 0.0603 | Official |
| sulawesi | 0.0736 | 0.7258 | 0.0651 | Official |
| bali_nusa | 0.0554 | 0.7814 | 0.0528 | Official |
| maluku_papua | 0.0317 | 0.6974 | 0.0270 | Official |
Online weight is population share times penetration, normalized to sum to 1.

## 3. Religion mix per region (estimates, calibrated so national totals match Dukcapil within about 0.8 points)
| Region | islam | kristen | katolik | hindu | buddha | other |
|---|---|---|---|---|---|---|
| jabodetabek | 0.887 | 0.060 | 0.026 | 0.002 | 0.024 | 0.001 |
| jawa_other | 0.964 | 0.017 | 0.011 | 0.003 | 0.003 | 0.002 |
| sumatra | 0.886 | 0.085 | 0.015 | 0.003 | 0.010 | 0.001 |
| kalimantan | 0.780 | 0.120 | 0.070 | 0.006 | 0.020 | 0.004 |
| sulawesi | 0.812 | 0.160 | 0.015 | 0.008 | 0.003 | 0.002 |
| bali_nusa | 0.425 | 0.130 | 0.185 | 0.255 | 0.004 | 0.001 |
| maluku_papua | 0.390 | 0.480 | 0.120 | 0.005 | 0.002 | 0.003 |
Improvement if time: replace with province-level Dukcapil tables.

## 4. City tier mix per region (estimates)
| Region | metro | tier2 | tier3 |
|---|---|---|---|
| jabodetabek | 0.62 | 0.28 | 0.10 |
| jawa_other | 0.12 | 0.38 | 0.50 |
| sumatra | 0.12 | 0.28 | 0.60 |
| kalimantan | 0.05 | 0.32 | 0.63 |
| sulawesi | 0.12 | 0.25 | 0.63 |
| bali_nusa | 0.08 | 0.27 | 0.65 |
| maluku_papua | 0.02 | 0.25 | 0.73 |

## 5. Age, income, platform (estimates informed by APJII and GWI)
**Age mix of online adults:** 18-24 0.19, 25-34 0.27, 35-44 0.23, 45+ 0.31.
**Income mix by city tier:** metro low 0.20, mid 0.55, high 0.25; tier2 low 0.35, mid 0.50, high 0.15; tier3 low 0.55, mid 0.38, high 0.07.
**Primary platform by age:**
| Age | tiktok | instagram | youtube | facebook | x | whatsapp |
|---|---|---|---|---|---|---|
| 18-24 | 0.38 | 0.28 | 0.12 | 0.10 | 0.06 | 0.06 |
| 25-34 | 0.33 | 0.18 | 0.17 | 0.20 | 0.06 | 0.06 |
| 35-44 | 0.26 | 0.12 | 0.20 | 0.28 | 0.04 | 0.10 |
| 45+ | 0.15 | 0.04 | 0.33 | 0.30 | 0.01 | 0.17 |
**Monthly use among internet users (for reference):** whatsapp 0.908, instagram 0.824, facebook 0.810, youtube 0.803, tiktok 0.784, x 0.504.
**Platform reach (design parameter, how far a post travels, tunable):** tiktok 0.95, instagram 0.70, youtube 0.70, facebook 0.60, x 0.55, whatsapp 0.45.
Note: the APJII 2025 and 2026 surveys disagree on YouTube's share, which is why the platform table is a rounded blend.

## 6. Language style
Base probabilities by age (slang, casual, formal): 18-24 (0.50, 0.45, 0.05); 25-34 (0.25, 0.62, 0.13); 35-44 (0.10, 0.65, 0.25); 45+ (0.04, 0.50, 0.46).
Platform shift added before normalizing (slang, casual, formal): tiktok and x (+0.15, -0.05, -0.10); instagram (+0.05, 0, -0.05); youtube (0, 0, 0); facebook (-0.05, 0, +0.05); whatsapp (-0.05, +0.05, 0). Floor each at 0.01.
This is a design assumption, not data.

## 7. Cities used to place personas on the map
Each persona is placed near a city picked by weight within its region, then jittered a little. Coordinates are approximate (longitude, latitude).
| Region | Cities (weight; lon, lat) |
|---|---|
| jabodetabek | Jakarta (0.55; 106.85, -6.20), Tangerang (0.15; 106.63, -6.17), Bekasi (0.15; 106.99, -6.24), Depok (0.15; 106.82, -6.45) |
| jawa_other | Bandung (0.20; 107.61, -6.91), Semarang (0.14; 110.42, -6.97), Yogyakarta (0.12; 110.37, -7.80), Surabaya (0.22; 112.75, -7.25), Malang (0.08; 112.63, -7.98), Cirebon (0.07; 108.55, -6.72), Solo (0.09; 110.82, -7.57), Serang (0.04; 106.15, -6.12), Banyuwangi (0.04; 114.20, -8.20) |
| sumatra | Medan (0.22; 98.67, 3.60), Palembang (0.15; 104.75, -2.98), Pekanbaru (0.12; 101.45, 0.51), Padang (0.10; 100.35, -0.95), Banda Aceh (0.07; 95.50, 5.30), Batam (0.10; 104.05, 1.05), Bandar Lampung (0.13; 105.26, -5.43), Jambi (0.06; 103.61, -1.61), Bengkulu (0.05; 102.30, -3.80) |
| kalimantan | Pontianak (0.25; 109.33, -0.03), Banjarmasin (0.25; 114.59, -3.32), Balikpapan (0.20; 116.83, -1.27), Samarinda (0.15; 117.15, -0.50), Palangkaraya (0.10; 113.90, -2.20), Tarakan (0.05; 117.60, 3.30) |
| sulawesi | Makassar (0.40; 119.43, -5.15), Manado (0.22; 124.84, 1.47), Palu (0.13; 119.87, -0.90), Kendari (0.15; 122.50, -3.97), Gorontalo (0.10; 123.06, 0.54) |
| bali_nusa | Denpasar (0.40; 115.22, -8.65), Mataram (0.20; 116.10, -8.58), Kupang (0.20; 123.60, -10.17), Labuan Bajo (0.07; 119.88, -8.50), Maumere (0.07; 122.20, -8.60), Sumbawa Besar (0.06; 117.40, -8.50) |
| maluku_papua | Jayapura (0.25; 140.70, -2.53), Sorong (0.18; 131.25, -0.87), Ambon (0.20; 128.18, -3.70), Ternate (0.12; 127.38, 0.79), Merauke (0.10; 140.40, -8.50), Manokwari (0.10; 134.06, -0.86), Timika (0.05; 136.90, -4.50) |

## 8. Map construction
Build a dot-matrix map of Indonesia: rasterize a simplified land boundary into evenly spaced dots (about 0.3 degrees apart, alternate rows offset by half a step for a hex feel). Source the boundary from a public-domain dataset such as Natural Earth (fetch at build time, simplify heavily), or hand-approximate polygons if there is no internet. Visible extent: longitude 94.6 to 141.6, latitude -11.2 to 6.6. Tag each dot with its region: Java dots within about 0.6 degrees of Jakarta are jabodetabek, other Java dots are jawa_other; Malaysian Borneo and other non-Indonesian land is drawn dim and untagged. Persona positions come from land dots within about 1 degree of their city, jittered by about 0.1 degrees. Jitter alone is not enough: agents collapse onto about 40 city points and the map looks empty.

## 9. Calendar moments (context for prompts)
Ramadan (month-long; iftar, sahur and THR timing; sacred framing of promotions is sensitive). Lebaran (mudik, THR, peak spending). Christmas and New Year (Christmas attributes on Muslim staff or products have caused controversy; year-end travel peak). Nyepi and Galungan (Bali silence and ceremony days; avoid commercial use of sacred symbols and noisy campaigns). Waisak and Imlek (avoid stereotypes). 17 August Independence Day (the flag and national symbols are legally protected). Hari Batik 2 October (restricted or sacred motifs are sensitive). Payday window roughly the 25th to the 5th, and "tanggal tua" at month end is price-sensitive. Mega sale days (11.11, 12.12) are noisy. Election periods amplify political readings of any message.

## 10. Regional speech notes (for reaction prompts, light touch only)
Jabodetabek: Betawi-flavored slang, lu and gue, English code-mixing among the young urban crowd. Rest of Java: Javanese and Sundanese particles, more indirect criticism, family and local pride framing. Sumatra: blunt, direct speech in Medan and Palembang; Minang and Aceh audiences are especially attentive to religious propriety; Batak Christian communities in North Sumatra. Kalimantan: Banjar, Dayak, Malay and Javanese mixes; religion varies by province. Sulawesi: Makassar and Manado speech differ sharply; North Sulawesi is Christian-majority. Bali and Nusa Tenggara: Bali Hindu-majority and sensitive to sacred symbols and ceremony days, NTB mostly Muslim, NTT mostly Christian. Maluku and Papua: Ambon and Papua Malay vocabulary (beta, sa, ko, kitorang), Christian-majority, lowest connectivity, often feel overlooked by Jakarta-centric campaigns. Never caricature a region or ethnic group.

## 11. What to say on stage
"Population, internet access and platform use come from BPS, APJII and Dukcapil. The finer segment splits are calibrated estimates, so results are directional, not statistically validated."
