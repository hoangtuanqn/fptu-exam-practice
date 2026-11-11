import { storageDir } from "../configs/env";
import { FINGERPRINT_MODEL, SIMILARITY_JOB_MAX_HASHES, SIMILARITY_JOB_NOTICE_MAX_CODES } from "../constants/similarity";
import { similarityJobRepository } from "../repositories/similarity-job.repository";
import { subjectRepository, type SubjectRef } from "../repositories/subject.repository";
import { hashImagesInBatches } from "../utils/question-hash";
import {
  EMPTY_EXAM_AGGREGATE,
  examSignature,
  hashCursorFor,
  needsWork,
  splitHashBudget,
  type SubjectSnapshot,
  type SubjectWork,
} from "../utils/similarity-job";
import { adminNoticeService } from "./admin-notice.service";
import { runSimilarityPipeline } from "./similarity-pipeline.service";

// Việc chạy ban đêm: giữ nhóm câu giống nhau và thống kê tần suất luôn mới mà không cần chạy lệnh tay.
// Mỗi môn cần làm: tính dấu vân tay còn thiếu (có trần mỗi đêm) -> tạo vector -> dựng lại nhóm -> tính lại thống kê, rồi ghi mốc.
// Chạy lại bao nhiêu lần cũng được: môn không đổi gì thì bỏ qua; một môn lỗi không dừng các môn khác (mốc của môn đó không ghi nên đêm sau thử lại).

export interface SubjectEntry extends SubjectSnapshot {
  subject: SubjectRef;
}

export interface HashOutcome {
  attempted: number; // số ảnh đã thử
  hashed: number; // số ảnh tính được
  lastId: number | null; // id câu cuối cùng đã thử (con trỏ cho đêm sau)
}

export interface SimilarityJobDeps {
  loadSubjects(): Promise<SubjectEntry[]>;
  countWork(subject: SubjectRef, hashAfterId: number): Promise<SubjectWork>;
  hashMissing(subject: SubjectRef, afterId: number, limit: number): Promise<HashOutcome>;
  pipeline(subject: SubjectRef): Promise<{ embedded: number; groups: number }>;
  saveRun(subjectId: number, signature: string, hashCursor: number): Promise<void>;
  notifyFailures(failedCodes: readonly string[], eligible: number): void;
}

export interface SimilarityJobSummary {
  subjects: number; // số môn được xét
  eligible: number; // số môn cần làm
  processed: number;
  failed: number;
  imagesHashed: number;
  imagesUnreadable: number; // đã thử nhưng không tính được (ảnh thiếu/hỏng)
  hashLimited: number; // số môn còn ảnh chưa tính vì hết trần đêm nay (đêm sau làm tiếp)
  embedded: number;
  groups: number;
}

export interface RunOptions {
  force?: boolean; // làm lại mọi môn có đề (vd sau khi gắn lại chương), kể cả ảnh từng không đọc được
  maxHashes?: number;
}

