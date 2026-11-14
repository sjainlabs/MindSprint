/** Analyst codes are 8 characters; the backend ignores case, spaces and dashes. */
export const ANALYST_CODE_LENGTH = 8;

/** "abcd-efgh " → "ABCDEFGH" */
export function normalizeAnalystCode(raw: string | null | undefined): string {
  return (raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, ANALYST_CODE_LENGTH);
}

/** "ABCDEFGH" → "ABCD-EFGH"; a partial code keeps the dash once it has passed the fourth character. */
export function formatAnalystCode(raw: string | null | undefined): string {
  const code = normalizeAnalystCode(raw);
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** "Fri, Dec 12" (in the viewer's locale). */
export function expiryDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

/**
 * The link an analyst opens: `<app base>#/analyst?code=XXXXXXXX`. It is on the hash because GitHub Pages
 * only serves real files, so a plain `/analyst` path would be its 404 page (public/404.html forwards
 * links already sent that way).
 */
export function analystShareLink(code: string, base = document.baseURI): string {
  const app = new URL(base);
  app.hash = '';
  app.search = '';
  return `${app.href}#/analyst?code=${encodeURIComponent(normalizeAnalystCode(code))}`;
}
