/**
 * Turns a "vertical" question (a column sum like 345 + 278) into rows to stack right-aligned,
 * the way children write them on paper. Uses metadata when the backend sends the numbers,
 * otherwise reads them from the prompt. Returns null when the prompt isn't a plain sum.
 */

export interface ColumnRow {
  /** '' for the first number, otherwise +, −, × or ÷. */
  op: string;
  value: string;
}

export interface ColumnLayout {
  /** Words before the sum, e.g. "Add:". */
  intro: string;
  rows: ColumnRow[];
}

const NUMBER = String.raw`\d[\d,]*(?:\.\d+)?`;
const OP = String.raw`[+\-−×x*÷]`;
const SUM = new RegExp(String.raw`(${NUMBER})((?:\s*${OP}\s*${NUMBER})+)\s*(?:=\s*)?\??\s*$`);

function normaliseOp(op: string): string {
  if (op === '-') return '−';
  if (op === '*' || op === 'x') return '×';
  return op;
}

export function columnLayout(prompt: string, metadata?: Record<string, unknown> | null): ColumnLayout | null {
  const fromMeta = metadataRows(metadata);
  if (fromMeta) {
    const m = SUM.exec(prompt ?? '');
    return { intro: (m ? prompt.slice(0, m.index) : '').trim(), rows: fromMeta };
  }

  const text = (prompt ?? '').trim();
  const m = SUM.exec(text);
  if (!m) return null;
  const rows: ColumnRow[] = [{ op: '', value: m[1] }];
  const rest = new RegExp(String.raw`\s*(${OP})\s*(${NUMBER})`, 'g');
  for (const part of m[2].matchAll(rest)) rows.push({ op: normaliseOp(part[1]), value: part[2] });
  return { intro: text.slice(0, m.index).trim(), rows };
}

function metadataRows(metadata?: Record<string, unknown> | null): ColumnRow[] | null {
  if (!metadata) return null;
  const operator = typeof metadata['operator'] === 'string' ? normaliseOp(metadata['operator']) : '+';
  const operands = Array.isArray(metadata['operands'])
    ? metadata['operands']
    : metadata['top'] !== undefined && metadata['bottom'] !== undefined
      ? [metadata['top'], metadata['bottom']]
      : null;
  if (!operands || operands.length < 2) return null;
  return operands.map((v, i) => ({ op: i === 0 ? '' : operator, value: String(v) }));
}
