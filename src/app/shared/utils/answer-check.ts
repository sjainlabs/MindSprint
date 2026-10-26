/**
 * Loose answer matching for study-guide "Try it yourself" questions. Nothing is scored, so this
 * leans towards accepting a reasonable answer rather than being strict.
 */

export type AnswerVerdict = 'correct' | 'incorrect' | 'manual';

/** Answers longer than this (or with more words) are treated as free text the child checks themselves. */
const MAX_AUTO_CHARS = 32;
const MAX_AUTO_WORDS = 6;

/** Splits answers like "x = 3 or x = −3" or "2, 4, 6" into parts that may come in any order. */
const LIST_SEPARATOR = /\s+(?:or|and)\s+|\s*[,;]\s*/i;

export function checkAnswer(input: string, expected: string): AnswerVerdict {
  if (!canAutoCheck(expected)) return 'manual';
  if (!input.trim()) return 'incorrect';
  return answersMatch(input, expected) ? 'correct' : 'incorrect';
}

export function canAutoCheck(expected: string): boolean {
  const text = expected.trim();
  if (!text) return false;
  if (parseNumber(text) !== null) return true;
  return text.length <= MAX_AUTO_CHARS && text.split(/\s+/).length <= MAX_AUTO_WORDS;
}

export function answersMatch(input: string, expected: string): boolean {
  if (singleMatch(input, expected)) return true;

  // Lists: same parts in any order. Thousands commas are stripped first so "1,000" stays one number.
  const a = splitList(input);
  const b = splitList(expected);
  if (b.length < 2 || a.length !== b.length) return false;
  const remaining = [...b];
  for (const part of a) {
    const i = remaining.findIndex((r) => singleMatch(part, r));
    if (i === -1) return false;
    remaining.splice(i, 1);
  }
  return true;
}

function singleMatch(input: string, expected: string): boolean {
  const x = parseNumber(input);
  const y = parseNumber(expected);
  if (x !== null && y !== null) return Math.abs(x - y) < 1e-9;
  return normalizeText(input) === normalizeText(expected);
}

function splitList(text: string): string[] {
  return stripThousands(unifyDashes(text))
    .split(LIST_SEPARATOR)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Lowercase, no spaces, one kind of minus, no thousands commas, no trailing full stop. */
export function normalizeText(text: string): string {
  return stripThousands(unifyDashes(text))
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/\.$/, '');
}

/**
 * Parses whole numbers, decimals, fractions ("3/4") and mixed numbers ("2 1/4"), with an optional
 * leading minus and currency sign. Returns null for anything else.
 */
export function parseNumber(text: string): number | null {
  const s = stripThousands(unifyDashes(text))
    .trim()
    .replace(/^[₹$£€]\s*/, '')
    .replace(/\s+/g, ' ');

  let m = /^(-)?\s*(\d+(?:\.\d+)?|\.\d+)$/.exec(s);
  if (m) return sign(m[1]) * parseFloat(m[2]);

  m = /^(-)?\s*(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) return Number(m[3]) === 0 ? null : sign(m[1]) * (Number(m[2]) / Number(m[3]));

  m = /^(-)?\s*(\d+) (\d+)\s*\/\s*(\d+)$/.exec(s);
  if (m) return Number(m[4]) === 0 ? null : sign(m[1]) * (Number(m[2]) + Number(m[3]) / Number(m[4]));

  return null;
}

function sign(minus: string | undefined): number {
  return minus ? -1 : 1;
}

/** Unicode minus (−), en dash and em dash all count as "-". */
function unifyDashes(text: string): string {
  return text.replace(/[−‒–—]/g, '-');
}

/** "12,500" → "12500", leaving list commas like "2, 4" alone. */
function stripThousands(text: string): string {
  return text.replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
}
