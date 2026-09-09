# AI Agent Pipeline Patterns — Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> Dokumen ini adalah roadmap garis besar, bukan instruksi untuk langsung mengimplementasikan seluruh project. Pembelajaran dilakukan bertahap, dimulai dari Article Refiner.

**Goal:** Membangun satu aplikasi CLI TypeScript dengan tiga workflow AI menggunakan Anvia SDK, serta demo visual melalui Anvia Studio.

**Architecture:** Definisi pipeline menjadi sumber logic bersama bagi CLI dan Studio. Anvia menangani komposisi workflow; aplikasi mengatur konfigurasi model, input/output, validasi, dan aturan bisnis. Tidak ada implementasi workflow terpisah khusus untuk UI.

**Tech Stack:** TypeScript, Node.js, pnpm, tsx, `@anvia/core`, `@anvia/studio`, Zod, Vitest, serta satu adapter provider LLM yang akan dipilih.

---

## 1. Ruang lingkup dan status dokumen

Sumber kebutuhan: [diagram studi kasus](details-submission.png) dan [README](../README.md).

Semua milestone, struktur file, command baru, kontrak output, serta contoh penggunaan di bawah adalah **target implementasi**, bukan fitur yang sudah tersedia. Saat rencana ini dibuat, README menjelaskan fondasi TypeScript dan tiga workflow yang masih direncanakan.

### Termasuk dalam MVP

- Article Refiner: sequential pipeline `Draft → Critique → Rewrite`.
- Idea Review Board: parallel review `Pitch → CEO / Analyst / CTO → Merge`.
- Ticket Triage: structured extraction dan routing `Ticket → Schema → Route`.
- CLI untuk menjalankan masing-masing workflow.
- Studio untuk menjalankan dan melihat workflow yang sama secara visual.
- Mode `mock` deterministik tanpa API key dan mode `live` dengan LLM asli.
- Sample input, validasi schema, error handling, dan automated tests.

### Tidak termasuk dalam MVP

- UI custom, database, autentikasi, deployment publik, dan multi-user.
- RAG, vector database, memory jangka panjang, atau tools eksternal.
- Pengiriman tiket sungguhan ke helpdesk maupun notifikasi otomatis.
- Loop revisi tanpa batas. Article Refiner hanya satu rangkaian tiga tahap; evaluator-optimizer loop adalah pengembangan opsional setelah MVP.
- Dukungan semua provider sekaligus. Mulai dengan satu provider yang dipilih pengguna.

## 2. Ekspektasi hasil akhir

Project dianggap berhasil apabila pengguna dapat:

1. Menjalankan setiap studi kasus lewat terminal dengan input sendiri atau sample file.
2. Melihat hasil akhir yang jelas, bukan hanya respons teks tanpa konteks.
3. Membuka Studio dan menjelaskan urutan langkah serta perpindahan data dari graph dan hasil eksekusinya.
4. Menjalankan demo mock tanpa biaya API, lalu beralih ke mode live melalui konfigurasi.
5. Menjalankan test tanpa internet atau kredensial provider.
6. Memahami perbedaan sequential composition, parallel fan-out/fan-in, dan schema-gated routing.

Mode mock harus diberi label yang jelas. Hasil mock adalah simulasi pengujian workflow, bukan penilaian AI atau bukti kualitas model.

### Article Refiner

- **Input MVP:** brief/topik artikel beserta target pembaca dan bahasa.
- **Draft:** menghasilkan draft berdasarkan brief.
- **Critique:** menilai kejelasan, struktur, dan relevansi; menghasilkan feedback yang actionable.
- **Rewrite:** menggunakan draft dan critique untuk menghasilkan artikel final.
- **Output target:** `{ brief, draft, critique, finalArticle }`.
- Critique harus mempertahankan draft dalam konteks agar tahap rewrite tidak hanya menerima feedback.
- Kualitas dinilai dengan membandingkan draft dan rewrite; model tidak dianggap mampu memverifikasi fakta tanpa sumber. Prompt melarang penambahan klaim yang tidak didukung input.

### Idea Review Board

