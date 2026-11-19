/**
 * Turns what a student said into what they would have typed: "three quarters" or "3 by 4" → "3/4",
 * "minus twelve" → "-12", "two and a half" → "2 1/2", "zero point two five" → "0.25",
 * "x equals 3 and y equals minus 2" → "3, -2", "300 plus 40 plus 6" → "300 + 40 + 6".
 * Speech engines often send digits already ("3/4", "-12", "300 + 40 + 6"), so those pass
 * through. Anything with no number in it is kept as words, for answers like "rational" or "i".
 */

const SMALL: Record<string, number> = {
  zero: 0, oh: 0, nought: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES: Record<string, number> = { thousand: 1000, lakh: 100000, lakhs: 100000, million: 1000000, crore: 10000000, crores: 10000000 };
/** Denominator words: "three quarters", "five eighths", "one half" */
const DENOMINATORS: Record<string, number> = {
  half: 2, halves: 2, third: 3, thirds: 3, quarter: 4, quarters: 4, fourth: 4, fourths: 4, fifth: 5, fifths: 5,
  sixth: 6, sixths: 6, seventh: 7, sevenths: 7, eighth: 8, eighths: 8, ninth: 9, ninths: 9, tenth: 10, tenths: 10,
  eleventh: 11, elevenths: 11, twelfth: 12, twelfths: 12, hundredth: 100, hundredths: 100,
};
const NEGATIVE = new Set(['minus', 'negative']);
/** Said between two numbers to mean a fraction bar: "3 by 4", "three over four" */
const FRACTION_BAR = new Set(['over', 'upon', 'by']);
/** Words that carry no meaning in an answer */
const FILLER = /\b(the answer is|my answer is|answer|it's|it is|i think|is|equals|equal to|equal|um+|uh+|so|okay|ok)\b/g;

type Item = { kind: 'num'; text: string } | { kind: 'minus' | 'bar' | 'point' | 'and' | 'comma' | 'plus' | 'times' } | { kind: 'word'; text: string };

const isNumberWord = (word: string): boolean => word in SMALL || word in TENS || word === 'hundred' || word in SCALES;

/** Reads a run of number words ("three hundred and twenty five") from position i */
const readNumberWords = (words: string[], start: number): { value: number; next: number } => {
  let [total, current, i] = [0, 0, start];
  while (i < words.length) {
    const word = words[i];
    if (word in SMALL) current += SMALL[word];
    else if (word in TENS) current += TENS[word];
    else if (word === 'hundred') current = (current || 1) * 100;
    else if (word in SCALES) {
      total += (current || 1) * SCALES[word];
      current = 0;
    } else if (word === 'and' && i > start && isNumberWord(words[i + 1] ?? '') && /hundred|thousand|lakh|million|crore/.test(words[i - 1])) {
      // "one hundred and five": "and" inside a number, not between two answers
    } else break;
    i += 1;
  }
  return { value: total + current, next: i };
};

const tokenize = (transcript: string): Item[] => {
  const text = transcript
    .toLowerCase()
    .replace(/[−–—]/g, '-')
    .replace(/(\d),(?=\d{3}\b)/g, '$1') // 1,000 → 1000
    .replace(/(\d)\s*\/\s*(\d)/g, '$1/$2')
    .replace(/divided by|out of/g, ' over ')
    .replace(/multiplied by|\binto\b/g, ' times ')
    .replace(/([+×*])/g, ' $1 ') // "300+40+6" → "300 + 40 + 6"
    .replace(/\ba half\b/g, 'one half')
    .replace(/\ba quarter\b/g, 'one quarter')
    .replace(/(\w)-(\w)/g, '$1 $2') // twenty-three
    .replace(/,/g, ' comma ')
    .replace(/\b([a-z])\s*(?:=|equals|is)\s*/g, (match, letter: string) => (letter === 'i' ? match : ' comma ')) // "x equals 3" → separator
    .replace(FILLER, ' ')
    .replace(/[?!.](?!\d)/g, ' ')
    .trim();
  const words = text.split(/\s+/).filter(Boolean);

  const items: Item[] = [];
  for (let i = 0; i < words.length;) {
    const word = words[i];
    if (/^-?\d+(\.\d+)?(\/\d+)?$/.test(word)) {
      if (word.startsWith('-')) items.push({ kind: 'minus' });
      items.push({ kind: 'num', text: word.replace(/^-/, '') });
      i += 1;
    } else if (word === '-') {
      items.push({ kind: 'minus' });
      i += 1;
    } else if (word === '+' || word === 'plus') {
      items.push({ kind: 'plus' });
      i += 1;
    } else if (word === '×' || word === '*' || word === 'times') {
      items.push({ kind: 'times' });
      i += 1;
    } else if (isNumberWord(word)) {
      const { value, next } = readNumberWords(words, i);
      items.push({ kind: 'num', text: String(value) });
      i = next;
    } else if (word in DENOMINATORS) {
      // "three quarters" (after a number) or "half" on its own
      const previous = items[items.length - 1];
      if (previous?.kind !== 'num') items.push({ kind: 'num', text: '1' });
      items.push({ kind: 'bar' }, { kind: 'num', text: String(DENOMINATORS[word]) });
      i += 1;
    } else if (NEGATIVE.has(word)) {
      items.push({ kind: 'minus' });
      i += 1;
    } else if (FRACTION_BAR.has(word)) {
      items.push({ kind: 'bar' });
      i += 1;
    } else if (word === 'point') {
      items.push({ kind: 'point' });
      i += 1;
      // Digits after "point" are read one by one: "point two five" is .25, not .7
      while (i < words.length && (words[i] in SMALL && SMALL[words[i]] < 10)) {
        items.push({ kind: 'num', text: String(SMALL[words[i]]) });
        i += 1;
      }
    } else if (word === 'and') {
      items.push({ kind: 'and' });
      i += 1;
    } else if (word === 'comma') {
      items.push({ kind: 'comma' });
      i += 1;
    } else {
      items.push({ kind: 'word', text: word });
      i += 1;
    }
  }
  return items;
};

/** Joins items into one answer, e.g. [minus, 3, bar, 4] → "-3/4"; "and" before a fraction makes a mixed number */
const assemble = (items: Item[]): string => {
  let out = '';
  items.forEach((item, index) => {
    const next = items[index + 1];
    if (item.kind === 'num') out += item.text;
    // A minus after a number is "take away" (5 − 2); otherwise it's a negative sign (−2)
    else if (item.kind === 'minus') out += items[index - 1]?.kind === 'num' ? ' - ' : '-';
    else if (item.kind === 'plus') out += ' + ';
    else if (item.kind === 'times') out += ' × ';
    else if (item.kind === 'bar') out += '/';
    else if (item.kind === 'point') out += out === '' || /[-\s]$/.test(out) ? '0.' : '.';
    else if (item.kind === 'and') {
      // "two and three quarters" → "2 3/4"; any other "and" separates two answers
      const fractionFollows = next?.kind === 'num' && items[index + 2]?.kind === 'bar';
      out += fractionFollows ? ' ' : ', ';
    } else if (item.kind === 'comma') out += out === '' ? '' : ', ';
    else if (item.kind === 'word') out += out && !/[\s-]$/.test(out) ? ` ${item.text}` : item.text;
  });
  // Point-digits come as separate numbers ("0." "2" "5"): they already joined above with no spaces
  return out.replace(/,\s*(,\s*)+/g, ', ').replace(/^,\s*|,\s*$/g, '').trim();
};

/** Single words a speech engine hears instead of a digit said on its own */
const SOUNDS_LIKE: Record<string, string> = { for: '4', fore: '4', to: '2', too: '2', won: '1', ate: '8', tree: '3', sex: '6' };

export function spokenToAnswer(transcript: string): string {
  const single = (transcript ?? '').trim().toLowerCase().replace(/[.?!]$/, '');
  if (single in SOUNDS_LIKE) return SOUNDS_LIKE[single];
  const items = tokenize(transcript ?? '');
  if (!items.some((item) => item.kind === 'num')) {
    // A word answer ("rational", "i", "yes"): keep what was said, minus filler
    return assemble(items.filter((item) => item.kind === 'word' || item.kind === 'minus'));
  }
  // Words around numbers ("x", "cm", "degrees") are dropped, except i for complex numbers
  const kept = items.filter((item) => item.kind !== 'word' || item.text === 'i');
  return assemble(kept);
}
