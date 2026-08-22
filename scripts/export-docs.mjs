import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Converts basic Markdown syntax to clean HTML.
 * Supports headings, bold, italic, code blocks, inline code, blockquotes,
 * unordered and ordered lists, links, horizontal rules, and tables.
 */
function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  const htmlLines = [];
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockContent = [];
  let inList = false;
  let listType = ''; // 'ul' or 'ol'
  let inTable = false;

  const escapeHtml = str =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const formatInline = text => {
    return (
      text
        // inline code
        .replace(/`([^`]+)`/g, (_, code) => `<code>${escapeHtml(code)}</code>`)
        // bold + italic
        .replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/___([^_]+)___/g, '<strong><em>$1</em></strong>')
        // bold
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/__([^_]+)__/g, '<strong>$1</strong>')
        // italic
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        .replace(/_([^_]+)_/g, '<em>$1</em>')
        // links
        .replace(
          /\[([^\]]+)\]\(([^)]+)\)/g,
          '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
        )
    );
  };

  const closeListIfOpen = () => {
    if (inList) {
      htmlLines.push(`</${listType}>`);
      inList = false;
      listType = '';
    }
  };

  const closeTableIfOpen = () => {
    if (inTable) {
      htmlLines.push('</tbody></table></div>');
      inTable = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle fenced code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        htmlLines.push(
          `<pre><code class="language-${codeBlockLang}">${escapeHtml(codeBlockContent.join('\n'))}</code></pre>`,
        );
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockContent = [];
      } else {
        closeListIfOpen();
        closeTableIfOpen();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockContent = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Horizontal rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      closeListIfOpen();
      closeTableIfOpen();
      htmlLines.push('<hr />');
      continue;
    }

    // Table detection (lines with |)
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      closeListIfOpen();
      const cells = line
        .trim()
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // Check if it's separator line (e.g. |---|---|)
      const isSeparator = cells.every(c => /^[-:]+$/.test(c));

      if (!inTable) {
        inTable = true;
        htmlLines.push('<div class="table-container"><table><thead><tr>');
        cells.forEach(cell => {
          htmlLines.push(`<th>${formatInline(cell)}</th>`);
        });
        htmlLines.push('</tr></thead><tbody>');
        continue;
      } else if (isSeparator) {
        continue;
      } else {
        htmlLines.push('<tr>');
        cells.forEach(cell => {
          htmlLines.push(`<td>${formatInline(cell)}</td>`);
        });
        htmlLines.push('</tr>');
        continue;
      }
    } else {
      closeTableIfOpen();
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      closeListIfOpen();
      const level = headingMatch[1].length;
      const text = headingMatch[2].trim();
      const id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      htmlLines.push(`<h${level} id="${id}">${formatInline(text)}</h${level}>`);
      continue;
    }

    // Blockquote
    if (line.startsWith('>')) {
      closeListIfOpen();
      const text = line.replace(/^>\s?/, '');
      htmlLines.push(`<blockquote><p>${formatInline(text)}</p></blockquote>`);
      continue;
    }

    // Unordered List
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        closeListIfOpen();
        inList = true;
        listType = 'ul';
        htmlLines.push('<ul>');
      }
      htmlLines.push(`<li>${formatInline(ulMatch[2])}</li>`);
      continue;
    }

    // Ordered List
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        closeListIfOpen();
        inList = true;
        listType = 'ol';
        htmlLines.push('<ol>');
      }
      htmlLines.push(`<li>${formatInline(olMatch[2])}</li>`);
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      closeListIfOpen();
      continue;
    }

    // Standard paragraph
    closeListIfOpen();
    htmlLines.push(`<p>${formatInline(line)}</p>`);
  }

  closeListIfOpen();
  closeTableIfOpen();

  return htmlLines.join('\n');
}

/**
 * Wraps HTML content into a standalone, styled document.
 */
function wrapInHtmlDocument(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    :root {
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      --font-mono: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      --bg-color: #ffffff;
      --text-color: #1f2937;
      --text-muted: #4b5563;
      --primary-color: #2563eb;
      --border-color: #e5e7eb;
      --card-bg: #f9fafb;
      --code-bg: #f3f4f6;
      --header-border: #e5e7eb;
      --table-header: #f8fafc;
      --table-row-alt: #fcfdfe;
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-color: #0f172a;
        --text-color: #f1f5f9;
        --text-muted: #94a3b8;
        --primary-color: #38bdf8;
        --border-color: #334155;
        --card-bg: #1e293b;
        --code-bg: #1e293b;
        --header-border: #334155;
        --table-header: #1e293b;
        --table-row-alt: #0f172a;
      }
    }

    * {
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-sans);
      line-height: 1.65;
      color: var(--text-color);
      background-color: var(--bg-color);
      margin: 0;
      padding: 2.5rem 1.5rem;
    }

    .container {
      max-width: 900px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    h1, h2, h3, h4, h5, h6 {
      color: var(--text-color);
      font-weight: 700;
      line-height: 1.3;
      margin-top: 2rem;
      margin-bottom: 0.75rem;
    }

    h1 {
      font-size: 2.25rem;
      border-bottom: 2px solid var(--header-border);
      padding-bottom: 0.5rem;
      margin-top: 0;
    }

    h2 {
      font-size: 1.65rem;
      border-bottom: 1px solid var(--header-border);
      padding-bottom: 0.4rem;
      margin-top: 2.25rem;
    }

    h3 {
      font-size: 1.3rem;
      margin-top: 1.75rem;
    }

    h4 {
      font-size: 1.1rem;
      margin-top: 1.25rem;
    }

    p {
      margin-top: 0;
      margin-bottom: 1rem;
    }

    a {
      color: var(--primary-color);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    code {
      font-family: var(--font-mono);
      font-size: 0.88em;
      background-color: var(--code-bg);
      padding: 0.2em 0.4em;
      border-radius: 4px;
      border: 1px solid var(--border-color);
    }

    pre {
      background-color: var(--card-bg);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      overflow-x: auto;
      margin: 1.25rem 0;
    }

    pre code {
      background-color: transparent;
      padding: 0;
      border: none;
      font-size: 0.9em;
      line-height: 1.5;
    }

    ul, ol {
      margin-top: 0;
      margin-bottom: 1.25rem;
      padding-left: 1.75rem;
    }

    li {
      margin-bottom: 0.35rem;
    }

    blockquote {
      margin: 1.25rem 0;
      padding: 0.75rem 1.25rem;
      border-left: 4px solid var(--primary-color);
      background-color: var(--card-bg);
      border-radius: 0 6px 6px 0;
      color: var(--text-muted);
    }

    blockquote p {
      margin: 0;
    }

    hr {
      border: 0;
      height: 1px;
      background-color: var(--border-color);
      margin: 2.5rem 0;
    }

    .table-container {
      overflow-x: auto;
      margin: 1.5rem 0;
      border: 1px solid var(--border-color);
      border-radius: 8px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.95rem;
    }

    th, td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    th {
      background-color: var(--table-header);
      font-weight: 600;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:nth-child(even) {
      background-color: var(--table-row-alt);
    }

    .actions-bar {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--border-color);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      background-color: var(--card-bg);
      color: var(--text-color);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      padding: 0.4rem 0.8rem;
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
    }

    .btn:hover {
      background-color: var(--code-bg);
      text-decoration: none;
    }

    @media print {
      body {
        padding: 0;
        background: white;
        color: black;
      }
      .actions-bar {
        display: none;
      }
      .container {
        max-width: 100%;
        padding: 0;
      }
      a {
        color: black;
        text-decoration: underline;
      }
      pre, blockquote, .table-container {
        page-break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="actions-bar">
      <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
    </div>
    ${bodyHtml}
  </div>
</body>
</html>`;
}

function exportDocs(inputFile = 'README.md', outputHtmlFile = 'README.html') {
  const inputPath = resolve(process.cwd(), inputFile);
  const outputPath = resolve(process.cwd(), outputHtmlFile);

  if (!existsSync(inputPath)) {
    console.error(`Error: Source file "${inputPath}" not found.`);
    process.exit(1);
  }

  console.log(
    `Converting ${inputFile} to standalone readable HTML documentation...`,
  );
  const markdown = readFileSync(inputPath, 'utf-8');
  const bodyHtml = markdownToHtml(markdown);
  const fullHtml = wrapInHtmlDocument(
    'Adopt an Inmate - Documentation',
    bodyHtml,
  );

  writeFileSync(outputPath, fullHtml, 'utf-8');
  console.log(`Successfully exported documentation to "${outputPath}".`);
}

const args = process.argv.slice(2);
const inputFile = args[0] || 'README.md';
const outputFile = args[1] || 'README.html';

exportDocs(inputFile, outputFile);
