# 07. Risk and culture catalog

Used by the risk analyst prompt, the rewrite prompt and the tests. The catalog gives the analyst known patterns, but the analyst must also reason about **novel** problems. Every flag must be grounded in the simulated reactions (the objecting comments, the segment backlash rates) or in a clearly known pattern from this catalog, never invented.

## 1. Categories
sara_religion (religious symbols, practices, merit, attire), sara_ethnicity (ethnic or regional culture, accents, sacred or restricted cultural motifs, authenticity claims), sara_class (mocking or excluding income groups), local_norms (conservative norms, gender mixing, respect for elders and ceremonies, national symbols), language_tone (snide, mocking or over-casual tone for the audience; jokes about traditions), political (call-outs of officials, parties or elections), copycat_legal (naming brands, defamation or lookalike risk), other (authenticity or craft claims, symbol misuse not covered above).

## 2. Severity
- **high**: likely to trigger public backlash, takedown or legal or religious complaints for a large or vocal segment; recommend not launching as is.
- **medium**: likely to create noticeable pushback in specific segments; fix before launch or localize.
- **low**: minor tone friction; fix if easy.
Downgrade one level if the measured share of reached people who object is very low (under about 5 percent).

## 3. Rule catalog
Each row: what it is, category, default severity, most affected, why, fix direction, sample objecting comments (informal and formal Indonesian).

| Id | Pattern | Category | Severity | Most affected | Why it matters | Fix direction |
|---|---|---|---|---|---|---|
| santa_hijab | Hijab-wearing staff or Muslims shown wearing Santa hats or other faith's attire for promotion | sara_religion | high | Muslim audiences, especially 35+ and religious | Can read as imposing another faith's symbols, which has caused public controversy before | Remove religious attire, frame around family travel or shared celebration |
| flag_misuse | National flag printed on products, soles, or used jokingly | other | high | Everyone, especially 35+ and around 17 August | The flag and national symbols are legally protected; seen as disrespect | Keep colors as a palette only, remove the flag motif |
| mixed_housing | Mixed-gender living framed as "free" or no curfew | local_norms | high | Muslims, parents, outside Jabodetabek, tier 3 | Conflicts with norms of many families and communities | Add safety and separate-floor reassurance, remove "bebas" framing |
| sacred_merit | Religious reward (pahala, berkah) tied to buying or donating via a product | sara_religion | medium (high during Ramadan) | Observant Muslims | Reads as exploiting faith | Remove reward framing, focus on transparency and impact |
| political_callout | Naming officials or demanding promises from them | political | high | Polarizing: strong support and fierce pushback | Turns a cause into a political message, brand-safety risk | Remove named targets, invite participation |
| name_and_shame | Showing real brand logos on pollution or misconduct | copycat_legal | medium | Everyone, legal exposure | Defamation claims and takedowns, distracts from the cause | Blur logos, show categories, add a volunteer call to action |
| authenticity_claim | "Authentic" claim for a regional dish or craft in an instant or mass product | sara_ethnicity | medium | The home culture (for example Minang) | Seen as cheapening a ceremonial craft | Say "inspired by", drop traditional backdrops |
| restricted_motif | Restricted traditional motifs (for example batik Parang) on streetwear | sara_ethnicity | medium | Javanese audiences, older | Some motifs belonged to royal courts and carry meaning | Use freely usable motifs, add artisan story |
| competitor_jab | Mocking competitors or categories | language_tone | low | 35+ and brand-loyal | Snide tone | Lead with taste, price or benefit |
| ai_craft | "AI-made" claim for a craft or heritage product | other | low | Older audiences, craft communities | Seen as undermining artisans | Credit artisans, position tech as a helper |
| accent_joke | Mimicking regional accents or stereotypes | sara_ethnicity | medium | Outside Jabodetabek, spreads fast on X and TikTok | Read as mockery | Replace with inclusive storytelling |
| tradition_joke | Making light of traditional remedies or practices | language_tone | low | 45+ | Dismissive of trusted practices | Respect the practice, position the product as a complement |

**Sample objecting comments (informal / formal):**
santa_hijab: "kasihan karyawannya, masa atribut agama lain dipaksain buat iklan sih?" / "Atribut agama lain sebaiknya tidak dikenakan untuk kepentingan promosi. Mohon dikoreksi."
flag_misuse: "bendera di sol sepatu? kok gak menghargai lambang negara sih" / "Penggunaan bendera pada produk seperti ini tidak menghormati lambang negara."
mixed_housing: "bebas gimana maksudnya? orang tua mana yang berani nitipin anaknya" / "Kurang sesuai dengan norma kesopanan kita. Mohon ditinjau kembali."
sacred_merit: "pahala dipakai buat promo? gak sensitif banget deh ah" / "Menjadikan hal sakral sebagai bahan promosi kurang tepat. Mohon dikoreksi."
political_callout: "jangan bawa-bawa politik dong, bikin panas doang" / "Sebaiknya tidak menyinggung pihak tertentu. Fokus pada pesan utama."
name_and_shame: "ini nama merek beneran dipajang? awas kena somasi deh" / "Menyebut merek tertentu berpotensi masalah hukum. Mohon dikaji."
authenticity_claim: "rendang asli Padang dalam 3 menit? jangan asal klaim dong" / "Klaim asli Padang kurang tepat. Mohon lebih hati-hati terhadap budaya daerah."
restricted_motif: "motif Parang buat hoodie? itu kan ada maknanya, jangan sembarangan" / "Motif ini memiliki makna khusus. Mohon dihormati dalam penggunaannya."
competitor_jab: "nyindir banget, gak enak dibaca" / "Nadanya kurang pantas dan terkesan merendahkan."
ai_craft: "batik dibuat AI? kasihan pengrajinnya" / "Karya budaya sebaiknya dihargai pembuatnya, bukan digantikan mesin."
accent_joke: "bercandain logat orang gitu gak lucu sama sekali" / "Terkesan kurang menghormati budaya daerah. Mohon lebih hati-hati."
tradition_joke: "kerokan dibilang lucu? kita sih percaya" / "Pengobatan tradisional sebaiknya tidak dijadikan bahan bercanda."

## 4. Analyst behavior rules
- Reason about what the simulated people actually said and which segments objected, then match to a catalog pattern or name a novel one.
- Never stereotype a group in explanations. Describe norms and reactions neutrally ("many observant Muslim audiences may read this as...").
- No legal advice. For legal exposure say "may invite complaints" and recommend review by counsel.
- Stay neutral on politics and religion. Describe risk, do not take sides.
- At most six flags per run, ordered by severity. Merge duplicates. A flag names exactly one variant.
- Affected segments must come from the provided segment keys only.

## 5. Rewrite rules
- Keep the original intent and hook. Remove or change only the risky element.
- Keep the register and language of the original (Indonesian informal stays informal).
- Produce headline, copy and a visual description, plus a short list of what changed and what was kept.
- Self-check: re-read the rewrite against the catalog and list any new risks; the list should be empty. If not, revise once.
- Prefer a verified re-run: score the affected archetypes and a control sample of unaffected archetypes again with the rewrite, and pass the new reactions to the core.
