# Kombinasi Pattern dalam AI Workflow

Project ini memiliki beberapa study case yang masing-masing menonjolkan satu pattern utama:

- **Article Refiner**: sequential pipeline — Draft → Critique → Rewrite.
- **Idea Review Board**: parallel fan-out/fan-in — CEO, Analyst, CTO → Merge.
- **Ticket Triage**: structured extraction → deterministic routing.

Dalam aplikasi AI nyata, pattern-pattern tersebut biasanya tidak berdiri sendiri. Satu workflow umumnya berbentuk graph yang menggabungkan beberapa pattern sekaligus.

## Kombinasi yang paling umum

Kombinasi yang paling sering digunakan adalah:

```text
Validasi input
      ↓
Structured extraction
      ↓
Deterministic routing
      ↓
Parallel specialist agents
      ↓
Merge / synthesis
      ↓
Sequential refinement
      ↓
Validasi output
```

Contoh lengkap:

```text
Customer feedback
      ↓
Ekstrak topic, sentiment, urgency
      ↓
Tentukan kategori: bug / billing / feature request
      ↓
┌──────────────┬──────────────┬──────────────┐
│ UX reviewer  │ Tech reviewer│ Business     │
│              │              │ reviewer     │
└──────────────┴──────────────┴──────────────┘
                      ↓
                Gabungkan review
                      ↓
              Buat rekomendasi
                      ↓
              Kritik rekomendasi
                      ↓
              Revisi final
```

## 1. Sequential + Parallel

Ini adalah kombinasi yang paling umum.

Sequential berarti suatu tahap harus menunggu tahap sebelumnya:

```text
Draft → Critique → Rewrite
```

Parallel berarti beberapa pekerjaan independen dikerjakan bersamaan:

```text
Input
 ├─ CEO review
 ├─ Analyst review
 └─ CTO review
```

Kombinasinya dapat berbentuk:

```text
Input
  ↓
Buat draft awal
  ↓
┌─────────────┬─────────────┬─────────────┐
│ CEO review  │ CTO review  │ User review │
└─────────────┴─────────────┴─────────────┘
                  ↓
             Merge feedback
                  ↓
             Rewrite final
```

Gunakan kombinasi ini ketika:

- ada tahap yang bergantung pada hasil sebelumnya;
- di dalam suatu tahap terdapat beberapa pekerjaan independen;
- semua hasil branch perlu digabungkan sebelum proses dilanjutkan.

Contoh untuk Article Refiner:

```text
Brief
  ↓
Draft artikel
  ↓
┌──────────────────┬──────────────────┐
│ Content critique  │ SEO critique     │
└──────────────────┴──────────────────┘
           ↓
      Gabungkan kritik
           ↓
      Rewrite artikel
```

Keuntungan parallel adalah latency lebih rendah dibanding menjalankan semua reviewer satu per satu. Kekurangannya adalah penggunaan token dan concurrency meningkat, sehingga sistem harus memperhatikan rate limit provider.

Pada parallel pattern, fan-in atau merge harus memiliki bentuk yang jelas. Contohnya:

```json
{
  "ceo": {
    "summary": "...",
    "strengths": ["..."],
    "concerns": ["..."]
  },
  "cto": {
    "summary": "...",
    "strengths": ["..."],
    "concerns": ["..."]
  }
}
```

Jangan membiarkan setiap branch menghasilkan format bebas karena tahap merge akan menjadi tidak stabil.

## 2. Structured extraction + deterministic routing

Kombinasi ini sangat umum pada customer support, document processing, dan automation.

Alurnya:

```text
Teks bebas
   ↓
LLM mengekstrak data terstruktur
   ↓
Code memvalidasi schema
   ↓
Code menentukan route
```

Misalnya input:

```text
Saya tidak bisa login sejak pagi.
```

LLM menghasilkan:

```json
{
  "category": "authentication",
  "priority": "high",
  "customer": "Rina",
  "summary": "Tidak dapat login sejak pagi"
}
```

Routing kemudian dilakukan menggunakan code biasa:

