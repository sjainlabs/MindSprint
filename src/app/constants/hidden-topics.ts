/**
 * Topics that need drawing or tracing, which the app can't do yet. They're hidden from every topic
 * picker and recommendation. Remove an ID here once a tracing feature supports it.
 */
export const DRAWING_ONLY_TOPIC_IDS: readonly string[] = [
  '6A-coloring-1',
  '5A-coloring-2',
  '4A-straight-lines-1',
  '3A-straight-lines-2',
  'ZI-shapes-pictures-1',
  'ZII-shapes-pictures-1',
];

const HIDDEN = new Set(DRAWING_ONLY_TOPIC_IDS.map(normalize));

// IDs are compared case-insensitively and with any leading "-" ignored, so "-6A-coloring-1" also matches.
function normalize(id: string): string {
  return id.trim().replace(/^-+/, '').toLowerCase();
}

export function isHiddenTopic(topicId: string | null | undefined): boolean {
  return !!topicId && HIDDEN.has(normalize(topicId));
}

/** Drops hidden topics from any list of objects with an `id` or `topicId`. */
export function withoutHiddenTopics<T extends { id?: string; topicId?: string }>(topics: T[]): T[] {
  return topics.filter((t) => !isHiddenTopic(t.id ?? t.topicId));
}