- **Input MVP:** satu startup pitch dalam teks.
- **CEO:** fokus strategi dan potensi bisnis.
- **Analyst:** fokus asumsi pasar, bukti, dan risiko.
- **CTO:** fokus kelayakan teknis dan kompleksitas.
- Semua reviewer menerima pitch yang sama secara paralel, bukan hasil reviewer lain.
- **Merge:** menyatukan temuan, termasuk perbedaan pendapat, ke dalam rekomendasi akhir.
- **Output target:** `{ pitch, reviews: { ceo, analyst, cto }, verdict, nextSteps }`.
- Rekomendasi adalah analisis berbasis input, bukan riset pasar terverifikasi.

### Ticket Triage

- **Input MVP:** teks tiket dukungan.
- **Extract:** menghasilkan data dengan schema, misalnya `{ customer, summary, priority }`; customer dapat `null` jika tidak disebutkan.
- **Priority target:** `low | normal | high`.
- **Route:** fungsi TypeScript deterministik, bukan keputusan bebas LLM.
- **Mapping awal:** `high → urgent-review`, `normal → standard-queue`, `low → low-priority-queue`.
- **Output target:** `{ ticket, route, reason }`.
- Data yang gagal validasi tidak boleh masuk router. Tiket ambigu tidak boleh mendapat data pelanggan atau prioritas yang dikarang tanpa aturan; kebijakan fallback dijelaskan di prompt dan test.
- Routing hanya menghasilkan keputusan lokal; tidak mengirim tiket ke layanan eksternal.

## 3. Arsitektur dan struktur target

```text
                    Shared pipeline factories
                    /                      \
              CLI runner               Anvia Studio
                    \                      /
                     Configured dependencies
                     /                    \
                 Mock steps          Live Anvia agents/model
```

```text
src/
  index.ts                         # Entry point CLI
  studio.ts                        # Entry point Studio
  config.ts                        # Mode, model, environment validation
  workflows/
    registry.ts                    # Membuat pipeline berdasarkan mode
    article-refiner.ts
    idea-review-board.ts
    ticket-triage.ts
  agents/
    article.ts                     # Draft, critique, rewrite
    idea.ts                        # CEO, analyst, CTO, merge
  schemas/
    article.ts
    idea.ts
    ticket.ts
  mocks/
    fixtures.ts                    # Respons deterministik berlabel mock
  cli/
    args.ts
    input.ts
    output.ts
examples/
  article-brief.json
  startup-pitch.txt
  support-ticket.txt
tests/
  article-refiner.test.ts
  idea-review-board.test.ts
  ticket-triage.test.ts
  cli.test.ts
docs/
  project-plan.md
  details-submission.png
.env.example
```

Struktur ini target, bukan kewajiban membuat semua file di awal. Jangan membangun framework orchestration sendiri di atas Anvia. CLI dan Studio mengimpor factory/registry yang sama; proses terpisah membuat instance masing-masing dari definisi yang sama.

## 4. Milestone pengerjaan

**Legenda progres:** `[x]` selesai dan diverifikasi, `[~]` implementasi tersedia tetapi masih ada verifikasi yang tertunda, `[ ]` belum selesai.

### Milestone 1 — Fondasi project

**Status:** [x] Selesai — commit `fa136e1`.

**Tujuan belajar:** memahami entry point, konfigurasi, schema, dan dependency boundary.

Pekerjaan:

- Periksa versi Node dan kompatibilitas versi Anvia sebelum instalasi; README saat ini mencantumkan minimum Node 20.12 untuk Studio.
- Tambahkan Anvia, Studio, Zod, dan Vitest; pilih satu adapter saat mulai mode live.
- Rapikan `tsconfig.json` agar build masuk `dist/`, bukan menghasilkan JavaScript di `src/`.
- Tambahkan script `typecheck`, `test`, dan `studio`; pastikan script lint/format memiliki dependency yang sesuai atau jangan dokumentasikan sebagai siap pakai.
- Definisikan mode `mock | live`, konfigurasi model, `.env.example`, serta ignore untuk `.env` dan output lokal.
- Buat CLI minimal dengan bantuan penggunaan dan validasi command.

