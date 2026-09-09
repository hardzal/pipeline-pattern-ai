import { Pipeline } from "@anvia/core/pipeline";
import type { OpenAICompletionModel } from "@anvia/openai";

import {
  createIdeaAgents,
  generateIdeaAgentOutput,
} from "../agents/idea.js";
import {
  createMockIdeaReview,
  createMockIdeaReviewBoardResult,
} from "../mocks/fixtures.js";
import {
  ideaPitchSchema,
  ideaReviewBoardResultSchema,
  type IdeaReview,
  type IdeaReviewBoardResult,
  type IdeaReviewBranchOutput,
  type IdeaReviewRole,
} from "../schemas/idea.js";

export type IdeaReviewer = (
  pitch: string,
) => IdeaReview | Promise<IdeaReview>;

type MockIdeaReviewBoardOptions = {
  mode: "mock";
  reviewers?: Partial<Record<IdeaReviewRole, IdeaReviewer>>;
};

type LiveIdeaReviewBoardOptions = {
  mode: "live";
  model: OpenAICompletionModel;
};

export type IdeaReviewBoardPipelineOptions =
  | MockIdeaReviewBoardOptions
  | LiveIdeaReviewBoardOptions;

function createBasePipeline(): Pipeline<string> {
  return new Pipeline<string>({
    id: "idea-review-board",
    name: "Idea Review Board",
    description: "Review one startup pitch from three independent perspectives.",
    inputSchema: ideaPitchSchema,
  });
}

function reviewerPrompt(role: IdeaReviewRole, pitch: string): string {
  return [
    `Review this startup pitch as the ${role.toUpperCase()} reviewer.`,
    "Return only the requested structured review.",
    `Pitch:\n${pitch}`,
  ].join("\n\n");
}

function createReviewerBranch(
  role: IdeaReviewRole,
  reviewer: IdeaReviewer,
): Pipeline<string, IdeaReviewBranchOutput> {
  return new Pipeline<string>({
    id: `idea-${role}-review`,
    name: `${role.toUpperCase()} Review`,
    description: `Independent ${role.toUpperCase()} perspective on the pitch.`,
    inputSchema: ideaPitchSchema,
  }).step<IdeaReviewBranchOutput>({
    id: `${role}-review`,
    name: `${role.toUpperCase()} Review`,
    description: `Analyze the pitch from the ${role.toUpperCase()} perspective.`,
    run: async ({ input }) => ({
      pitch: input,
      review: await reviewer(input),
    }),
  });
}

function createParallelReviewPipeline(
  reviewers: Record<IdeaReviewRole, IdeaReviewer>,
): Pipeline<string, {
  ceo: IdeaReviewBranchOutput;
  analyst: IdeaReviewBranchOutput;
  cto: IdeaReviewBranchOutput;
}> {
  return createBasePipeline().parallel({
    id: "parallel-reviews",
    name: "Parallel Reviews",
    description: "Run CEO, Analyst, and CTO reviews independently in parallel.",
    branches: {
      ceo: createReviewerBranch("ceo", reviewers.ceo),
      analyst: createReviewerBranch("analyst", reviewers.analyst),
      cto: createReviewerBranch("cto", reviewers.cto),
    },
  });
}

export function createIdeaReviewBoardPipeline(
  options: IdeaReviewBoardPipelineOptions,
): Pipeline<string, IdeaReviewBoardResult> {
  if (options.mode === "mock") {
    const reviewers: Record<IdeaReviewRole, IdeaReviewer> = {
      ceo:
        options.reviewers?.ceo ??
        ((pitch) => createMockIdeaReview("ceo", pitch)),
      analyst:
        options.reviewers?.analyst ??
        ((pitch) => createMockIdeaReview("analyst", pitch)),
      cto:
        options.reviewers?.cto ??
        ((pitch) => createMockIdeaReview("cto", pitch)),
    };
    const pipeline = createParallelReviewPipeline(reviewers);

    return pipeline.step<IdeaReviewBoardResult>({
      id: "merge",
      name: "Merge Reviews",
      description: "Combine all independent reviews into one recommendation.",
      run: ({ input }) =>
        ideaReviewBoardResultSchema.parse(
          createMockIdeaReviewBoardResult({
            pitch: input.ceo.pitch,
            reviews: {
              ceo: input.ceo.review,
              analyst: input.analyst.review,
              cto: input.cto.review,
            },
          }),
        ),
    });
  }

  const agents = createIdeaAgents(options.model);
  const reviewers: Record<IdeaReviewRole, IdeaReviewer> = {
    ceo: (pitch) =>
      generateIdeaAgentOutput(agents.ceo, reviewerPrompt("ceo", pitch)),
    analyst: (pitch) =>
      generateIdeaAgentOutput(agents.analyst, reviewerPrompt("analyst", pitch)),
    cto: (pitch) =>
      generateIdeaAgentOutput(agents.cto, reviewerPrompt("cto", pitch)),
  };
  const pipeline = createParallelReviewPipeline(reviewers);

  return pipeline.step<IdeaReviewBoardResult>({
    id: "merge",
    name: "Merge Reviews",
    description: "Use a merger agent to synthesize all independent reviews.",
    run: async ({ input }) => {
      const merged = await generateIdeaAgentOutput(
        agents.merge,
        [
          "Merge the independent startup pitch reviews into the complete result schema.",
          `Pitch:\n${input.ceo.pitch}`,
          `CEO review:\n${JSON.stringify(input.ceo.review, null, 2)}`,
          `Analyst review:\n${JSON.stringify(input.analyst.review, null, 2)}`,
          `CTO review:\n${JSON.stringify(input.cto.review, null, 2)}`,
        ].join("\n\n"),
      );

      return ideaReviewBoardResultSchema.parse(merged);
    },
  });
}