```ts
if (ticket.priority === "high") {
  return "urgent-review";
}

if (ticket.category === "billing") {
  return "billing-queue";
}

return "standard-queue";
```

Routing sebaiknya tidak diserahkan seluruhnya kepada LLM jika aturan bisnisnya eksplisit. Dengan code, hasilnya lebih deterministik, mudah dites, dan mudah diaudit.

Dalam project ini, Ticket Triage sudah memakai gagasan tersebut: model menghasilkan data ticket, lalu TypeScript menentukan queue.

## 3. Router + specialist agents

Jika sistem memiliki banyak jenis input, tidak semua input perlu melewati agent yang sama.

```text
Input
  ↓
Classifier / router
  ├─ Technical issue → Technical agent
  ├─ Billing issue   → Billing agent
  └─ Sales question  → Sales agent
```

Router dapat menggunakan keyword sederhana, classifier, LLM dengan output schema, atau kombinasi aturan dan LLM.

Prinsip yang baik:

> Gunakan code untuk routing yang sederhana dan eksplisit. Gunakan LLM ketika bahasa input terlalu ambigu atau kompleks.

Router juga dapat diikuti parallel review:

```text
Kategori: startup pitch
        ↓
┌─────────────┬─────────────┬─────────────┐
│ CEO agent   │ CTO agent   │ Market agent│
└─────────────┴─────────────┴─────────────┘
```

## 4. Parallel reviewers + evaluator-optimizer loop

Setelah beberapa agent memberikan pendapat, evaluator dapat menilai kualitas hasil gabungannya.

```text
Input
  ↓
Parallel reviews
  ↓
Merge
  ↓
Evaluator
  ├─ Lulus → selesai
  └─ Gagal → optimizer memperbaiki
                    ↓
                 Evaluator lagi
```

Article Refiner saat ini menggunakan sequential refinement satu kali:

```text
Draft → Critique → Rewrite
```

Jika ditambah evaluator, workflow-nya menjadi:

```text
Draft
  ↓
Critique
  ↓
Rewrite
  ↓
Evaluate
  ├─ Score cukup tinggi → selesai
  └─ Score rendah → Critique lagi
```

Pattern ini berguna untuk penulisan artikel, pembuatan kode, analisis dokumen, proposal, dan output yang memiliki standar kualitas tertentu.

Loop harus memiliki batas:

```ts
maxIterations = 3;
timeoutMs = 180_000;
```

Tanpa batas, sistem dapat terus melakukan revisi, meningkatkan biaya, dan menyebabkan timeout.

## 5. Retrieval atau tools + sequential/parallel

Dalam aplikasi produksi, agent sering membutuhkan informasi dari luar prompt, seperti database, dokumentasi internal, API, search engine, atau file perusahaan.

Pola sequential yang umum:

```text
Pertanyaan user
      ↓
Retrieve relevant information
      ↓
Agent membuat jawaban
      ↓
Agent lain memeriksa jawaban
```

Pola parallel:

```text
Pertanyaan
    ↓
┌───────────────┬───────────────┬───────────────┐
│ Search docs   │ Query database│ Call external │
│               │               │ API           │
└───────────────┴───────────────┴───────────────┘
                    ↓
              Synthesis agent
```

Contoh untuk Article Refiner:

```text
Brief artikel
    ↓
┌─────────────────┬─────────────────┐
│ Cari dokumentasi │ Cari data resmi │
│ relevan          │ atau sumber     │
└─────────────────┴─────────────────┘
          ↓
      Draft artikel
          ↓
      Critique
          ↓
      Rewrite
```

Retrieval sebaiknya dilakukan sebelum generasi jika artikel atau jawaban harus berdasarkan fakta eksternal.

## 6. Human-in-the-loop + routing

Untuk proses yang memiliki risiko tinggi, output AI tidak langsung dijalankan.

```text
AI menghasilkan rekomendasi
          ↓
Human approval
    ├─ Approve → jalankan action
    └─ Reject  → revisi atau hentikan
```

Contoh:

```text
Ticket prioritas tinggi
      ↓
AI menganalisis ticket
      ↓
AI membuat rekomendasi refund
      ↓
Supervisor menyetujui
      ↓
Sistem memproses refund
```

