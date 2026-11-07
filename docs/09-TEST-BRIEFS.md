# 09. Demo and test briefs

All brands, copy and scenarios are **fictional**, written for testing. They are not real ads and not performance ground truth. Use them to check that variants diverge across segments and that risk flags fire where expected. Copy is in Indonesian. Visual descriptions are in English because they are instructions to the model.

## A. The four demo briefs (cards on the empty state)

### A1. Langkah Run, 17 August (hero demo, compare, 3 variants)
Brief: "Brand: Langkah Run. Local running shoes for Independence Day (17 Agustus). Channels: Instagram and TikTok nationwide, plus outdoor at Gelora Bung Karno, Jakarta. Compare the three directions below."
- **A. Freedom theme.** Headline: Merdeka itu lari ke arah yang kamu mau. Copy: Langkah Run, dibuat di Bandung untuk semua pelari. Visual: runner at sunrise, red and white accents in clothing.
- **B. Local pride.** Headline: Dibuat di Bandung, buat 270 juta langkah. Copy: Karya lokal untuk langkah Indonesia. Visual: factory workers smiling, finished shoes.
- **C. Flag print.** Headline: Injak garis finis, pakai Merah Putih. Copy: Edisi 17 Agustus dengan motif bendera di sol dan sisi sepatu. Visual: close-up of the national flag printed across the shoe sole.
Expected: C triggers a high-severity flag (flag misuse) and is never recommended, even if it has the highest score. A and B stay safe and are close; B should do better with older audiences and outside Jabodetabek, A with young urban TikTok and Instagram users. **Tested on 6 Nov: one plain ChatGPT call with the baseline prompt already picked A, flagged C (citing the flag law), and named the young-for-A, older-for-B split.** So none of those is Alice's edge on this brief, and the demo must never claim gut feeling or a single call would miss them. Lead with what the single call could not give: which of the seven regions flip and by how many points, how confident the result is (or that it is too close to call), whether C's backlash spreads it through anger, and a fix re-tested on the same audience.

### A2. Kopi Senja launch (compare, clarifying questions)
Brief: "Brand: Kopi Senja. Ready-to-drink coffee launching on TikTok, Rp12,000 per can, aimed at young office workers. Which of these directions lands best?" Missing: location and season, so Alice asks two questions.
- **A. Playful slang.** Headline: Gajian? Kopi dulu, baru mikir cicilan. Copy: Kopi Senja, manisnya pas, harganya aman. Gajian harus dirayain. Visual: young office worker laughing at a phone, can of coffee, bright yellow background.
- **B. Warm family.** Headline: Sore di teras, ngobrol sama keluarga. Copy: Kopi Senja menemani obrolan hangat di rumah. Visual: family on a porch at sunset, soft warm tones.
- **C. Comparative jab.** Headline: Lebih enak dari kopi kekinian yang itu-itu aja. Copy: Udah capek sama kopi mahal yang rasanya sama? Coba Kopi Senja. Visual: two cups side by side, one crossed out.
Expected: A leads with 18-34 on TikTok; B leads with 35+ and Facebook; C gets a low-severity tone flag (competitor jab) mostly from 35+.

### A3. Ciliwung banner at Bundaran HI (single, activist, clarifying question)
Brief: "Brand: Gerakan Ciliwung Bersih. Surprise activist banner at Bundaran HI, Jakarta, put up before dawn with no prior announcement. Headline: Ciliwung bukan tempat sampah. Visual: a huge banner over the central fountain. Channels: outdoor and Instagram. Predict how the public will react." Missing: season, so one question.
Expected: strong attention and sharing in Jabodetabek and among 18-34, mostly positive sentiment, small backlash; segments outside Jabodetabek reached later.

