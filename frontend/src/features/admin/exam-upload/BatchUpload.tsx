import { useState } from "react";
import { Upload } from "lucide-react";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Spinner } from "@/shared/ui/Feedback";
import { MAX_TOTAL_BYTES } from "@/features/exam-contribution/limits";
import { examUploadApi, type UploadJob } from "./exam-upload.api";
import { ansPathOf, checkFolder, checkResources, findRoot, isQuizFolder, nameFromFolder, type FolderEntry } from "./folder";

// Nhiều thư mục đề thả vào một lần: mỗi thư mục (cấp đầu của đường dẫn) là một đề, tải lần lượt, đề lỗi hoặc đã có thì bỏ qua và báo
export function groupByFolder(entries: FolderEntry<File>[]): FolderEntry<File>[][] {
  const groups = new Map<string, FolderEntry<File>[]>();
  for (const e of entries) {
    const top = e.path.includes("/") ? e.path.split("/")[0]! : "";
    if (top) groups.set(top, [...(groups.get(top) ?? []), e]);
  }
  return [...groups.values()];
}

type State = { kind: "wait" | "run" | "ok" | "skip" | "fail"; note?: string };
const MARK: Record<State["kind"], string> = { wait: "Chờ", run: "Đang tải…", ok: "Đã nhận", skip: "Bỏ qua", fail: "Lỗi" };

interface Props {
  groups: FolderEntry<File>[][];
  subjectCodes: string[]; // mã môn đang có; thư mục không đoán được môn thì bỏ qua
  onJob: (job: UploadJob) => void;
  onCancel: () => void;
}

export function BatchUpload({ groups, subjectCodes, onJob, onCancel }: Props) {
  const [state, setState] = useState<State[]>(() => groups.map(() => ({ kind: "wait" })));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const set = (i: number, s: State) => setState((all) => all.map((x, j) => (j === i ? s : x)));

  async function sendOne(entries: FolderEntry<File>[]): Promise<State> {
    const paths = entries.map((e) => e.path);
    const named = nameFromFolder(paths);
    if (!named) return { kind: "fail", note: "Không có thư mục đề" };
    if (!named.subjectCode || !subjectCodes.includes(named.subjectCode)) return { kind: "skip", note: "Không đoán được môn từ tên thư mục" };
    const { title, subjectCode } = named;
    try {
      if (!isQuizFolder(paths)) {
        const r = checkResources(entries);
        if (r.errors.length) return { kind: "fail", note: r.errors[0] };
        if (r.files.reduce((s, f) => s + f.file.size, 0) > MAX_TOTAL_BYTES) return { kind: "fail", note: "Tổng dung lượng quá lớn" };
        onJob(await examUploadApi.createResource({ title, subjectCode, kind: named.kind ?? "PE", files: r.files.map((f) => f.file) }));
        return { kind: "ok" };
      }
      const { root } = findRoot(paths);
      const ans = entries.find((e) => e.path === ansPathOf(root ?? ""));
      const ansJson = ans ? await ans.file.text() : null;
      const check = checkFolder(entries, ansJson);
      if (check.errors.length) return { kind: "fail", note: check.errors[0] };
      if (check.items.reduce((s, i) => s + i.file.size, 0) > MAX_TOTAL_BYTES) return { kind: "fail", note: "Tổng dung lượng ảnh quá lớn" };
      onJob(await examUploadApi.create({ title, subjectCode, kind: named.kind ?? "FE", images: check.items.map((i) => i.file), ansJson }));
      return { kind: "ok" };
    } catch (err) {
      if (err instanceof ApiError && err.code === "EXAM_TITLE_EXISTS") return { kind: "skip", note: "Đề đã có (tải riêng từng đề để ghi đè)" };
      return { kind: "fail", note: errorMessage(err, "Chưa tải được") };
    }
  }

  async function start() {
    setRunning(true);
    for (let i = 0; i < groups.length; i++) {
      set(i, { kind: "run" });
      set(i, await sendOne(groups[i]!));
    }
    setRunning(false);
    setDone(true);
  }

  const ok = state.filter((s) => s.kind === "ok").length;
  return (
    <div className="space-y-3">
      <p className="md-body-medium text-on-surface-variant">
        Đã chọn {groups.length} thư mục đề. Tên đề, môn và loại đề lấy theo tên từng thư mục; đề đã có sẽ bị bỏ qua.
      </p>
      <ul className="max-h-[50vh] divide-y divide-outline-variant overflow-y-auto rounded-m3-sm border border-outline-variant">
        {groups.map((g, i) => {
          const s = state[i]!;
          return (
            <li key={g[0]!.path} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="md-body-medium min-w-0 break-words text-on-surface">{g[0]!.path.split("/")[0]}</span>
              <span className={`md-body-small shrink-0 text-right ${s.kind === "fail" ? "text-error" : "text-on-surface-variant"}`}>
                {s.kind === "run" && <Spinner size={14} className="mr-1 inline" />}
                {MARK[s.kind]}
                {s.note ? `: ${s.note}` : ""}
              </span>
            </li>
          );
        })}
      </ul>
      {done && <p role="status" className="md-body-medium text-on-surface">Đã gửi {ok}/{groups.length} đề, các đề đang được xử lý nền.</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" onClick={onCancel} disabled={running}>
          {done ? "Chọn thư mục khác" : "Huỷ"}
        </Button>
        {!done && (
          <Button type="button" variant="primary" onClick={() => void start()} disabled={running}>
            <Upload size={16} aria-hidden /> {running ? "Đang tải lên…" : `Tải ${groups.length} đề`}
          </Button>
        )}
      </div>
    </div>
  );
}
