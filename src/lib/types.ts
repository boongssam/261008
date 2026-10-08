// 클라이언트와 서버가 함께 쓰는 데이터 타입

export type Criterion = {
  id: string;
  name: string;
  description: string;
  maxScore: number;
};

export type Rubric = {
  id: string;
  title: string;
  description: string;
  criteria: Criterion[];
  createdAt: string | null;
  updatedAt: string | null;
};

export type CriterionResult = {
  criterionId: string;
  name: string;
  maxScore: number;
  score: number;
  rationale: string;
  suggestions: string[];
};

export type EvaluationResult = {
  criteria: CriterionResult[];
  totalScore: number;
  maxTotalScore: number;
  overallSummary: string;
};

export type EvaluationStatus = "processing" | "done" | "error";

export type Evaluation = {
  id: string;
  rubricId: string;
  rubricTitle: string;
  rubricSnapshot: Criterion[];
  studentName: string;
  fileName: string;
  fileSize: number;
  status: EvaluationStatus;
  error: string | null;
  result: EvaluationResult | null;
  model: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB
