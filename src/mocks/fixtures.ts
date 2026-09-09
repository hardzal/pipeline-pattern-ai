import type {
  ArticleBrief,
  ArticleCritique,
} from "../schemas/article.js";
import type {
  IdeaReview,
  IdeaReviewBoardResult,
  IdeaReviewRole,
  IdeaReviews,
} from "../schemas/idea.js";

export function createMockDraft(brief: ArticleBrief): string {
  return [
    `# ${brief.topic}`,
    "",
    `Artikel ini ditulis untuk ${brief.audience}.`,
    `Bahasa: ${brief.language}.`,
    "",
    `Tulisan ini memperkenalkan ${brief.topic.toLowerCase()} dengan penjelasan singkat dan mudah dipahami.`,
  ].join("\n");
}

export function createMockCritique({
  brief,
  draft,
}: {
  brief: ArticleBrief;
  draft: string;
}): ArticleCritique {
  return {
    summary: `Draft tentang ${brief.topic} sudah memiliki arah yang jelas, tetapi masih dapat dibuat lebih konkret.`,
    strengths: [
      "Topik utama terlihat sejak awal.",
      `Bahasa sudah diarahkan untuk ${brief.audience}.`,
    ],
    improvements: [
      "Tambahkan contoh konkret agar pembaca dapat menghubungkan konsep dengan praktik.",
      `Perjelas pembuka untuk menekankan manfaat ${brief.topic.toLowerCase()}.`,
      `Pertahankan konteks draft sepanjang revisi (${draft.length} karakter dianalisis).`,
    ],
  };
}

export function createMockRewrite({
  brief,
  draft,
  critique,
}: {
  brief: ArticleBrief;
  draft: string;
  critique: ArticleCritique;
}): string {
  return [
    `# ${brief.topic}`,
    "",
    `Untuk ${brief.audience}, ${brief.topic.toLowerCase()} membantu proses belajar menjadi lebih terarah.`,
    "",
    "## Mengapa hal ini penting?",
    `Konsep ini dapat dipahami melalui langkah sederhana dan contoh yang dekat dengan pekerjaan sehari-hari. ${draft.split("\\n").at(-1) ?? ""}`,
    "",
    "## Perbaikan diterapkan",
    critique.improvements.map((improvement) => `- ${improvement}`).join("\\n"),
    "",
    `Versi akhir menggunakan bahasa ${brief.language} dan mempertahankan fokus pada kebutuhan pembaca.`,
  ].join("\\n");
}

export function createMockIdeaReview(
  role: IdeaReviewRole,
  pitch: string,
): IdeaReview {
  const focusByRole: Record<IdeaReviewRole, string> = {
    ceo: "strategi dan potensi bisnis",
    analyst: "asumsi pasar, bukti, dan risiko",
    cto: "kelayakan teknis dan kompleksitas",
  };

  return {
    summary: `Mock ${role.toUpperCase()} review berfokus pada ${focusByRole[role]}.`,
    strengths: [`Pitch menjelaskan masalah yang ingin diselesaikan: ${pitch}`],
    concerns: [
      `Validasi ${focusByRole[role]} masih perlu dilakukan dengan eksperimen terukur.`,
    ],
  };
}

export function createMockIdeaReviewBoardResult({
  pitch,
  reviews,
}: {
  pitch: string;
  reviews: IdeaReviews;
}): IdeaReviewBoardResult {
  return {
    pitch,
    reviews,
    verdict:
      "Mock verdict: ide memiliki arah yang menarik, tetapi belum dapat dianggap tervalidasi tanpa eksperimen pengguna dan pasar.",
    nextSteps: [
      "Wawancarai calon pengguna dari segmen target.",
      "Uji prototipe kecil untuk mengukur masalah dan willingness to pay.",
      "Catat asumsi teknis serta risiko implementasi utama.",
    ],
  };
}
