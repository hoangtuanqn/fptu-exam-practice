// Công tắc M3: rãnh 52x32, tay cầm 16 (tắt) → 24 (bật), bật = primary; vùng chạm 48dp
export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`md-motion relative h-8 w-[52px] shrink-0 rounded-full border-2 after:absolute after:-inset-2 after:content-[''] disabled:opacity-[0.38] ${
        checked ? "border-primary bg-primary" : "border-outline bg-surface-container-highest"
      }`}
    >
      <span
        className={`md-motion absolute top-1/2 -translate-y-1/2 rounded-full ${
          checked ? "left-[calc(100%-26px)] h-6 w-6 bg-on-primary" : "left-1 h-4 w-4 bg-outline"
        }`}
      />
    </button>
  );
}
