// Đọc tham số dạng --key=value và --flag cho các lệnh chạy tay
export function parseArgs(argv: readonly string[] = process.argv.slice(2)) {
  const values = new Map<string, string>();
  const flags = new Set<string>();
  for (const arg of argv) {
    const m = /^--([a-z][a-z0-9-]*)(?:=(.*))?$/i.exec(arg);
    if (!m) throw new Error(`Unknown argument: ${arg}`);
    if (m[2] === undefined) flags.add(m[1]!);
    else values.set(m[1]!, m[2]);
  }
  return {
    has: (name: string) => flags.has(name),
    get: (name: string) => values.get(name),
    number(name: string) {
      const raw = values.get(name);
      if (raw === undefined) return undefined;
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error(`--${name} must be a number`);
      return n;
    },
  };
}
