import { STATS_RECENCY_HALF_LIFE_DAYS } from "../constants/frequency-stats";
import { FINGERPRINT_MODEL } from "../constants/similarity";
import type { SubjectRef } from "../repositories/subject.repository";
import { providerFor, type EmbeddingProvider } from "./embedding";
import { frequencyStatsService } from "./frequency-stats.service";
import { questionEmbeddingService, type EmbedSummary } from "./question-embedding.service";
import { groupSimilarQuestions, type GroupSummary } from "./question-group.service";

// Chuỗi việc của một môn: tạo vector còn thiếu -> dựng lại nhóm -> tính lại thống kê.
// Dùng chung cho npm run groups:build và việc chạy ban đêm (services/similarity-job.service).

export interface PipelineOptions {
  modelName?: string;
  provider?: EmbeddingProvider; // mặc định: providerFor(modelName)
  threshold?: number; // mặc định theo model
  sameChapterOnly?: boolean;
  allowSameExam?: boolean;
  dryRun?: boolean;
  embed?: boolean; // mặc định: có (trừ khi dryRun)
  stats?: boolean; // mặc định: có (không bao giờ khi dryRun)
  batchSize?: number;
  halfLifeDays?: number;
}

export interface PipelineResult {
  embed: EmbedSummary | null; // null = bỏ bước tạo vector
  group: GroupSummary;
  stats: { chapters: number; groups: number } | null; // null = không tính lại thống kê
}

export async function runSimilarityPipeline(subject: SubjectRef, opts: PipelineOptions = {}): Promise<PipelineResult> {
  const modelName = opts.modelName ?? FINGERPRINT_MODEL;
  const dryRun = opts.dryRun ?? false;
  const doEmbed = opts.embed ?? !dryRun;
  const doStats = !dryRun && (opts.stats ?? true);

  const embed = doEmbed ? await questionEmbeddingService.embedMissing(subject, opts.provider ?? providerFor(modelName), { batchSize: opts.batchSize }) : null;
  const group = await groupSimilarQuestions(subject.id, {
    modelName,
    threshold: opts.threshold,
    sameChapterOnly: opts.sameChapterOnly ?? true,
    allowSameExam: opts.allowSameExam ?? false,
    dryRun,
  });
  // Nhóm vừa ghi lại có id mới và mất thống kê cũ: tính lại ngay để danh sách câu hay ra không bị trống
  const stats = doStats ? await frequencyStatsService.refresh(subject, { halfLifeDays: opts.halfLifeDays ?? STATS_RECENCY_HALF_LIFE_DAYS }) : null;
  return { embed, group, stats };
}
