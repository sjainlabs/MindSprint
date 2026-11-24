/**
 * Bands are the level letters on each topic, from the pre-school bands (ZI, 7A … 2A) through A–O.
 * They don't line up exactly with school grades (Band D spans Grades 3–5), so they are a second way
 * to browse practice and review completed sheets.
 */
export const BAND_ORDER = ['ZI', 'ZII', '7A', '6A', '5A', '4A', '3A', '2A', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O'];

/** Position of a band in the order above; unknown bands go last */
export const bandRank = (band: string | null | undefined): number => {
  const i = BAND_ORDER.indexOf((band ?? '').toUpperCase());
  return i === -1 ? BAND_ORDER.length : i;
};

/** Bands sorted easiest first, without duplicates or blanks */
export const sortBands = (bands: Array<string | null | undefined>): string[] =>
  [...new Set(bands.filter((b): b is string => !!b))].sort((a, b) => bandRank(a) - bandRank(b));

/**
 * The band a sheet belongs to: the band most of its topics are in, the higher one on a tie.
 * Topic ids are compared without case, since older sheets stored them in lowercase.
 */
export const sheetBand = (topicIds: string[] | undefined, bandOf: Map<string, string>): string | null => {
  const counts = new Map<string, number>();
  for (const id of topicIds ?? []) {
    const band = bandOf.get(id.toLowerCase());
    if (band) counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [band, count] of counts) {
    const bestCount = best ? counts.get(best)! : 0;
    if (count > bestCount || (count === bestCount && bandRank(band) > bandRank(best))) best = band;
  }
  return best;
};
