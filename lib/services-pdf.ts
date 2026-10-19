/**
 * Minimal multi-page PDF writer for the price list (Worker-safe, no deps).
 * Helvetica / Type1 → WinAnsi; we transliterate to ASCII so content streams
 * stay single-byte and Romanian/Cyrillic labels remain readable.
 */

/** Fold common RO/BG/EN punctuation & letters into ASCII for Helvetica. */
function toPdfAscii(input: string): string {
	const map: Record<string, string> = {
		"ă": "a",
		"Ă": "A",
		"â": "a",
		"Â": "A",
		"î": "i",
		"Î": "I",
		"ș": "s",
		"Ș": "S",
		"ş": "s",
		"Ş": "S",
		"ț": "t",
		"Ț": "T",
		"ţ": "t",
		"Ţ": "T",
		"\u2014": "-", // em dash —
		"\u2013": "-", // en dash –
		"\u2026": "...", // ellipsis …
		"\u201E": '"', // „
		"\u201C": '"', // “
		"\u201D": '"', // ”
		"\u00AB": '"', // «
		"\u00BB": '"', // »
		"\u20AC": "EUR", // €
		"а": "a",
		"б": "b",
		"в": "v",
		"г": "g",
		"д": "d",
		"е": "e",
		"ж": "zh",
		"з": "z",
		"и": "i",
		"й": "y",
		"к": "k",
		"л": "l",
		"м": "m",
		"н": "n",
		"о": "o",
		"п": "p",
		"р": "r",
		"с": "s",
		"т": "t",
		"у": "u",
		"ф": "f",
		"х": "h",
		"ц": "ts",
		"ч": "ch",
		"ш": "sh",
		"щ": "sht",
		"ъ": "a",
		"ь": "y",
		"ю": "yu",
		"я": "ya",
		"А": "A",
		"Б": "B",
		"В": "V",
		"Г": "G",
		"Д": "D",
		"Е": "E",
		"Ж": "Zh",
		"З": "Z",
		"И": "I",
		"Й": "Y",
		"К": "K",
		"Л": "L",
		"М": "M",
		"Н": "N",
		"О": "O",
		"П": "P",
		"Р": "R",
		"С": "S",
		"Т": "T",
		"У": "U",
		"Ф": "F",
		"Х": "H",
		"Ц": "Ts",
		"Ч": "Ch",
		"Ш": "Sh",
		"Щ": "Sht",
		"Ъ": "A",
		"Ь": "Y",
		"Ю": "Yu",
		"Я": "Ya",
	};
	let out = "";
	for (const ch of String(input ?? "")) {
		if (map[ch]) out += map[ch];
		else if (/[\x20-\x7E]/.test(ch)) out += ch;
		else out += "?";
	}
	return out;
}

function escapePdfLiteral(s: string): string {
	return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** ASCII byte length (PDF structure + content streams are ASCII-only). */
function asciiByteLength(s: string): number {
	return s.length;
}

type Line = { text: string; size: number; bold?: boolean };

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const MAX_CHARS_AT_10 = 92;

function wrapLine(text: string, size: number): string[] {
	const maxChars = Math.max(24, Math.floor((MAX_CHARS_AT_10 * 10) / Math.max(8, size)));
	const raw = toPdfAscii(text);
	if (raw.length <= maxChars) return [raw];
	const words = raw.split(/\s+/).filter(Boolean);
	const lines: string[] = [];
	let cur = "";
	for (const w of words) {
		const next = cur ? `${cur} ${w}` : w;
		if (next.length <= maxChars) {
			cur = next;
			continue;
		}
		if (cur) lines.push(cur);
		if (w.length <= maxChars) {
			cur = w;
		} else {
			for (let i = 0; i < w.length; i += maxChars) {
				lines.push(w.slice(i, i + maxChars));
			}
			cur = "";
		}
	}
	if (cur) lines.push(cur);
	return lines.length ? lines : [""];
}

export function buildPriceListPdf(lines: Line[]): Uint8Array {
	const pageStreams: string[] = [];
	let ops: string[] = [];
	let y = PAGE_HEIGHT - MARGIN;

	function flushPage() {
		pageStreams.push(ops.join("\n"));
		ops = [];
		y = PAGE_HEIGHT - MARGIN;
	}

	for (const line of lines) {
		const size = Math.max(8, line.size);
		const leading = size * 1.35;
		const chunks = wrapLine(line.text, size);
		for (const chunk of chunks) {
			if (y < MARGIN + leading) flushPage();
			const safe = escapePdfLiteral(chunk);
			const font = line.bold ? "F2" : "F1";
			ops.push(`BT /${font} ${size} Tf ${MARGIN} ${y.toFixed(2)} Td (${safe}) Tj ET`);
			y -= leading;
		}
	}
	if (ops.length) flushPage();
	if (!pageStreams.length) {
		pageStreams.push(
			`BT /F1 12 Tf ${MARGIN} ${PAGE_HEIGHT - MARGIN} Td (Empty price list) Tj ET`,
		);
	}

	const objBodies: string[] = [];
	const pageCount = pageStreams.length;
	const firstPageId = 3;
	const fontRegularId = firstPageId + pageCount * 2;
	const fontBoldId = fontRegularId + 1;

	objBodies.push("<< /Type /Catalog /Pages 2 0 R >>");
	const kidRefs = Array.from(
		{ length: pageCount },
		(_, i) => `${firstPageId + i * 2} 0 R`,
	).join(" ");
	objBodies.push(`<< /Type /Pages /Kids [${kidRefs}] /Count ${pageCount} >>`);

	for (let i = 0; i < pageCount; i++) {
		const pageId = firstPageId + i * 2;
		const contentId = pageId + 1;
		objBodies.push(
			`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`,
		);
		const stream = pageStreams[i];
		objBodies.push(
			`<< /Length ${asciiByteLength(stream)} >>\nstream\n${stream}\nendstream`,
		);
	}
	objBodies.push(
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
	);
	objBodies.push(
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
	);

	const offsets: number[] = [0];
	let body = "%PDF-1.4\n";
	for (let i = 0; i < objBodies.length; i++) {
		offsets.push(asciiByteLength(body));
		body += `${i + 1} 0 obj\n${objBodies[i]}\nendobj\n`;
	}
	const xref = asciiByteLength(body);
	body += `xref\n0 ${objBodies.length + 1}\n`;
	body += "0000000000 65535 f \n";
	for (let i = 1; i <= objBodies.length; i++) {
		body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
	}
	body += `trailer\n<< /Size ${objBodies.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;

	// PDF body is pure ASCII after transliteration — Uint8Array from char codes.
	const out = new Uint8Array(body.length);
	for (let i = 0; i < body.length; i++) out[i] = body.charCodeAt(i) & 0xff;
	return out;
}