export function createSimilarityJob(deps: SimilarityJobDeps) {
  let running = false; // ứng dụng chạy một tiến trình PM2 nên cờ trong bộ nhớ đủ để không có hai lượt cùng lúc

  /** Một lượt chạy. Trả null nếu đang có lượt khác chạy. */
  return async function run({ force = false, maxHashes = SIMILARITY_JOB_MAX_HASHES }: RunOptions = {}): Promise<SimilarityJobSummary | null> {
    if (running) return null;
    running = true;
    try {
      const entries = await deps.loadSubjects();
      const todo: { entry: SubjectEntry; cursor: number; work: SubjectWork }[] = [];
      for (const entry of entries) {
        const cursor = hashCursorFor(entry, force);
        const work = entry.hasUsableExams ? await deps.countWork(entry.subject, cursor) : { missingHashes: 0, unembedded: 0 };
        if (needsWork(entry, work, force)) todo.push({ entry, cursor, work });
      }

      const budget = splitHashBudget(
        todo.map((t) => ({ id: t.entry.subject.id, missing: t.work.missingHashes })),
        maxHashes,
      );
      const summary: SimilarityJobSummary = { subjects: entries.length, eligible: todo.length, processed: 0, failed: 0, imagesHashed: 0, imagesUnreadable: 0, hashLimited: 0, embedded: 0, groups: 0 };
      const failedCodes: string[] = [];

      for (const { entry, cursor, work } of todo) {
        const { subject } = entry;
        try {
          const limit = budget.get(subject.id) ?? 0;
          const h = limit > 0 ? await deps.hashMissing(subject, cursor, limit) : { attempted: 0, hashed: 0, lastId: null };
          summary.imagesHashed += h.hashed;
          summary.imagesUnreadable += h.attempted - h.hashed;
          if (h.attempted < work.missingHashes) summary.hashLimited++;
          const p = await deps.pipeline(subject);
          summary.embedded += p.embedded;
          summary.groups += p.groups;
          // Ghi chữ ký đọc lúc đầu lượt: đề đổi trong lúc chạy thì đêm sau chữ ký khác và môn được làm lại
          await deps.saveRun(subject.id, entry.signature, h.lastId ?? cursor);
          summary.processed++;
        } catch (err) {
          summary.failed++;
          failedCodes.push(subject.code);
          console.error(`[similarity] ${subject.code} lỗi: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      if (failedCodes.length) deps.notifyFailures(failedCodes, todo.length);
      return summary;
    } finally {
      running = false;
    }
  };
}

const defaultDeps: SimilarityJobDeps = {
  async loadSubjects() {
    const [subjects, aggregates, runs] = await Promise.all([subjectRepository.listAll(), similarityJobRepository.usableExamAggregates(), similarityJobRepository.runs()]);
    const runOf = new Map(runs.map((r) => [r.subjectId, r]));
    return subjects.flatMap((subject) => {
      const agg = aggregates.get(subject.code);
      const run = runOf.get(subject.id);
      if (!agg && !run) return []; // môn chưa có đề dùng được và chưa từng chạy: không có gì để làm
      return [{ subject, signature: examSignature(agg ?? EMPTY_EXAM_AGGREGATE), hasUsableExams: !!agg, lastRun: run ? { signature: run.examSignature, hashCursor: run.hashCursor } : null }];
    });
  },

  async countWork(subject, hashAfterId) {
    const [missingHashes, unembedded] = await Promise.all([
      similarityJobRepository.countMissingHashes(subject.code, hashAfterId),
      similarityJobRepository.countUnembedded(subject.code, FINGERPRINT_MODEL),
    ]);
    return { missingHashes, unembedded };
  },

  async hashMissing(subject, afterId, limit) {
    const rows = await similarityJobRepository.missingHashBatch(subject.code, afterId, limit);
    const hashed = await hashImagesInBatches(rows, storageDir, async (r, hash) => {
      await similarityJobRepository.saveHash(r.id, hash);
    });
    return { attempted: rows.length, hashed, lastId: rows.at(-1)?.id ?? null };
  },

  async pipeline(subject) {
    const r = await runSimilarityPipeline(subject); // mặc định: model dấu vân tay, ngưỡng mặc định, ghi thật, tính lại thống kê
    return { embedded: r.embed?.embedded ?? 0, groups: r.group.groups.length };
  },

  async saveRun(subjectId, signature, hashCursor) {
    await similarityJobRepository.saveRun(subjectId, signature, hashCursor, new Date());
  },

  notifyFailures(failedCodes, eligible) {
    const shown = failedCodes.slice(0, SIMILARITY_JOB_NOTICE_MAX_CODES).join(", ");
    const more = failedCodes.length > SIMILARITY_JOB_NOTICE_MAX_CODES ? ` và ${failedCodes.length - SIMILARITY_JOB_NOTICE_MAX_CODES} môn khác` : "";
    adminNoticeService.push("system.error", {
      title: "Cập nhật nhóm câu và thống kê ban đêm bị lỗi",
      body: `${failedCodes.length}/${eligible} môn lỗi: ${shown}${more}. Xem log máy chủ; đêm sau sẽ tự thử lại.`,
    });
  },
};

export const similarityJobService = {
  run: createSimilarityJob(defaultDeps),
};

/** Một dòng tóm tắt (chỉ số đếm) cho log của cron và lệnh chạy tay. */
export const formatSimilaritySummary = (s: SimilarityJobSummary) =>
  `${s.eligible}/${s.subjects} môn cần làm, ${s.processed} xong, ${s.failed} lỗi; ${s.imagesHashed} ảnh mới tính dấu vân tay` +
  `${s.imagesUnreadable ? `, ${s.imagesUnreadable} ảnh không đọc được` : ""}${s.hashLimited ? `, ${s.hashLimited} môn còn ảnh cho đêm sau` : ""}; ${s.embedded} vector mới, ${s.groups} nhóm`;
