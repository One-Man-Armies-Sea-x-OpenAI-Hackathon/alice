# Bahasa style guide and few-shot examples

Included in the reaction prompt (and used by the persona and rewrite prompts for register). All examples are original, written for this project, not copied from real users. Use them to teach tone and calibration, never copy them verbatim into outputs.
## Style rules for `reason` and `sample_comment`
- Write like a real person typing on a phone, not translated English. Use natural particles: sih, dong, deh, kok, nih, banget, gak or nggak, kan, ya.
- Match the persona's language style: slang (young, TikTok and X), casual (most people), formal (older users, polite or official tone).
- Match the platform: TikTok is short and reactive with emoji; X is sarcastic and quick; Instagram is aesthetic and brand talk; Facebook is longer, polite, family and community framing; YouTube is longer opinions; WhatsApp is group-chat tone.
- Religious phrases must match the persona's religion: Muslim (alhamdulillah, insyaallah), Protestant or Catholic (Puji Tuhan, Tuhan memberkati), Hindu (Om Swastyastu), Buddhist (Sadhu). Never mix them, and do not add religious phrases to personas who would not use them.
- Regional flavor is a light touch: one word or particle at most. Never caricature a region or an ethnic group.
- Calibrate: most reactions are neutral or mildly positive or negative. Strong enthusiasm and strong backlash are both rare. Do not make every persona excited.
- `sample_comment` at most 120 characters; `reason` at most 200.

## Slang (18-34; TikTok, X, Instagram)
[tiktok, positive] buset kreatif banget, adminnya pasti anak tongkrongan 😭 fix checkout pas gajian
[tiktok, positive] lucu sih, udah gue kirim ke grup kosan wkwk
[tiktok, neutral] biasa aja sih menurut gue, tapi jingle-nya nyangkut parah
[tiktok, negative] iklan lagi iklan lagi, skip dulu deh
[tiktok, confused] ini produknya buat apa ya? gue scroll 3 kali tetep gak ngerti 😅
[tiktok, backlash] kok bercandain logat orang gitu sih, gak lucu sama sekali
[x, negative] brand ini lagi cari perhatian apa gimana ya, cringe banget copywriting-nya
[x, neutral] kampanyenya niat sih, cuma harganya masih bikin mikir dua kali
[x, positive] udah lama gak lihat iklan lokal sebagus ini, respect buat timnya
[x, backlash] bentar, ini beneran lolos tim legal? nggak sensitif banget deh ah
[instagram, positive] visualnya aesthetic parah, feed gue langsung auto upgrade 🤍
[instagram, neutral] bagus sih, tapi kayak pernah lihat konsep mirip di brand sebelah deh

## Casual (25-44; Instagram, Facebook, YouTube, WhatsApp)
[instagram, positive] Wah menarik nih, kemasannya rapi dan harganya masuk akal. Mau coba yang kecil dulu.
[instagram, neutral] Desainnya oke. Tapi bahasanya agak berlebihan menurutku, biasa aja udah cukup.
[instagram, backlash] Jujur kurang nyaman lihat iklan ini, terkesan meremehkan orang daerah.
[facebook, neutral] Iklannya bagus, cuma saya belum tahu produk ini bisa dibeli di mana ya?
[facebook, negative] Promonya kok ribet banget syaratnya, ujung-ujungnya ya nggak jadi beli.
[facebook, backlash] Kurang pas menurut saya nadanya, terkesan menyepelekan ibu rumah tangga. Tolong lebih hati-hati.
[youtube, positive] Videonya enak ditonton, pesannya jelas. Semoga kualitasnya sesuai iklannya.
[youtube, negative] Kok iklan sepanjang ini nggak bisa di-skip sih, bikin males sama mereknya.
[youtube, confused] Ini sebenarnya jualan apa ya? Ceritanya bagus tapi produknya nggak jelas.
[whatsapp, positive] Eh ini lucu banget, lihat deh. Nanti aku cek harganya ya.
[whatsapp, neutral] Kayaknya bagus, nanti kita bahas di arisan ya, ibu-ibu pasti suka.
[whatsapp, positive] Anak saya langsung minta dibelikan setelah lihat iklan ini 😅

## Formal (45+; Facebook, YouTube, WhatsApp)
[facebook, positive] Iklan yang sopan dan menyejukkan. Semoga produk lokal seperti ini terus maju.
[facebook, neutral] Cukup baik, namun mohon dijelaskan bahan dan sertifikasi halalnya agar konsumen yakin.
[facebook, negative] Harga terlalu tinggi untuk kalangan seperti kami. Mohon ada pilihan yang lebih terjangkau.
[facebook, backlash] Kata-kata dalam iklan ini terasa merendahkan orang tua. Mohon dikoreksi.
[facebook, confused] Mohon maaf, saya kurang paham maksud iklan ini. Apakah ada penjelasan lebih lengkap?
[youtube, positive] Terima kasih sudah menampilkan budaya daerah dengan hormat.
[youtube, positive] Pesannya baik dan mendidik. Cocok ditonton bersama keluarga.
[youtube, neutral] Tampilannya menarik, tetapi saya masih ragu dengan kualitasnya. Perlu bukti lebih.
[youtube, backlash] Tayangan seperti ini kurang pantas untuk jam keluarga. Mohon ditinjau kembali.
[whatsapp, positive] Alhamdulillah ada produk dalam negeri yang kualitasnya bagus. Barakallah. (only for a Muslim persona)
[whatsapp, negative] Bahasanya kurang pantas untuk ditonton anak-anak. Mohon diperhatikan.
[whatsapp, neutral] Informasi sudah diterima. Nanti saya diskusikan dulu dengan keluarga.

## How real pushback sounds (map to backlash_category)
- sara_religion: disrespect for religious belief or practice.
- sara_ethnicity: disrespect for a region, ethnic group, or its culture.
- local_norms: conflict with community norms, disrespect to elders or ceremonies.
- language_tone: too slangy for the audience, mocking tone, jokes about tradition.
- copycat_legal: looks copied, or names real brands.
- political: can be read as a jab at officials or parties.
- sara_class: mocks or excludes lower-income groups.
Polite older users tend to say "mohon dikoreksi" or "kurang pas". Younger users tend to say "cringe", "gak sensitif" or "gak lucu". Backlash is rarer than mild dislike.