### A4. Tiket Ceria year-end promo (compare, religion risk)
Brief: "Brand: Tiket Ceria. Year-end travel promo for Christmas and New Year on Instagram and Facebook, nationwide online. Compare these three."
- **A. Homecoming.** Headline: Pulang kampung Natal, tiket aman. Copy: Pesan lebih awal, harga tetap ramah. Visual: family arriving at a village home at night with warm lights.
- **B. Holiday deal.** Headline: Liburan akhir tahun ke Bali, diskon 30%. Copy: Hotel dan tiket pesawat dalam satu paket. Visual: beach in Bali at sunset.
- **C. Staff in Santa hats.** Headline: Semua tim kami ikut meriahkan Natal. Copy: Seluruh karyawan, termasuk yang berhijab, memakai topi Santa untuk promo akhir tahun. Visual: entire staff photo in Santa hats, including hijab-wearing staff.
Expected: C triggers a high-severity religion flag, strongest among Muslim audiences aged 35+. A should win overall.

## B. Six more briefs for QA (compare unless noted)
1. **Dompetku (e-wallet, Ramadan week 2; TikTok, Instagram, WhatsApp).** A: "Cashback buka puasa, checkout sebelum bedug!" B: "Berbagi itu candu: donasi 1 klik, gandakan pahala." (religious merit framing). C: "War takjil? Menang pakai Dompetku." (meme humor). Expected: B gets a religion flag (higher during Ramadan); C does well with 18-34 on TikTok and X.
2. **Sedap Kilat (instant noodles, school holidays; TikTok, Facebook).** A: "Level pedas 1 sampai 10, berani sampai berapa?" B: "Teman begadang anak kos." C: "Rasa rendang asli Padang dalam 3 menit." Expected: C gets an authenticity flag, strongest in Sumatra; A leads with 18-24.
3. **Sehatku (telemedicine; YouTube, Facebook, WhatsApp; Java outside Jabodetabek).** A: "Dokter 24 jam di genggaman." B: "Jangan tunggu sakit parah." (fear appeal). C: "Kerokan dulu, dokter belakangan." Expected: A wins with 45+; B high attention but lower sentiment; C a low tone flag with 45+.
4. **Ruang Kos (co-living; Instagram, TikTok; Jabodetabek; new academic year).** A: "Kos rasa rumah, tanpa drama ibu kos." B: "Aman buat anak rantau, orang tua tenang." C: "Cowok-cewek satu lantai, bebas." Expected: C gets a high norms flag, strongest outside Jabodetabek and among Muslims 35+; B wins with 35+.
5. **Batik Nusa (fashion; Instagram, TikTok; Hari Batik).** A: "Batik itu keren, bukan cuma seragam kantor." B: "Motif Parang versi streetwear." C: "Batik buatan AI, motif baru setiap hari." Expected: B gets a culture flag (restricted motif), strongest in Java outside Jabodetabek; C a low authenticity flag.
6. **Suara Hutan (activist petition; TikTok, Instagram, X; nationwide).** A: "Mereka tidak bisa bersuara. Kamu bisa." B: "Hutan sebesar lapangan bola hilang setiap menit." (needs a verified figure). C: "Bapak-bapak pejabat, mana janjimu?" Expected: C gets a high political flag; A wins on TikTok.
Write full visual and copy lines for these at build time in the same style as section A.

## C. Incomplete briefs for the clarifier
1. Kopi Senja, two variants (Slang and Warm), no channel, no location, no season. Expect three questions.
2. Gerakan Ciliwung Bersih, outdoor only, no location, no season. Expect two questions.
3. Langkah Run, Instagram and Jakarta given, no season. Expect one question.

## D. Acceptance expectations summary
- Variants differ across segments (not all the same winner everywhere).
- Known risky variants produce flags with the expected category and severity band, and the right segments; safe variants do not.
- Clarifier asks only for what is missing, never more than three.
- Fix re-runs reduce backlash for the flagged variant and do not create new flags. The score may go up or down, and the UI shows which.
- A high-flag variant is never recommended.
- A variant compared with itself lands under the noise floor and reads as a tie.

## E. Held-out checks
The risk patterns in the demo briefs must not appear in `prompts/runtime/fewshot-bahasa.md`, or the model is shown the answer. Keep it that way when editing the examples.

Rehearse at least twice with a brief nobody wrote in advance. Ask a teammate who did not write the prompts to invent a campaign, then run it at Quick depth. This practices the live offer to judges in `11-PITCH.md`.
