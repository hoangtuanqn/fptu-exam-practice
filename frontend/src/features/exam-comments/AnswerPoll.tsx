import { useState } from "react";
import { Plus } from "lucide-react";
import { Switch } from "@/shared/ui/Switch";
import type { Votes } from "./exam-comments.api";

const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const DEFAULT_LAST = 3; // A-D luôn hiện

// Bình chọn đáp án của một câu: % = số người chọn chữ đó / số người đã bình chọn. Không bao giờ hiện đáp án đúng ở đây.
export function AnswerPoll({ votes, busy, onVote }: { votes: Votes; busy: boolean; onVote: (answers: string[]) => void }) {
  const mine = votes.mine ?? [];
  const counts = votes.counts ?? {};
  const [multi, setMulti] = useState(mine.length > 1);
  const [added, setAdded] = useState(DEFAULT_LAST);
  // Chữ đã có người chọn (hoặc mình chọn) luôn hiện
  const used = LETTERS.reduce((max, l, i) => ((counts[l] ?? 0) > 0 || mine.includes(l) ? i : max), DEFAULT_LAST);
  const last = Math.max(added, used);

  const pick = (l: string) => {
    if (mine.includes(l)) return onVote(mine.filter((m) => m !== l)); // bấm lại lựa chọn của mình = bỏ chọn
    onVote(multi ? [...mine, l].sort() : [l]);
  };

  return (
    <section aria-label="Bình chọn đáp án" className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="md-title-small text-on-surface">Bình chọn đáp án</h3>
          <p className="md-body-small text-on-surface-variant">{votes.voters} người đã chọn</p>
        </div>
        <label className="md-label-medium flex shrink-0 items-center gap-2 text-on-surface">
          <Switch checked={multi} onChange={setMulti} label="Nhiều đáp án" />
          Nhiều đáp án
        </label>
      </div>
      <ul className="space-y-1.5">
        {LETTERS.slice(0, last + 1).map((l) => {
          const n = counts[l] ?? 0;
          const pct = votes.voters > 0 ? Math.round((n / votes.voters) * 100) : 0;
          const on = mine.includes(l);
          return (
            <li key={l}>
              <button
                type="button"
                disabled={busy}
                aria-pressed={on}
                aria-label={`${l}: ${n} người, ${pct}%${on ? ", bạn đã chọn" : ""}`}
                onClick={() => pick(l)}
                className={`md-state relative flex h-11 w-full items-center gap-3 overflow-hidden rounded-m3-md border px-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${on ? "border-primary" : "border-outline-variant"}`}
              >
                <span aria-hidden className="absolute inset-y-0 left-0 bg-secondary-container transition-[width]" style={{ width: `${pct}%` }} />
                <span className={`relative flex h-7 w-7 items-center justify-center rounded-m3-sm text-sm font-semibold ${on ? "bg-primary text-on-primary" : "bg-surface text-on-surface ring-1 ring-outline-variant"}`}>{l}</span>
                <span className="relative ml-auto text-sm tabular-nums text-on-surface">{n}</span>
                <span className="relative w-11 text-right text-sm tabular-nums text-on-surface-variant">{pct}%</span>
              </button>
            </li>
          );
        })}
      </ul>
      {last < LETTERS.length - 1 && (
        <button type="button" onClick={() => setAdded(last + 1)} className="md-state md-label-large flex h-10 w-full items-center justify-center gap-2 rounded-m3-md border border-outline-variant text-on-surface-variant">
          <Plus size={16} aria-hidden /> Thêm phương án
        </button>
      )}
    </section>
  );
}
