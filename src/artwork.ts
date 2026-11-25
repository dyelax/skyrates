// CSS custom properties can resolve relative URLs against the consuming stylesheet.
// The public art directory lives beside the game document, including on GitHub Pages.
export function artwork(name: string): string {
  return new URL(`${import.meta.env.BASE_URL}art/${name}.webp`, document.baseURI).href
}
