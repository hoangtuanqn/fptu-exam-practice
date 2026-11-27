import { useEffect, useState } from "react";
import { Upload } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Feedback";
import { Input, Select } from "@/shared/ui/Input";
import { MAX_TOTAL_BYTES } from "@/features/exam-contribution/limits";
import { examUploadApi, KIND_LABEL, type ExamKind, type UploadJob } from "./exam-upload.api";
import { ansPathOf, checkFolder, checkResources, findRoot, isQuizFolder, nameFromFolder, type FolderCheck, type FolderEntry, type ResourceCheck } from "./folder";

// Nhiều thư mục đề thả vào một lần: mỗi thư mục (cấp đầu của đường dẫn) là một đề. Người dùng xem và sửa từng đề trước khi tải
export function groupByFolder(entries: FolderEntry<File>[]): FolderEntry<File>[][] {
  const groups = new Map<string, FolderEntry<File>[]>();
  for (const e of entries) {
    const top = e.path.includes("/") ? e.path.split("/")[0]! : "";
    if (top) groups.set(top, [...(groups.get(top) ?? []), e]);
  }
  return [...groups.values()];
}

const total = (files: File[]) => files.reduce((s, f) => s + f.size, 0);

interface Analysis {
  quiz: boolean; // true: đề trắc nghiệm (images/ + ans.json); false: thư mục tài liệu
  count: number; // số câu hoặc số tệp
  errors: string[];
  ansJson: string | null;
  check?: FolderCheck<File>;
  resource?: ResourceCheck<File>;
}

// Đọc và kiểm tra một thư mục đúng một lần khi mở bảng
async function analyze(entries: FolderEntry<File>[]): Promise<Analysis> {
  const paths = entries.map((e) => e.path);
  if (!isQuizFolder(paths)) {
    const resource = checkResources(entries);
    return { quiz: false, count: resource.files.length, errors: resource.errors, ansJson: null, resource };
  }
  const { root } = findRoot(paths);
  const ans = entries.find((e) => e.path === ansPathOf(root ?? ""));
  const ansJson = ans ? await ans.file.text() : null;
  const check = checkFolder(entries, ansJson);
  return { quiz: true, count: check.items.length, errors: check.errors, ansJson, check };
}

interface Row {
  entries: FolderEntry<File>[];
  title: string;
  subjectCode: string;
  kind: ExamKind | "";
  include: boolean;
  analysis: Analysis | null;
}

type Status = { kind: "run" | "ok" | "skip" | "fail"; note?: string };
const STATUS_TEXT: Record<Status["kind"], string> = { run: "Đang tải…", ok: "Đã nhận, đang xử lý nền", skip: "Bỏ qua", fail: "Lỗi" };
const KINDS = Object.keys(KIND_LABEL) as ExamKind[];

// Lỗi chặn không cho tải đề này (null = đề đã sẵn sàng)
function problem(r: Row): string | undefined {
  if (!r.include) return undefined;
  if (!r.analysis) return "Đang kiểm tra thư mục…";
  if (r.analysis.errors.length) return r.analysis.errors[0];
  if (!r.title.trim()) return "Nhập tên đề";
  if (!r.subjectCode) return "Chọn môn của đề";
  if (!r.kind) return "Chọn loại đề";
  const size = r.analysis.quiz ? total(r.analysis.check!.items.map((i) => i.file)) : total(r.analysis.resource!.files.map((f) => f.file));
  if (size > MAX_TOTAL_BYTES) return "Tổng dung lượng quá lớn";
  return undefined;
}

interface Props {
  groups: FolderEntry<File>[][];
  subjectCodes: string[];
  onJob: (job: UploadJob) => void;
  onCancel: () => void;
}