Pattern ini umum untuk refund, penghapusan data, perubahan akses, pengiriman email penting, keputusan medis atau legal, deployment code, dan tindakan finansial.

## Contoh satu study case dengan banyak pattern

Misalnya kita membuat study case **Startup Pitch Advisor**.

```text
Startup pitch
      ↓
Validasi input
      ↓
Ekstrak structured facts
      ↓
Tentukan jenis startup
      ↓
Parallel review:
  ├─ CEO review
  ├─ CTO review
  ├─ Market review
  └─ Finance review
      ↓
Merge seluruh review
      ↓
Buat recommendation draft
      ↓
Critique recommendation
      ↓
Rewrite recommendation
      ↓
Validate output schema
      ↓
Human approval
```

Pattern yang digunakan:

| Tahap | Pattern |
|---|---|
| Validasi input | Schema validation |
| Ekstraksi fakta | Structured extraction |
| Penentuan kategori | Routing |
| CEO/CTO/Market/Finance | Parallel fan-out |
| Penggabungan hasil | Fan-in / merge |
| Pembuatan rekomendasi | Sequential generation |
| Kritik dan revisi | Evaluator-optimizer |
| Persetujuan akhir | Human-in-the-loop |

## Cara menentukan pattern

Gunakan pertanyaan berikut:

### Apakah tahap ini bergantung pada hasil tahap sebelumnya?

Jika iya, gunakan sequential.

Contoh: draft harus ada sebelum critique.

### Apakah beberapa pekerjaan dapat dilakukan tanpa saling menunggu?

Jika iya, gunakan parallel.

Contoh: CEO dan CTO dapat menilai pitch yang sama secara independen.

### Apakah hasilnya harus memiliki field tertentu?

Jika iya, gunakan structured output dan schema validation.

Contoh: ticket harus memiliki priority, category, dan summary.

### Apakah keputusan mengikuti aturan bisnis yang jelas?

Jika iya, gunakan deterministic routing.

Contoh: priority `high` → `urgent-review`.

### Apakah kualitas output sulit dipastikan dalam satu generasi?

Jika iya, gunakan evaluator-optimizer loop.

Contoh: generate → evaluate → revise.

### Apakah agent membutuhkan data dari luar prompt?

Jika iya, gunakan retrieval atau tools.

Contoh: cari dokumentasi → jawab berdasarkan sumber.

### Apakah output dapat menimbulkan dampak serius?

Jika iya, gunakan human-in-the-loop.

Contoh: AI merekomendasikan refund → manusia menyetujui.

## Risiko saat menggabungkan pattern

Menggabungkan banyak pattern tidak selalu membuat sistem lebih baik. Setiap pattern menambah kompleksitas.

Risiko yang umum:

- Parallel branch meningkatkan concurrency dan penggunaan API.
- Sequential stage meningkatkan total latency.
- Merge yang buruk dapat kehilangan informasi penting.
- Loop evaluasi dapat menyebabkan biaya tidak terkontrol.
- Prompt yang membawa seluruh hasil sebelumnya dapat menjadi sangat panjang.
- Retry pada seluruh workflow dapat mengulang pekerjaan yang sebenarnya sudah berhasil.
- Output bebas dari agent sulit divalidasi dan digabungkan.
- Timeout harus membatalkan proses aktif, bukan hanya berhenti menunggu hasilnya.

Aturan praktis yang baik:

```text
Validate early
→ route deterministically when possible
→ parallelize independent work
→ use structured outputs
→ merge explicitly
→ refine only when necessary
→ validate final output
→ require approval before risky side effects
```

## Kesimpulan

Kombinasi yang paling relevan untuk pengembangan project ini adalah:

```text
Schema validation
→ Sequential preparation
→ Parallel specialist agents
→ Merge
→ Sequential refinement
→ Final validation
```

Satu study case tidak perlu memilih hanya satu pattern. Kita dapat menggabungkan beberapa pattern selama setiap tahap memiliki alasan yang jelas serta kontrak input dan output yang terdefinisi.
