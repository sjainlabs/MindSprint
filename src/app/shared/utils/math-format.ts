/**
 * A light formatter for maths notation in prompts and study guides. It turns plain text into
 * parts the template can render: superscripts (x^2, e^(3x)), log bases (log_2), stacked fractions
 * (3/4, 2 1/4), 2×2-style matrices ([a b; c d]) and counting dots (●●●●● ●●).
 * Everything else, including √, ×, ÷, |x - 3|, sin(2x) and f'(0), is left as text.
 */

export type MathPart =
  | { kind: 'text'; value: string }
  | { kind: 'sup'; value: string }
  | { kind: 'sub'; value: string }
  | { kind: 'frac'; whole?: string; num: string; den: string; raw: string }
  | { kind: 'matrix'; rows: string[][]; raw: string }
  | { kind: 'dots'; groups: number[]; count: number };

const CELL = String.raw`[-−]?[\w.\/]+`;
const ROW = String.raw`${CELL}(?:\s+${CELL})*`;

interface Pattern {
  re: RegExp;
  build: (m: RegExpExecArray) => MathPart[];
  /** Skip when the previous character matches, e.g. so 12/05/2024 isn't read as fractions. */
  notAfter?: RegExp;
}

const PATTERNS: Pattern[] = [
  {
    // [a b; c d] — needs at least two rows so ordinary brackets are left alone.
    re: new RegExp(String.raw`\[\s*(${ROW}(?:\s*;\s*${ROW})+)\s*\]`, 'y'),
    build: (m) => {
      const rows = m[1].split(';').map((r) => r.trim().split(/\s+/));
      return [{ kind: 'matrix', rows, raw: m[0] }];
    },
  },
  {
    // Counting dots, possibly in space-separated groups.
    re: /[●⚫](?:\s*[●⚫])*/y,
    build: (m) => {
      const count = (m[0].match(/[●⚫]/g) ?? []).length;
      // Regroup into fives so the gaps always mean "five", whatever spacing the prompt used.
      const groups: number[] = [];
      for (let left = count; left > 0; left -= 5) groups.push(Math.min(5, left));
      return [{ kind: 'dots', groups, count }];
    },
  },
  {
    // log_2(8) → log with subscript 2.
    re: /log_(\w+|\{[^}]*\})/y,
    build: (m) => [{ kind: 'text', value: 'log' }, { kind: 'sub', value: unbrace(m[1]) }],
  },
  {
    // e^(3x), x^(n+1), x^{2}
    re: /\^(\([^()]*\)|\{[^}]*\})/y,
    build: (m) => [{ kind: 'sup', value: m[1].slice(1, -1) }],
  },
  {
    // x^2, 10^-3, x^n (a number or a single letter, so x^2y raises only the 2)
    re: /\^([-−]?(?:\d+(?:\.\d+)?|[a-zA-Z]))/y,
    build: (m) => [{ kind: 'sup', value: m[1] }],
  },
  {
    // Mixed number "2 1/4" or fraction "3/4"; not part of a date like 12/05/2024.
    re: /(?:(\d+) )?(\d+)\/(\d+)(?![\d/])/y,
    build: (m) => [{ kind: 'frac', whole: m[1], num: m[2], den: m[3], raw: m[0] }],
    notAfter: /[\w/.]/,
  },
];

export function formatMath(input: string | null | undefined): MathPart[] {
  const text = input ?? '';
  const parts: MathPart[] = [];
  let buffer = '';
  let i = 0;

  const flush = () => {
    if (buffer) parts.push({ kind: 'text', value: buffer });
    buffer = '';
  };

  outer: while (i < text.length) {
    const prev = text[i - 1] ?? '';
    for (const { re, build, notAfter } of PATTERNS) {
      if (notAfter && notAfter.test(prev)) continue;
      re.lastIndex = i;
      const m = re.exec(text);
      if (m && m[0].length > 0) {
        flush();
        parts.push(...build(m));
        i += m[0].length;
        continue outer;
      }
    }
    buffer += text[i];
    i += 1;
  }
  flush();
  return parts;
}

function unbrace(value: string): string {
  return value.startsWith('{') && value.endsWith('}') ? value.slice(1, -1) : value;
}
