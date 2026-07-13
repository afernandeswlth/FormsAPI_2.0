/**
 * Shared field validators + input filters used across the forms.
 */

/** Remove digits — names must not contain numbers. */
export function stripDigits(v: string): string {
  return (v ?? '').replace(/\d/g, '')
}

/** A name: non-empty and free of digits. */
export function isValidName(v: string | undefined): boolean {
  const s = (v ?? '').trim()
  return s.length > 0 && !/\d/.test(s)
}

/** Normalise an Australian phone number to 0XXXXXXXXX form (handles +61 / spaces). */
export function normalizeAuPhone(v: string | undefined): string {
  let s = (v ?? '').replace(/[\s()+-]/g, '')
  if (s.startsWith('61') && s.length === 11) s = '0' + s.slice(2)
  return s
}

/** Valid Australian phone number: 10 digits, e.g. mobile 04xxxxxxxx or landline 0[2378]xxxxxxxx. */
export function isValidAuPhone(v: string | undefined): boolean {
  return /^0[2-478]\d{8}$/.test(normalizeAuPhone(v))
}

export function isValidEmail(v: string | undefined): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v ?? '').trim())
}
