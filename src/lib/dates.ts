// Server timestamps are UTC without a zone ("2026-10-14 09:03:57").
// Without the trailing "Z" the browser reads them as LOCAL time, which in
// Moscow (UTC+3) makes every fresh session look expired 3 hours ago.
export function parseServerDate(v: string | null | undefined): Date {
  if (!v) return new Date(NaN);
  let s = v.trim().replace(' ', 'T');
  if (!/(?:[zZ]|[+-]\d{2}:?\d{2})$/.test(s)) s += 'Z';
  return new Date(s);
}
