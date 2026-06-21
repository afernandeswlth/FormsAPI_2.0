/**
 * Inline SVG assets for the WLTH Client Hub portal.
 * All use `currentColor` so colour is controlled via CSS.
 * Card icons are keyed by RequestType to match the /api/hub response.
 */

const stroke = (paths: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`

export const icons: Record<string, string> = {
  // ---- Brand marks ----
  wlthWordmark: `<svg viewBox="0 0 150 28" height="26" fill="none" aria-label="WLTH">
      <g stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">
        <path d="M2 4 L7 23 L11 10"/><path d="M13 4 L18 23 L22 10"/>
      </g>
      <text x="40" y="21" font-family="Inter, sans-serif" font-size="22" font-weight="700" letter-spacing="3" fill="currentColor">WLTH</text>
    </svg>`,

  parley: `<svg viewBox="0 0 150 28" height="22" fill="none" aria-label="WLTH x Parley">
      <g stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round">
        <path d="M2 5 L6 21 L9 11"/><path d="M11 5 L15 21 L18 11"/>
      </g>
      <line x1="26" y1="5" x2="26" y2="22" stroke="currentColor" stroke-width="1.2" opacity="0.5"/>
      <text x="33" y="20" font-family="Inter, sans-serif" font-size="15" font-style="italic" font-weight="600" letter-spacing="1.5" fill="currentColor">Parley</text>
    </svg>`,

  certified: `<svg viewBox="0 0 110 130" fill="none" stroke="currentColor" aria-label="Certified Impact Lender">
      <text x="55" y="14" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="600" fill="currentColor" stroke="none">Certified</text>
      <g stroke-width="2" fill="none">
        <path d="M55 30 L88 52 V92 H22 V52 Z"/>
        <path d="M55 44 L77 59 V86 H33 V59 Z"/>
        <path d="M55 58 L66 66 V80 H44 V66 Z"/>
      </g>
      <text x="55" y="114" text-anchor="middle" font-family="Inter, sans-serif" font-size="12" font-weight="700" fill="currentColor" stroke="none">Impact Lender</text>
      <text x="93" y="98" font-family="Inter, sans-serif" font-size="8" fill="currentColor" stroke="none">®</text>
    </svg>`,

  arrow: stroke('<path d="M4 12 H19"/><path d="M13 6 L19 12 L13 18"/>'),

  // ---- Impact band ----
  shield: stroke('<path d="M12 3 L20 6 V11 C20 16 16.5 19.5 12 21 C7.5 19.5 4 16 4 11 V6 Z"/>'),
  people: stroke(
    '<circle cx="8" cy="9" r="2.4"/><circle cx="16" cy="9" r="2.4"/><path d="M3.5 19 C3.5 15.5 5.5 14 8 14 C10.5 14 12.5 15.5 12.5 19"/><path d="M11.5 19 C11.5 15.5 13.5 14 16 14 C18.5 14 20.5 15.5 20.5 19"/>',
  ),

  // ---- Card icons (keyed by RequestType) ----
  'direct-debit': stroke(
    '<path d="M6 3 H14 L18 7 V21 H6 Z"/><path d="M14 3 V7 H18"/><path d="M12 10.5 V17"/><path d="M13.6 12 H11.2 C10.5 12 10 12.5 10 13.2 C10 13.9 10.5 14.3 11.2 14.3 H12.8 C13.5 14.3 14 14.7 14 15.4 C14 16.1 13.5 16.6 12.8 16.6 H10.2"/>',
  ),
  'linked-account': stroke(
    '<path d="M9.5 14.5 L14.5 9.5"/><path d="M10.5 7 L12.5 5 A3.5 3.5 0 0 1 19 11 L17 13"/><path d="M13.5 17 L11.5 19 A3.5 3.5 0 0 1 5 13 L7 11"/>',
  ),
  'repayment-change': stroke(
    '<path d="M20 11 A8 8 0 0 0 6 6.5 L4 8.5"/><path d="M4 4 V8.5 H8.5"/><path d="M4 13 A8 8 0 0 0 18 17.5 L20 15.5"/><path d="M20 20 V15.5 H15.5"/>',
  ),
  redraw: stroke(
    '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M12 9.5 V14.5"/><path d="M13.4 10.8 H11.2 C10.6 10.8 10.2 11.2 10.2 11.8 C10.2 12.4 10.6 12.7 11.2 12.7 H12.6 C13.2 12.7 13.6 13 13.6 13.6 C13.6 14.2 13.2 14.5 12.6 14.5 H10.4"/>',
  ),
  'open-offset': stroke(
    '<ellipse cx="12" cy="6" rx="7" ry="2.5"/><path d="M5 6 V12 C5 13.4 8.1 14.5 12 14.5 C15.9 14.5 19 13.4 19 12 V6"/><path d="M5 12 V18 C5 19.4 8.1 20.5 12 20.5 C15.9 20.5 19 19.4 19 18 V12"/>',
  ),
  'principal-reduction': stroke(
    '<path d="M12 3 A9 9 0 1 0 21 12 H12 Z"/><path d="M12 3 V12 H21 A9 9 0 0 0 12 3 Z"/>',
  ),
  'product-switch': stroke(
    '<path d="M4 9 H18"/><path d="M14 5 L18 9 L14 13"/><path d="M20 15 H6"/><path d="M10 11 L6 15 L10 19"/>',
  ),

  fallback: stroke('<circle cx="12" cy="12" r="8"/>'),

  // ---- File upload ----
  upload: stroke(
    '<path d="M12 16 V4"/><path d="M8 8 L12 4 L16 8"/><path d="M4 16 v2 a2 2 0 0 0 2 2 h12 a2 2 0 0 0 2-2 v-2"/>',
  ),
  fileDoc: stroke(
    '<path d="M7 3 H14 L19 8 V20 a1 1 0 0 1-1 1 H7 a1 1 0 0 1-1-1 V4 a1 1 0 0 1 1-1 Z"/><path d="M14 3 V8 H19"/>',
  ),
  trash: stroke(
    '<path d="M4 7 H20"/><path d="M9 7 V5 a1 1 0 0 1 1-1 h4 a1 1 0 0 1 1 1 V7"/><path d="M6 7 l1 13 a1 1 0 0 0 1 1 h8 a1 1 0 0 0 1-1 l1-13"/>',
  ),
}