**Area file:** `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, `src/config.ts`, `src/index.ts`, `src/cli/`, `tests/cli.test.ts`.

**Selesai jika:** CLI help berjalan, mode mock tidak membutuhkan key, konfigurasi live yang belum lengkap memberi error jelas, typecheck dan test fondasi lulus.

### Milestone 2 — Article Refiner mock

**Status:** [x] Selesai — commit `7206231`.

**Tujuan belajar:** sequential pipeline dan kontrak antar-stage.

Pekerjaan:

- Definisikan schema brief, critique, dan hasil akhir.
- Tulis test urutan `draft → critique → rewrite` sebelum implementasi.
- Implementasikan tiga `.step()` dengan fungsi deterministik.
- Pastikan draft tetap tersedia bersama critique pada tahap rewrite.
- Tambahkan sample brief dan rendering CLI.

**Area file:** `src/schemas/article.ts`, `src/workflows/article-refiner.ts`, `src/mocks/fixtures.ts`, `examples/article-brief.json`, `tests/article-refiner.test.ts`.

**Selesai jika:** sample menghasilkan draft, critique, dan artikel final; test membuktikan rewrite menerima draft dan feedback yang benar, serta input kosong ditolak.

### Milestone 3 — Article Refiner live dan Studio

**Status:** [~] Implementasi live, shared registry, dan Studio selesai — commit `0038597`. Live network smoke test dengan credential nyata belum dijalankan.

**Tujuan belajar:** integrasi model, prompt per peran, dan inspeksi visual.

Pekerjaan:

- Pilih provider dan model bersama pengguna; baca kredensial dari konfigurasi, bukan source code.
- Ganti dependency mock dengan agent/model asli tanpa menggandakan workflow.
- Validasi critique terstruktur dan tangani error provider.
- Daftarkan Article Refiner pada Studio melalui registry bersama.
- Beri pipeline dan stage `id`, `name`, dan `description` yang mudah dibaca.
- Jalankan satu smoke test live dan inspeksi graph serta output stage lewat browser.

**Area file:** `src/config.ts`, `src/agents/article.ts`, `src/workflows/registry.ts`, `src/studio.ts`, workflow dan test Article Refiner.

**Selesai jika:** CLI dan Studio mengeksekusi definisi pipeline yang sama; satu demo live berhasil dengan hasil asli. Bila kredensial belum tersedia, laporkan live belum terverifikasi—jangan menggantinya dengan output mock.

### Milestone 4 — Idea Review Board

**Status:** [x] Selesai — commit `17f937b`.

**Tujuan belajar:** parallel fan-out/fan-in dan penggabungan perspektif.

Pekerjaan:

- Definisikan kontrak output reviewer dan verdict.
- Buat tiga named branches dengan `.parallel()`, lalu merge dengan `.step()`.
- Mulai dari mock, test, lalu hubungkan reviewer dan merger live.
- Gunakan kebijakan MVP: kegagalan satu reviewer membuat run gagal; jangan menampilkan verdict lengkap dari review yang hilang.
- Tambahkan ke registry CLI dan Studio beserta sample pitch.

**Area file:** `src/schemas/idea.ts`, `src/agents/idea.ts`, `src/workflows/idea-review-board.ts`, `examples/startup-pitch.txt`, `tests/idea-review-board.test.ts`.

**Selesai jika:** ketiga reviewer menerima input sama, berjalan paralel, merge menerima semua review, dan kegagalan cabang tertangani. Test concurrency menggunakan kontrol promise/barrier, bukan batas waktu rapuh. Studio menunjukkan cabang dan titik merge.

### Milestone 5 — Ticket Triage

**Status:** [x] Selesai — commit `c7d356f`.

**Tujuan belajar:** structured extraction, validation gate, dan routing deterministik.

Pekerjaan:

- Definisikan schema tiket serta aturan prioritas dan fallback untuk input ambigu.
- Implementasikan `.extract()` dengan output schema, diikuti `.step()` routing.
- Untuk mock, simulasikan extraction menggunakan fixture lalu validasi dengan schema yang sama; tandai bahwa jalur mock tidak memanggil extractor LLM.
- Tulis test untuk setiap prioritas, field hilang, enum invalid, dan extraction gagal.
- Tambahkan sample tiket serta registrasi CLI dan Studio.

**Area file:** `src/schemas/ticket.ts`, `src/workflows/ticket-triage.ts`, `examples/support-ticket.txt`, `tests/ticket-triage.test.ts`.

**Selesai jika:** router hanya menerima data tervalidasi, setiap prioritas menghasilkan antrean yang ditetapkan, dan input invalid tidak diteruskan. Tidak ada pengiriman tiket eksternal.

### Milestone 6 — Finalisasi dan demo end-to-end

**Status:** [ ] Belum dikerjakan.

**Tujuan belajar:** reliability, pengalaman pengguna, dan evaluasi.

Pekerjaan:

- Konsistenkan CLI help, error, JSON output, dan mode label untuk semua workflow.
- Terapkan timeout dan retry terbatas untuk error sementara; hindari retry bertumpuk antara SDK dan aplikasi.
- Pisahkan hasil di stdout dari log progres/error di stderr agar output JSON tetap valid.
- Tambahkan penyimpanan hasil via `--output`; tolak overwrite tanpa persetujuan eksplisit.
- Pastikan secret tidak masuk log atau Git, dan Studio hanya digunakan lokal, bukan dipublikasikan tanpa kontrol akses.
- Lengkapi README dengan command yang benar-benar sudah diuji.
- Jalankan quality checks, mock demo ketiga workflow, live smoke tests, dan demo browser Studio.

**Selesai jika:** seluruh checklist akhir terpenuhi dan batasan yang masih ada terdokumentasi.

## 5. Pola belajar dan pengujian

Untuk setiap milestone: pahami input/output → tulis test yang gagal → implementasi minimum → jalankan test → review desain → demo hasil → baru lanjut.

- **Unit tests:** schema, routing, context passing, dan perilaku error; tanpa LLM asli.
- **Pipeline integration tests:** komposisi Anvia dengan dependency deterministik, termasuk branch failure.
- **CLI tests:** file tidak ditemukan, input kosong, command salah, output JSON, exit code.
- **Live smoke tests:** opt-in karena membutuhkan network, API key, dan biaya; tidak menuntut output teks identik.
- **Evaluasi kualitas:** beberapa brief/pitch/tiket representatif; nilai relevansi, kepatuhan format, penggunaan feedback, dan kesesuaian routing. Test lulus tidak menjamin kebenaran isi model.
- **Studio verification:** periksa visual graph, jalankan input, inspect hasil dan error; server menyala saja belum cukup.

## 6. Target penggunaan akhir

> Command berikut merupakan kontrak CLI yang direncanakan. Belum dianggap tersedia sampai milestone terkait selesai dan diverifikasi. Semua contoh output yang disebut di dokumen ini adalah ekspektasi, bukan hasil eksekusi aktual.

### Setup

```bash
pnpm install
pnpm dev --help
```

Untuk mode live, salin `.env.example` ke `.env`, isi provider/model/key sesuai adapter yang dipilih, dan pastikan aplikasi memuat file tersebut. Nama variabel kredensial final mengikuti provider; tidak diasumsikan OpenAI sebelum dipilih.

### Article Refiner

Isi target `examples/article-brief.json`:

```json
{
  "topic": "Manfaat automated testing untuk developer pemula",
  "audience": "Developer yang baru belajar backend",
  "language": "id"
}
```

```bash
pnpm dev article-refiner --file examples/article-brief.json --mode mock
pnpm dev article-refiner --file examples/article-brief.json --mode live
```

Ekspektasi: CLI menampilkan mode, progres tiga stage, draft, critique, dan artikel final. Artikel final bukan sekadar draft yang diberi label baru; pada live, revisi harus menanggapi feedback.

### Idea Review Board

```bash
pnpm dev idea-review-board --file examples/startup-pitch.txt --mode mock
pnpm dev idea-review-board --file examples/startup-pitch.txt --mode live
```

Ekspektasi: review CEO, Analyst, dan CTO dapat dibaca terpisah, diikuti verdict gabungan serta langkah validasi ide selanjutnya.

### Ticket Triage

```bash
pnpm dev ticket-triage --file examples/support-ticket.txt --mode mock
pnpm dev ticket-triage --file examples/support-ticket.txt --mode live --json
```

Ekspektasi: ringkasan tiket, prioritas tervalidasi, route, dan alasan. Dengan `--json`, stdout hanya berisi JSON hasil akhir.

### Menyimpan hasil

```bash
pnpm dev article-refiner --file examples/article-brief.json --mode mock --json --output outputs/article-result.json
```

Ekspektasi: hasil terstruktur tersimpan lokal; file yang sudah ada tidak ditimpa diam-diam.

### Demo Studio

```bash
pnpm studio --mode mock
pnpm studio --mode live
```

Target alamat lokal: `http://localhost:4021`, dengan bind hanya pada loopback. Opsi bind mengikuti API versi Studio yang dipasang dan perlu diverifikasi saat implementasi.

