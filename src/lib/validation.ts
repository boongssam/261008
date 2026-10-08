import { z } from "zod";

export const criterionSchema = z.object({
  id: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1, "기준 이름을 입력하세요.").max(100),
  description: z.string().trim().max(2000).default(""),
  maxScore: z.number().int().min(1, "배점은 1점 이상이어야 합니다.").max(100),
});

export const rubricInputSchema = z.object({
  title: z.string().trim().min(1, "평가 기준 제목을 입력하세요.").max(200),
  description: z.string().trim().max(4000).default(""),
  criteria: z
    .array(criterionSchema)
    .min(1, "평가 항목을 1개 이상 추가하세요.")
    .max(20, "평가 항목은 20개까지 가능합니다.")
    .refine((list) => new Set(list.map((c) => c.id)).size === list.length, "평가 항목 ID가 중복되었습니다."),
});

export type RubricInput = z.infer<typeof rubricInputSchema>;
