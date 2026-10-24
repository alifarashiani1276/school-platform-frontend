// Builds a print-ready A4 document for one question-bank set and opens the
// browser's print dialog ("Save as PDF" gives a sharp, vector PDF).
//
// Why print instead of a canvas/JS PDF library:
//  - Persian/Arabic letters are shaped by the browser, so they join correctly
//  - text stays real text (sharp at any zoom, selectable, small file)
//  - @page A4 + margins make it print exactly on an A4 sheet

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Nunito:wght@400;700;900&family=Vazirmatn:wght@400;700;900&display=swap";

const LETTERS = {
  fa: ["الف", "ب", "ج", "د", "ه", "و"],
  ar: ["أ", "ب", "ج", "د", "هـ", "و"],
  latin: ["A", "B", "C", "D", "E", "F"],
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Keeps line breaks the teacher typed.
const multiline = (value) => escapeHtml(value).replace(/\r?\n/g, "<br />");

const safeFileName = (value) =>
  String(value ?? "")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

function buildHtml({ set, lang, dir, withAnswers, labels, dateText, numberFormat }) {
  const letters = lang.startsWith("fa") ? LETTERS.fa : lang.startsWith("ar") ? LETTERS.ar : LETTERS.latin;
  const n = (value) => numberFormat.format(value);

  const questions = set.questions
    .map((q, index) => {
      const head = `<div class="qt"><span class="num">${n(index + 1)}.</span><span class="txt" dir="auto">${multiline(
        q.text,
      )}</span></div>`;

      if (q.type === "mcq") {
        const long = q.options.some((o) => String(o).length > 28);
        const options = q.options
          .map((option, i) => {
            const correct = withAnswers && i === q.correct;
            return `<div class="opt${correct ? " correct" : ""}"><span class="letter">${escapeHtml(
              letters[i] ?? i + 1,
            )})</span><span dir="auto">${escapeHtml(option)}</span>${correct ? '<span class="tick">✓</span>' : ""}</div>`;
          })
          .join("");
        return `<section class="q">${head}<div class="opts${long ? " one" : ""}">${options}</div></section>`;
      }

      if (withAnswers) {
        const answer = q.answer
          ? `<div class="ans" dir="auto"><b>${escapeHtml(labels.modelAnswer)}:</b> ${multiline(q.answer)}</div>`
          : "";
        return `<section class="q">${head}${answer}</section>`;
      }
      // Blank writing lines for a descriptive question.
      return `<section class="q">${head}<div class="lines"><div></div><div></div><div></div></div></section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="${escapeHtml(lang)}" dir="${escapeHtml(dir)}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(safeFileName(`${set.subject} - ${set.title}`))}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="${FONT_URL}" />
<style>
  @page { size: A4 portrait; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    color: #000;
    background: #fff;
    font-family: Vazirmatn, Nunito, Tahoma, "Segoe UI", Arial, sans-serif;
    font-size: 12pt;
    line-height: 1.9;
  }
  header { border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
  .brand { font-size: 9.5pt; color: #444; font-weight: 700; }
  h1 { font-size: 18pt; line-height: 1.5; margin: 2px 0 4px; font-weight: 900; }
  .meta { display: flex; flex-wrap: wrap; gap: 4px 18px; font-size: 10pt; color: #222; }
  .badge { border: 1.5px solid #000; border-radius: 999px; padding: 0 10px; font-weight: 700; }
  .key { font-weight: 900; }
  .student { display: grid; grid-template-columns: 2fr 1fr 1fr 0.7fr; gap: 0 14px; margin: 0 0 18px; font-size: 10.5pt; }
  .student div { border-bottom: 1px solid #000; padding-top: 4px; min-height: 9mm; }
  .student .score { border: 1.5px solid #000; border-radius: 6px; padding: 2px 8px; }
  .q { break-inside: avoid; page-break-inside: avoid; margin: 0 0 14px; }
  .qt { display: flex; gap: 8px; font-weight: 700; }
  .num { flex: none; }
  .txt { min-width: 0; overflow-wrap: anywhere; }
  .opts {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 20px;
    margin-top: 4px;
    padding-inline-start: 1.9em;
  }
  .opts.one { grid-template-columns: 1fr; }
  .opt { display: flex; gap: 6px; min-width: 0; overflow-wrap: anywhere; }
  .letter { flex: none; font-weight: 700; }
  .opt.correct { font-weight: 900; text-decoration: underline; text-underline-offset: 4px; }
  .tick { flex: none; }
  .lines { margin-top: 4px; padding-inline-start: 1.9em; }
  .lines div { height: 9mm; border-bottom: 1px solid #888; }
  .ans {
    margin-top: 4px;
    margin-inline-start: 1.9em;
    padding-inline-start: 10px;
    border-inline-start: 3px solid #000;
    font-size: 11pt;
    line-height: 1.8;
  }
  footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #999; font-size: 8.5pt; color: #555; }
  @media screen { body { max-width: 210mm; margin: 0 auto; padding: 16mm 15mm; } }
</style>
</head>
<body>
  <header>
    <div class="brand">${escapeHtml(labels.brand)}</div>
    <h1 dir="auto">${escapeHtml(set.title)}</h1>
    <div class="meta">
      <span class="badge" dir="auto">${escapeHtml(set.subject)}</span>
      <span dir="auto">${escapeHtml(labels.by)}</span>
      <span>${escapeHtml(dateText)}</span>
      <span>${escapeHtml(labels.count)}</span>
      ${withAnswers ? `<span class="key">${escapeHtml(labels.answerKey)}</span>` : ""}
    </div>
  </header>
  ${
    withAnswers
      ? ""
      : `<div class="student">
    <div>${escapeHtml(labels.studentName)}:</div>
    <div>${escapeHtml(labels.className)}:</div>
    <div>${escapeHtml(labels.date)}:</div>
    <div class="score">${escapeHtml(labels.score)}:</div>
  </div>`
  }
  <main>${questions}</main>
  <footer>${escapeHtml(labels.brand)} — ${escapeHtml(set.subject)} · ${escapeHtml(set.title)}</footer>
</body>
</html>`;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Opens the print dialog for one set.
 * @param {object} options
 * @param {object} options.set          the question-bank set
 * @param {string} options.lang         active language code
 * @param {"rtl"|"ltr"} options.dir     text direction of that language
 * @param {boolean} options.withAnswers true = answer key; false = blank exam sheet with a student name/class/date/score box
 * @param {object} options.labels       already-translated texts
 * @param {string} options.dateText     already-formatted date
 */
export async function printQuestionSet({ set, lang, dir, withAnswers, labels, dateText }) {
  const numberFormat = new Intl.NumberFormat(lang.startsWith("fa") ? "fa-IR" : lang.startsWith("ar") ? "ar-EG" : lang);
  const html = buildHtml({ set, lang, dir, withAnswers, labels, dateText, numberFormat });

  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset-inline-end:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for the page (and its fonts) so the PDF never falls back to a plain font.
  await new Promise((resolve) => {
    if (doc.readyState === "complete") resolve();
    else frame.addEventListener("load", resolve, { once: true });
  });
  try {
    await Promise.race([doc.fonts.ready, wait(3000)]);
  } catch {
    /* fonts API missing — print with what is loaded */
  }

  // Browsers use the page title as the default PDF file name.
  const previousTitle = document.title;
  document.title = doc.title;

  const cleanup = () => {
    document.title = previousTitle;
    frame.remove();
  };
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });

  frame.contentWindow.focus();
  frame.contentWindow.print();

  // Safari/mobile browsers may not fire afterprint.
  setTimeout(cleanup, 60_000);
}
