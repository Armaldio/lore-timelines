// Small stroke icons (24x24 viewBox) keyed by Event.icon, so rendering never depends on font glyph coverage.
const paths: Record<string, string> = {
  plane: 'M21 3L3 10l7 3 3 7z M10 13l11-10',
  rabbit: 'M9 3c-2 0-2 6 0 9 M15 3c2 0 2 6 0 9 M7 17a5 5 0 0 0 10 0 5 5 0 0 0-10 0z',
  book: 'M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3z M21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z',
  fire: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z',
  mask: 'M3 6c6 2 12 2 18 0 0 7-3 12-9 12S3 13 3 6z M8 10h2 M14 10h2',
  portal: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z M12 11.2a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6z',
  burst: 'M12 2v20 M2 12h20 M5 5l14 14 M19 5L5 19',
  restore: 'M4 12a8 8 0 1 0 3-6.2 M4 4v5h5',
  battle: 'M4 20L20 4 M4 4l16 16',
}
export const iconPath = (key?: string) => (key && paths[key]) || 'M12 4l8 8-8 8-8-8z'
