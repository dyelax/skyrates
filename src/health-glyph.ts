export function healthGlyph(meter: 'Hull' | 'Crew'): string {
  const mark = meter === 'Hull'
    ? '<path d="M2 10h20l-4.5 5.5H6L2 10Zm4-2 1.8-3h3.8V2.5H14V5h3.1L20 8H6Z"/>'
    : '<circle cx="8.5" cy="5.6" r="3.1"/><circle cx="16.8" cy="6.4" r="2.6"/><path d="M1.8 15.6v-1.5c0-3.2 3-4.9 6.7-4.9s6.7 1.7 6.7 4.9v1.5H1.8Zm14.8 0v-1.5c0-1.7-.6-3-1.7-4.1a9.4 9.4 0 0 1 2-.2c3 0 5.3 1.3 5.3 3.8v2h-5.6Z"/>'
  return `<svg class="health-glyph health-glyph-${meter.toLowerCase()}" viewBox="0 0 24 18" fill="currentColor" aria-hidden="true" focusable="false">${mark}</svg>`
}
