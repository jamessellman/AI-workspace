import { marked } from "marked"

import type { Note } from "@/types/database"

/**
 * Client-side note export. PDF uses the browser's native print-to-PDF on a
 * cleanly styled render; .doc is a Word/Google-Docs-openable HTML document;
 * .md is the raw Markdown. No server or external service involved.
 */

function slug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "note"
  )
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function noteToMarkdown(note: Note): string {
  const title = note.title?.trim()
  return title ? `# ${title}\n\n${note.body}` : note.body
}

function noteToHtml(note: Note): string {
  return marked.parse(noteToMarkdown(note), { async: false }) as string
}

// Light, print-friendly styling (always dark text on white — a client report,
// independent of the app's theme).
const REPORT_CSS = `
  :root { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    color: #111; background: #fff; line-height: 1.6;
    max-width: 720px; margin: 40px auto; padding: 0 24px;
  }
  h1, h2, h3, h4 { line-height: 1.25; margin: 1.4em 0 0.5em; font-weight: 600; }
  h1 { font-size: 1.8rem; } h2 { font-size: 1.4rem; } h3 { font-size: 1.15rem; }
  p, ul, ol, blockquote, table { margin: 0.6em 0; }
  ul, ol { padding-left: 1.4em; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em;
    background: #f3f3f5; padding: 0.1em 0.35em; border-radius: 4px; }
  pre { background: #f6f6f8; padding: 12px 14px; border-radius: 8px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #ddd; margin-left: 0; padding-left: 1em; color: #555; }
  table { border-collapse: collapse; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  a { color: #1a56db; }
  @page { margin: 18mm; }
`

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Download the raw Markdown (.md). */
export function exportNoteMarkdown(note: Note): void {
  downloadBlob(
    `${slug(note.title)}.md`,
    "text/markdown;charset=utf-8",
    noteToMarkdown(note)
  )
}

/** Download a Word/Google-Docs-openable document (.doc). */
export function exportNoteDoc(note: Note): void {
  const html = `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/1999/xhtml"><head><meta charset="utf-8"><title>${escapeHtml(
    note.title || "Note"
  )}</title><style>${REPORT_CSS}</style></head><body>${noteToHtml(note)}</body></html>`
  downloadBlob(`${slug(note.title)}.doc`, "application/msword", html)
}

/**
 * Open a styled print window and trigger the browser's print dialog so the user
 * can Save as PDF. Returns false if a popup blocker prevented the window.
 */
export function exportNotePdf(note: Note): boolean {
  const w = window.open("", "_blank", "noopener,noreferrer")
  if (!w) return false
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    note.title || "Note"
  )}</title><style>${REPORT_CSS}</style></head><body>${noteToHtml(
    note
  )}<script>window.onload=function(){window.focus();window.print();};window.onafterprint=function(){window.close();};<\/script></body></html>`
  w.document.write(html)
  w.document.close()
  return true
}
