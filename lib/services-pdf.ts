/**
 * Minimal multi-page PDF writer for the price list (Worker-safe, no deps).
 * Uses Helvetica; non-Latin-1 glyphs become '?'.
 */

function escapePdfText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function utf8ByteLength(s: string): number {
  return new TextEncoder().encode(s).byteLength;
}

type Line = { text: string; size: number; bold?: boolean };

export function buildPriceListPdf(lines: Line[]): Uint8Array {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 48;
  const pageStreams: string[] = [];
  let ops: string[] = [];
  let y = pageHeight - margin;

  function flushPage() {
    pageStreams.push(ops.join("\n"));
    ops = [];
    y = pageHeight - margin;
  }

  for (const line of lines) {
    const size = Math.max(8, line.size);
    const leading = size * 1.35;
    if (y < margin + leading) flushPage();
    const safe = escapePdfText(line.text).slice(0, 110);
    const font = line.bold ? "F2" : "F1";
    ops.push(`BT /${font} ${size} Tf ${margin} ${y.toFixed(2)} Td (${safe}) Tj ET`);
    y -= leading;
  }
  if (ops.length) flushPage();
  if (!pageStreams.length) {
    pageStreams.push(
      `BT /F1 12 Tf ${margin} ${pageHeight - margin} Td (Empty price list) Tj ET`,
    );
  }

  const encoder = new TextEncoder();
  const chunks: string[] = [];
  chunks.push("%PDF-1.4\n");

  const objBodies: string[] = [];
  // 1 Catalog
  objBodies.push("<< /Type /Catalog /Pages 2 0 R >>");
  // 2 Pages — kids filled after we know page count
  const pageCount = pageStreams.length;
  const firstPageId = 3;
  const fontRegularId = firstPageId + pageCount * 2;
  const fontBoldId = fontRegularId + 1;

  const kidRefs = Array.from(
    { length: pageCount },
    (_, i) => `${firstPageId + i * 2} 0 R`,
  ).join(" ");
  objBodies.push(`<< /Type /Pages /Kids [${kidRefs}] /Count ${pageCount} >>`);

  for (let i = 0; i < pageCount; i++) {
    const pageId = firstPageId + i * 2;
    const contentId = pageId + 1;
    objBodies.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
    );
    const stream = pageStreams[i];
    objBodies.push(
      `<< /Length ${utf8ByteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  objBodies.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objBodies.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const offsets: number[] = [0];
  let body = "%PDF-1.4\n";
  for (let i = 0; i < objBodies.length; i++) {
    offsets.push(utf8ByteLength(body));
    body += `${i + 1} 0 obj\n${objBodies[i]}\nendobj\n`;
  }
  const xref = utf8ByteLength(body);
  body += `xref\n0 ${objBodies.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objBodies.length; i++) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objBodies.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return encoder.encode(body);
}
