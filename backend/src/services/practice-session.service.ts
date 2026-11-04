import { practiceSessionRepository } from "../repositories/practice-session.repository";
import { AppError } from "../rules/error";
import type { CreateSessionBody, ListSessionsQuery, SaveSessionBody } from "../rules/requests/session.request";
import type { Actor } from "../utils/actor";
import { toMeta } from "../utils/pagination";
import { examService } from "./exam.service";

type Row = NonNullable<Awaited<ReturnType<typeof practiceSessionRepository.findOfOwner>>>;

const answeredOf = (answers: Record<string, string[]>) => Object.values(answers).filter((a) => a.length > 0).length;

const toDto = (s: Row) => {
  const answers = s.answers as Record<string, string[]>;
  return {
    id: s.id,
    examId: s.examId,
    mode: s.mode,
    status: s.status,
    answers,
    checked: s.checked as Record<string, boolean>,
    flagged: s.flagged as Record<string, boolean>,
    current: s.current,
    elapsedSec: s.elapsedSec,
    answered: answeredOf(answers),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    exam: s.exam,
  };
};

const notFound = () => AppError.notFound("Không tìm thấy lượt làm bài");

const DAY_MS = 24 * 60 * 60 * 1000;
export const ABANDONED_AFTER_DAYS = 7; // lượt dở không đụng tới quá chừng này ngày thì xoá
export const SUBMITTED_KEEP_DAYS = 7; // lượt đã nộp giữ ngắn thôi: kết quả nằm ở lịch sử làm bài

export const practiceSessionService = {
  async cleanup(now = Date.now()) {
    return practiceSessionRepository.deleteStale(new Date(now - ABANDONED_AFTER_DAYS * DAY_MS), new Date(now - SUBMITTED_KEEP_DAYS * DAY_MS));
  },

  // Mỗi lần bấm làm bài là một lượt mới
  async create(actor: Actor, examId: number, body: CreateSessionBody) {
    await examService.assertAccess(actor, examId);
    return toDto(await practiceSessionRepository.create(actor.owner, examId, body.mode));
  },

  async get(actor: Actor, id: number) {
    const s = await practiceSessionRepository.findOfOwner(actor.owner, id);
    if (!s) throw notFound();
    return toDto(s);
  },

  async save(actor: Actor, id: number, body: SaveSessionBody) {
    const s = await practiceSessionRepository.findOfOwner(actor.owner, id);
    if (!s) throw notFound();
    // Lượt đã nộp thì khoá lại, tab cũ gửi muộn cũng không ghi đè
    if (s.status === "SUBMITTED") return { id: s.id, status: s.status, updatedAt: s.updatedAt };
    const { submitted, ...state } = body;
    return practiceSessionRepository.save(id, state, submitted === true);
  },

  async listMine(actor: Actor, query: ListSessionsQuery) {
    const notBefore = new Date(Date.now() - ABANDONED_AFTER_DAYS * DAY_MS);
    const { items, total } = await practiceSessionRepository.listInProgress(actor.owner, query, query.examId, notBefore);
    return { items: items.map(toDto), meta: toMeta(query, total) };
  },

  async remove(actor: Actor, id: number) {
    const s = await practiceSessionRepository.findOfOwner(actor.owner, id);
    if (!s) throw notFound();
    await practiceSessionRepository.remove(id);
  },
};
