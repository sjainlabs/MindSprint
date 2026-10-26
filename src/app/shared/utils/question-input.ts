/**
 * Works out how a student should enter the answer to one question, from its prompt alone.
 * Every question is `short_text`; this only changes the keyboard, helper keys and hint text.
 * It runs per question, so a mixed "Review" sheet gets the right input for each prompt.
 */

export type QuestionInputKind = 'dots' | 'multi' | 'inequality' | 'text';

export interface HelperKey {
  /** What the button shows. */
  label: string;
  /** What it inserts. */
  insert: string;
  /** Accessible name, e.g. "Insert less than or equal to". */
  aria: string;
}

export interface QuestionInputSpec {
  kind: QuestionInputKind;
  /** For multi-part answers: the values asked for, in prompt order, e.g. ['x', 'y']. */
  variables: string[];
  /** Virtual keyboard to ask the device for. */
  inputMode: 'numeric' | 'decimal' | 'text';
  helperKeys: HelperKey[];
  /** Shown under the input, e.g. "Example: 3, -2". */
  hint: string | null;
}

const KEY_MINUS: HelperKey = { label: '−', insert: '-', aria: 'Insert minus sign' };
const KEY_SLASH: HelperKey = { label: '/', insert: '/', aria: 'Insert fraction bar' };
const KEY_POINT: HelperKey = { label: '.', insert: '.', aria: 'Insert decimal point' };
const INEQUALITY_KEYS: HelperKey[] = [
  { label: '<', insert: '<', aria: 'Insert less than' },
  { label: '>', insert: '>', aria: 'Insert greater than' },
  { label: '≤', insert: '≤', aria: 'Insert less than or equal to' },
  { label: '≥', insert: '≥', aria: 'Insert greater than or equal to' },
];

const DOTS = /[●⚫]/;
/** "Give x, y …", "Give p, q where p ≤ q", "Give a, b, c": single letters separated by commas. */
const GIVE_VARIABLES = /\bGive\s+([a-z](?:\s*,\s*[a-z])+)\b/i;
const FRACTION_IN_PROMPT = /\d\s*\/\s*\d|fraction|simplest form|mixed number/i;
// A minus is a negative sign when a digit follows straight away (−7), not in "45 − 23".
const NEGATIVE_IN_PROMPT = /(^|[\s(=,+×÷*])[-−]\d|[-−]\s*\(|\b\d+\s*[-−]\s*\d+\b.*[<>≤≥=]|integer|negative/i;
const HAS_LETTER_VARIABLE = /(^|[^a-z])[a-z](?![a-z])/i;
const ARITHMETIC = /\d\s*[+×÷*x−-]\s*\d/;
/** Prompts that want a word, not a number. */
const WORD_ANSWER = /\b(which|name|what shape|what kind|explain|why|true or false|word|spell|direction|left or right|up or down)\b/i;

const EXAMPLE_VALUES = ['3', '-2', '5'];

export function inputSpecFor(prompt: string): QuestionInputSpec {
  const text = prompt ?? '';

  if (DOTS.test(text) && /how many/i.test(text)) {
    return { kind: 'dots', variables: [], inputMode: 'numeric', helperKeys: [], hint: null };
  }

  const give = GIVE_VARIABLES.exec(text);
  if (give) {
    const variables = give[1].split(',').map((v) => v.trim());
    const example = variables.map((_, i) => EXAMPLE_VALUES[i % EXAMPLE_VALUES.length]).join(', ');
    return {
      kind: 'multi',
      variables,
      inputMode: 'text',
      helperKeys: withFractionKeys(text, [KEY_MINUS]),
      hint: `Example: ${example}`,
    };
  }

  if (/^\s*Solve\b/i.test(text) && /[<>≤≥]/.test(text)) {
    return {
      kind: 'inequality',
      variables: [],
      inputMode: 'text',
      helperKeys: [...INEQUALITY_KEYS, KEY_MINUS, ...(FRACTION_IN_PROMPT.test(text) ? [KEY_SLASH] : [])],
      hint: 'Example: x ≤ 5',
    };
  }

  // Fractions and negatives need "/" and "-", which phone number pads don't have.
  const needsFraction = FRACTION_IN_PROMPT.test(text);
  const needsMinus = NEGATIVE_IN_PROMPT.test(text) || (HAS_LETTER_VARIABLE.test(stripWords(text)) && /=/.test(text));
  if (needsFraction || needsMinus) {
    return {
      kind: 'text',
      variables: [],
      inputMode: 'text',
      helperKeys: [...(needsFraction ? [KEY_SLASH] : []), KEY_MINUS],
      hint: needsFraction ? 'Write fractions in simplest form, e.g. 1/4, -19/3 or 2 3/4' : null,
    };
  }

  if (ARITHMETIC.test(text) && !WORD_ANSWER.test(text)) {
    const decimal = /\d\.\d/.test(text) || /decimal|₹|\$|money/i.test(text);
    return {
      kind: 'text',
      variables: [],
      inputMode: decimal ? 'decimal' : 'numeric',
      helperKeys: decimal ? [KEY_POINT] : [],
      hint: null,
    };
  }

  return { kind: 'text', variables: [], inputMode: 'text', helperKeys: [], hint: null };
}

/** Splits a stored "3, -2" answer back into per-variable values. */
export function splitMultiAnswer(answer: string, count: number): string[] {
  const parts = (answer ?? '').split(',').map((p) => p.trim());
  return Array.from({ length: count }, (_, i) => parts[i] ?? '');
}

/** Joins per-variable values in prompt order; empty when nothing has been typed. */
export function joinMultiAnswer(values: string[]): string {
  return values.some((v) => v.trim()) ? values.map((v) => v.trim()).join(', ') : '';
}

function withFractionKeys(text: string, keys: HelperKey[]): HelperKey[] {
  return FRACTION_IN_PROMPT.test(text) ? [KEY_SLASH, ...keys] : keys;
}

/** Removes ordinary words so a single-letter check only sees maths like "x" or "y". */
function stripWords(text: string): string {
  return text.replace(/\b[a-z]{2,}\b/gi, ' ');
}
