import { FINGERPRINT_MODEL, GROUP_BORDERLINE_MARGIN, groupThresholdFor } from "../constants/similarity";
import { questionEmbeddingRepository } from "../repositories/question-embedding.repository";
import { questionGroupRepository } from "../repositories/question-group.repository";
import { subjectRepository } from "../repositories/subject.repository";
import { AppError } from "../rules/error";
import { assertThreshold, clusterQuestions, type ClusterRow } from "../utils/question-clustering";
import { bufferToVector, DimensionMismatchError, normalize } from "../utils/vector";

// Gom các câu gần giống nhau giữa các đề của một môn thành nhóm (dựa trên vector đã lưu ở question_embeddings).

export interface GroupOptions {
  modelName?: string;
  threshold?: number; // mặc định theo model (constants/similarity)
  sameChapterOnly?: boolean;
  allowSameExam?: boolean;
  dryRun?: boolean; // không ghi gì, chỉ trả kết quả và các cặp sát ngưỡng
}

export interface BorderlinePair {
  score: number;
  a: { questionId: number; examTitle: string; number: number; chapter: string | null };
  b: { questionId: number; examTitle: string; number: number; chapter: string | null };
}

export interface GroupSummary {
  subjectId: number;
  subjectCode: string;
  model: string;
  threshold: number;
  questions: number; // số câu có vector
  totalQuestions: number; // tổng số câu của môn
  compared: number;
  groups: number[][];
  borderline: BorderlinePair[]; // chỉ có khi dryRun
  written: boolean;
}

type Loaded = ClusterRow & { examTitle: string; number: number };

/** Đọc vector của môn và chuẩn hoá một lần; mọi vector phải cùng số chiều. */
async function loadRows(subjectCode: string, modelName: string): Promise<Loaded[]> {
  const rows = await questionEmbeddingRepository.forSubject(subjectCode, modelName);
  const dims = rows[0]?.dimensions;
  return rows.map((r) => {
    if (r.dimensions !== dims) throw new DimensionMismatchError(dims ?? 0, r.dimensions);
    return {
      questionId: r.questionId,
      examId: r.question.examId,
      chapter: r.question.topic,
      vector: normalize(bufferToVector(r.embedding, r.dimensions)),
      examTitle: r.question.exam.title,
      number: r.question.number,
    };
  });
}

export async function groupSimilarQuestions(subjectId: number, opts: GroupOptions = {}): Promise<GroupSummary> {
  const subject = await subjectRepository.findById(subjectId);
  if (!subject) throw AppError.notFound("Không tìm thấy môn học");
  const modelName = opts.modelName ?? FINGERPRINT_MODEL;
  const threshold = assertThreshold(opts.threshold ?? groupThresholdFor(modelName));
  const dryRun = opts.dryRun ?? false;

  const rows = await loadRows(subject.code, modelName);
  const result = clusterQuestions(rows, {
    threshold,
    sameChapterOnly: opts.sameChapterOnly ?? true,
    allowSameExam: opts.allowSameExam ?? false,
    borderlineMargin: dryRun ? GROUP_BORDERLINE_MARGIN : 0,
  });

  const byId = new Map(rows.map((r) => [r.questionId, r]));
  const describe = (id: number) => {
    const r = byId.get(id)!;
    return { questionId: id, examTitle: r.examTitle, number: r.number, chapter: r.chapter };
  };

  if (!dryRun) await questionGroupRepository.replaceForSubject(subject.id, modelName, threshold, result.groups);
  return {
    subjectId: subject.id,
    subjectCode: subject.code,
    model: modelName,
    threshold,
    questions: rows.length,
    totalQuestions: await questionEmbeddingRepository.countSubjectQuestions(subject.code),
    compared: result.compared,
    groups: result.groups,
    borderline: result.borderline.map((p) => ({ score: p.score, a: describe(p.a), b: describe(p.b) })),
    written: !dryRun,
  };
}