export function BatchUpload({ groups, subjectCodes, onJob, onCancel }: Props) {
  const [rows, setRows] = useState<Row[]>(() =>
    groups.map((g) => {
      const named = nameFromFolder(g.map((e) => e.path));
      return { entries: g, title: named?.title ?? "", subjectCode: named?.subjectCode ?? "", kind: named?.kind ?? "", include: true, analysis: null };
    }),
  );
  const [status, setStatus] = useState<Record<number, Status>>({});
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const patch = (i: number, p: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));

  // Mở bảng thì kiểm tra từng thư mục; đề trắc nghiệm không đoán được loại thì mặc định FE
  useEffect(() => {
    let alive = true;
    groups.forEach((g, i) => {
      analyze(g).then(
        (analysis) => {
          if (alive) setRows((rs) => rs.map((r, j) => (j === i ? { ...r, analysis, kind: r.kind || (analysis.quiz ? "FE" : "") } : r)));
        },
        () => {
          if (alive) setRows((rs) => rs.map((r, j) => (j === i ? { ...r, analysis: { quiz: false, count: 0, errors: ["Không đọc được tệp trong thư mục này"], ansJson: null } } : r)));
        },
      );
    });
    return () => {
      alive = false;
    };
  }, [groups]);

  async function sendOne(r: Row): Promise<Status> {
    const a = r.analysis!;
    const input = { title: r.title.trim(), subjectCode: r.subjectCode, kind: r.kind as ExamKind };
    try {
      const job = a.quiz
        ? await examUploadApi.create({ ...input, images: a.check!.items.map((i) => i.file), ansJson: a.ansJson })
        : await examUploadApi.createResource({ ...input, files: a.resource!.files.map((f) => f.file) });
      onJob(job);
      return { kind: "ok" };
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_TITLE_EXISTS") return { kind: "skip", note: "Đề đã có, tải riêng để ghi đè" };
      return { kind: "fail", note: errorMessage(err, "Chưa tải được") };
    }
  }

  async function start() {
    setRunning(true);
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]!;
      if (!r.include) continue;
      setStatus((s) => ({ ...s, [i]: { kind: "run" } }));
      const result = await sendOne(r);
      setStatus((s) => ({ ...s, [i]: result }));
    }
    setRunning(false);
    setDone(true);
  }

  const locked = running || done;
  const chosen = rows.filter((r) => r.include);
  const blocked = chosen.length === 0 || chosen.some((r) => problem(r));
  const sent = Object.values(status).filter((s) => s.kind === "ok").length;

  return (
    <div className="space-y-3">
      <p className="md-body-medium text-on-surface-variant">
        Đã chọn {rows.length} thư mục đề. Kiểm tra từng đề, sửa tên, môn, loại nếu sai; bỏ tích đề không muốn tải rồi mới bấm tải.
      </p>
      <ul className="max-h-[60vh] divide-y divide-outline-variant overflow-y-auto rounded-m3-sm border border-outline-variant">
        {rows.map((r, i) => {
          const folder = r.entries[0]!.path.split("/")[0];
          const a = r.analysis;
          const summary = !a ? "Đang kiểm tra…" : a.quiz ? `Đề trắc nghiệm · ${a.count} câu` : `Tài liệu · ${a.count} tệp`;
          const st = status[i];
          // Lỗi của đề đã hiện ở danh sách lỗi bên dưới, dòng này không lặp lại
          const msg = st ? (st.note ? `${STATUS_TEXT[st.kind]}: ${st.note}` : STATUS_TEXT[st.kind]) : !r.include ? "Sẽ không tải" : a?.errors.length ? undefined : problem(r);
          return (
            <li key={i} className="space-y-3 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="md-body-medium flex min-w-0 items-center gap-2 text-on-surface">
                  <input type="checkbox" className="h-4 w-4 shrink-0" checked={r.include} disabled={locked} onChange={(e) => patch(i, { include: e.target.checked })} />
                  <span className="break-all">{folder}</span>
                </label>
                <span className="md-body-small text-on-surface-variant">{summary}</span>
              </div>
              {r.include && (
                <div className="grid gap-3 sm:grid-cols-[1fr_9rem_9rem]">
                  <Input label="Tên đề" value={r.title} onChange={(e) => patch(i, { title: e.target.value })} maxLength={200} disabled={locked} />
                  <Select label="Môn" value={r.subjectCode} onChange={(e) => patch(i, { subjectCode: e.target.value })} disabled={locked}>
                    <option value="">Chọn môn</option>
                    {subjectCodes.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </Select>
                  <Select label="Loại đề" value={r.kind} onChange={(e) => patch(i, { kind: e.target.value as ExamKind | "" })} disabled={locked}>
                    <option value="">Chọn loại</option>
                    {KINDS.map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABEL[k]}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
              {a?.errors.map((m) => (
                <p key={m} role="alert" className="md-body-small break-words text-error">
                  {m}
                </p>
              ))}
              {msg && (
                <p className={`md-body-small ${st?.kind === "fail" || (!st && problem(r)) ? "text-error" : "text-on-surface-variant"}`}>
                  {st?.kind === "run" && <Spinner size={14} className="mr-1 inline" />}
                  {msg}
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {done && (
        <p role="status" className="md-body-medium text-on-surface">
          Đã gửi {sent}/{chosen.length} đề, các đề đang được xử lý nền.
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancel} disabled={running}>
          {done ? "Chọn thư mục khác" : "Huỷ"}
        </Button>
        {!done && (
          <Button type="button" variant="primary" onClick={() => void start()} disabled={running || blocked}>
            <Upload size={16} aria-hidden /> {running ? "Đang tải lên…" : `Tải ${chosen.length} đề`}
          </Button>
        )}
      </div>
    </div>
  );
}