1. Pilih workflow dari daftar pipeline.
2. Masukkan brief JSON untuk Article Refiner atau teks untuk dua workflow lainnya, sesuai input schema.
3. Jalankan pipeline.
4. Tunjukkan urutan tiga stage pada Article Refiner.
5. Tunjukkan tiga cabang dan merge pada Idea Review Board.
6. Tunjukkan extraction tervalidasi dan keputusan route pada Ticket Triage.
7. Periksa output tiap stage dan contoh kegagalan input.

Mock/live dipilih saat startup. Jangan berasumsi mengubah mode CLI otomatis mengubah proses Studio yang sudah berjalan.

### Quality checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

Ekspektasi: typecheck lulus, tests deterministik lulus tanpa API key, build menghasilkan artifact di `dist/` tanpa mencemari `src/`.

## 7. Checklist penerimaan akhir

- [x] Tiga workflow sesuai diagram, bukan tiga prompt tunggal tanpa pipeline.
- [x] Article Refiner mempertahankan draft dan feedback sampai rewrite.
- [x] Idea Review Board memiliki tiga cabang paralel dan merge yang lengkap.
- [x] Ticket Triage memvalidasi extraction sebelum routing deterministik.
- [~] Semua workflow dapat dijalankan dari CLI dan sudah terdaftar di Studio; inspeksi visual graph dan demo browser lengkap masih pending.
- [x] Mode mock jelas dibedakan dari hasil live.
- [ ] Satu provider live terkonfigurasi dan ketiga workflow telah diuji dengan panggilan asli.
- [~] Error input, schema, dan branch sudah diuji; error provider melalui panggilan live nyata belum diverifikasi.
- [x] Test otomatis lulus tanpa kredensial atau network.
- [~] Sample input dan command workflow sudah tersedia dan diuji; finalisasi dokumentasi setup/batasan masih termasuk Milestone 6.
- [x] Secret tidak masuk Git/log, dan Studio digunakan lokal.
- [ ] Pengguna dapat menjelaskan alasan memilih masing-masing pattern serta cara data berpindah antar-stage.

## 8. Keputusan yang diselesaikan saat implementasi

- Provider/model live dan batas biaya demo.
- Versi Anvia serta kompatibilitas Node yang dipin saat instalasi.
- Detail rubric critique, kontrak verdict, dan kebijakan extraction ambigu.
- Bentuk error/timeout SDK dan kemampuan inspeksi Studio pada versi terpasang.

Keputusan tersebut tidak menghalangi milestone mock, tetapi harus ditetapkan sebelum demo live dinyatakan selesai.

## Referensi

- [Anvia documentation](https://docs.anvia.dev/)
- [Anvia pipeline cookbook](https://github.com/anvia-hq/anvia/tree/main/cookbook/05_pipelines)
- [Anvia Studio pipeline inspector](https://github.com/anvia-hq/anvia/blob/main/cookbook/09_studio/07-pipeline-inspector.ts)
- [Anvia Studio multiple pipelines](https://github.com/anvia-hq/anvia/blob/main/cookbook/09_studio/08-multiple-pipelines.ts)
