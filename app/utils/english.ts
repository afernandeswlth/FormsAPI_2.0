/**
 * Guards form input to English/ASCII text.
 *
 * The official PDF templates are filled with pdf-lib's standard fonts, which
 * can only encode Latin/ASCII characters — non-English input (e.g. Japanese)
 * crashes PDF generation. We block it on the client with a clear message so the
 * user can fix the offending field before submitting.
 */
const NON_ASCII = /[^\x00-\x7F]/

export function isEnglish(v: unknown): boolean {
  return typeof v !== 'string' || !NON_ASCII.test(v)
}

/** Turn a key / array index into a human label ("firstName" -> "First Name", "0" -> "#1"). */
function label(key: string): string {
  if (/^\d+$/.test(key)) return `#${Number(key) + 1}`
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

function walk(value: unknown, path: string[], out: Set<string>) {
  if (typeof value === 'string') {
    if (NON_ASCII.test(value)) out.add(path.map(label).join(' ').trim() || 'a field')
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => walk(v, [...path, String(i)], out))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      walk(v, [...path, k], out)
    }
  }
}

/**
 * Scans the given (labelled) form fields and, if any contain non-English
 * characters, returns a single clear error naming the offending fields.
 */
export function englishError(fields: Record<string, unknown>): string[] {
  const bad = new Set<string>()
  walk(fields, [], bad)
  if (!bad.size) return []
  return [
    `Please use English letters and numbers only — remove special or non-English characters from: ${[...bad].join(', ')}.`,
  ]
}
