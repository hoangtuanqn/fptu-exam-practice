import { useState } from "react";
import { Check, Plus } from "lucide-react";
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

  const top = Math.max(0, ...LETTERS.map((l) => counts[l] ?? 0));

  return (
    <section aria-label="Bình chọn đáp án" className="space-y-3 rounded-m3-lg bg-surface-container-low p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="md-title-small text-on-surface">Mọi người chọn gì?</h3>
          <p className="md-body-small text-on-surface-variant">{votes.voters > 0 ? `${votes.voters} người đã chọn` : "Chạm vào đáp án của bạn"}</p>
        </div>
        <label className="md-label-medium flex shrink-0 items-center gap-2 text-on-surface">
          Chọn nhiều
          <Switch checked={multi} onChange={setMulti} label="Chọn nhiều đáp án" />
        </label>
      </div>
      <ul className="grid grid-cols-4 gap-2">
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
                title={`${n} người chọn ${l}`}
                onClick={() => pick(l)}
                className={`md-state relative flex h-[4.5rem] w-full flex-col items-center justify-center overflow-hidden rounded-m3-md bg-surface-container-lowest outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60 ${on ? "ring-2 ring-inset ring-on-surface" : "ring-1 ring-inset ring-outline-variant"}`}
              >
                {/* Cột màu dâng từ dưới theo tỉ lệ chọn; đáp án nhiều người chọn nhất đậm hơn */}
                <span aria-hidden className={`absolute inset-x-0 bottom-0 transition-[height] duration-500 ${n > 0 && n === top ? "bg-surface-container-highest" : "bg-surface-container-high"}`} style={{ height: `${pct}%` }} />
                {on && <Check size={14} className="absolute right-1 top-1 text-on-surface" aria-hidden />}
                <span className="md-title-large relative font-bold leading-none text-on-surface">{l}</span>
                <span className="md-label-small relative mt-1 tabular-nums text-on-surface-variant">{pct}%</span>
              </button>
            </li>
          );
        })}
        {last < LETTERS.length - 1 && (
          <li>
            <button type="button" onClick={() => setAdded(LETTERS.length - 1)} aria-label="Thêm phương án" title="Thêm phương án" className="md-state flex h-[4.5rem] w-full items-center justify-center rounded-m3-md border border-dashed border-outline text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <Plus size={20} aria-hidden />
            </button>
          </li>
        )}
      </ul>
    </section>
  );
}
