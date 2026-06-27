import type { Editor } from '@tiptap/core';

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

const DISPLAY_MATH_RE = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\[\s*\n([\s\S]*?)\n\s*\]/g;
const INLINE_MATH_RE = /\\\(([\s\S]*?)\\\)|\$([^\$\n]+?)\$|\(([^()]*[=^_\\{}][^()]*)\)/g;
const CODE_BLOCK_RE = /```(\w*)\n([\s\S]*?)```/g;
const HEADING_RE = /^(#{1,4})\s+(.+)$/;
const DIVIDER_RE = /^(?:---+|___+|\*\*\*+)$/;
const ORDERED_LIST_RE = /^(\d+)[.)]\s+(.+)$/;
const BULLET_RE = /^[•\-*]\s+(.+)$/;
const TABLE_ROW_RE = /^\|(.+)\|$/;
const TABLE_SEPARATOR_RE = /^\|[\s:]*-{2,}[\s:]*(\|[\s:]*-{2,}[\s:]*)*\|$/;

function hasRichPatterns(text: string): boolean {
  return (
    /\\\[[\s\S]*?\\\]/.test(text) ||
    /\$\$[\s\S]*?\$\$/.test(text) ||
    /\[\s*\n[\s\S]*?\n\s*\]/.test(text) ||
    /\\\([\s\S]*?\\\)/.test(text) ||
    /\$[^\$\n]+?\$/.test(text) ||
    /\([^()]*[=^_\\{}][^()]*\)/.test(text) ||
    /^#{1,4}\s+/m.test(text) ||
    /^(?:---+|___+|\*\*\*+)$/m.test(text) ||
    /```\w*\n[\s\S]*?```/.test(text) ||
    /^\|.+\|$/m.test(text) ||
    /\*\*[^*]+\*\*/.test(text)
  );
}

function extractMatch(m: RegExpMatchArray, groupStart: number): string {
  for (let i = groupStart; i < m.length; i++) {
    if (m[i] !== undefined) return m[i].trim();
  }
  return '';
}

type Segment = { type: 'text' | 'displayMath' | 'codeBlock'; value: string; lang?: string };

function splitByBlocks(text: string): Segment[] {
  const combined = new RegExp(
    `(${CODE_BLOCK_RE.source})|(${DISPLAY_MATH_RE.source})`,
    'g'
  );

  const parts: Segment[] = [];
  let lastIndex = 0;
  let match;

  while ((match = combined.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }

    if (match[1] !== undefined) {
      parts.push({ type: 'codeBlock', value: match[3] || '', lang: match[2] || 'plaintext' });
    } else {
      const latex = match[5] || match[6] || match[7] || '';
      parts.push({ type: 'displayMath', value: latex.trim() });
    }

    lastIndex = combined.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

function parseInlineFormatting(text: string): ContentNode[] {
  const INLINE_RE = /(\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|__(.+?)__|_(.+?)_|`([^`]+?)`)/g;

  const nodes: ContentNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const before = text.slice(lastIndex, match.index);
      nodes.push(...parseInlineMathOnly(before));
    }

    if (match[2]) {
      nodes.push({ type: 'text', text: match[2], marks: [{ type: 'bold' }, { type: 'italic' }] });
    } else if (match[3]) {
      nodes.push({ type: 'text', text: match[3], marks: [{ type: 'bold' }] });
    } else if (match[4]) {
      nodes.push({ type: 'text', text: match[4], marks: [{ type: 'italic' }] });
    } else if (match[5]) {
      nodes.push({ type: 'text', text: match[5], marks: [{ type: 'bold' }] });
    } else if (match[6]) {
      nodes.push({ type: 'text', text: match[6], marks: [{ type: 'italic' }] });
    } else if (match[7]) {
      nodes.push({ type: 'text', text: match[7], marks: [{ type: 'code' }] });
    }

    lastIndex = INLINE_RE.lastIndex;
  }

  if (lastIndex < text.length) {
    const remainder = text.slice(lastIndex);
    nodes.push(...parseInlineMathOnly(remainder));
  }

  return nodes;
}

function parseInlineMathOnly(text: string): ContentNode[] {
  const nodes: ContentNode[] = [];
  let lastIndex = 0;

  const regex = new RegExp(INLINE_MATH_RE.source, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }
    const latex = extractMatch(match, 1);
    nodes.push({
      type: 'mathInline',
      attrs: { latex },
    });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return nodes;
}

function parseInlineContent(text: string): ContentNode[] {
  return parseInlineFormatting(text);
}

function isStandaloneMathLine(line: string): boolean {
  const trimmed = line.replace(/^[•\-*]\s*/, '').trim();
  const regex = new RegExp(`^(?:${INLINE_MATH_RE.source})$`);
  return regex.test(trimmed);
}

function parseTableRow(line: string): string[] {
  return line
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function parseMarkdownTable(lines: string[]): ContentNode | null {
  if (lines.length < 2) return null;

  const headerLine = lines[0];
  if (!TABLE_ROW_RE.test(headerLine.trim())) return null;

  let separatorIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (TABLE_SEPARATOR_RE.test(lines[i].trim())) {
      separatorIndex = i;
      break;
    }
  }

  const headerCells = parseTableRow(headerLine);
  const colCount = headerCells.length;

  const headerRow: ContentNode = {
    type: 'tableRow',
    content: headerCells.map((cell) => ({
      type: 'tableHeader',
      content: [{
        type: 'paragraph',
        content: parseInlineContent(cell),
      }],
    })),
  };

  const dataStartIndex = separatorIndex >= 0 ? separatorIndex + 1 : 1;
  const bodyRows: ContentNode[] = [];

  for (let i = dataStartIndex; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!TABLE_ROW_RE.test(trimmed)) break;
    const cells = parseTableRow(trimmed);

    const rowCells: ContentNode[] = [];
    for (let c = 0; c < colCount; c++) {
      const cellText = cells[c] || '';
      rowCells.push({
        type: 'tableCell',
        content: [{
          type: 'paragraph',
          content: cellText ? parseInlineContent(cellText) : [{ type: 'text', text: '' }],
        }],
      });
    }

    bodyRows.push({
      type: 'tableRow',
      content: rowCells,
    });
  }

  return {
    type: 'table',
    content: [headerRow, ...bodyRows],
  };
}

function textToParagraphs(text: string): ContentNode[] {
  const lines = text.split('\n');
  const blocks: ContentNode[] = [];
  const pendingBullets: ContentNode[] = [];
  const pendingOrdered: ContentNode[] = [];

  const flushBullets = () => {
    if (pendingBullets.length === 0) return;
    blocks.push({
      type: 'bulletList',
      content: pendingBullets.splice(0),
    });
  };

  const flushOrdered = () => {
    if (pendingOrdered.length === 0) return;
    blocks.push({
      type: 'orderedList',
      content: pendingOrdered.splice(0),
    });
  };

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (TABLE_ROW_RE.test(trimmed)) {
      flushBullets();
      flushOrdered();

      const tableLines: string[] = [];
      while (i < lines.length) {
        const tl = lines[i].trim();
        if (!tl && tableLines.length > 0) break;
        if (tl && !TABLE_ROW_RE.test(tl) && !TABLE_SEPARATOR_RE.test(tl)) break;
        if (tl) tableLines.push(tl);
        i++;
      }

      const table = parseMarkdownTable(tableLines);
      if (table) {
        blocks.push(table);
      }
      continue;
    }

    if (DIVIDER_RE.test(trimmed)) {
      flushBullets();
      flushOrdered();
      blocks.push({ type: 'horizontalRule' });
      i++;
      continue;
    }

    const headingMatch = trimmed.match(HEADING_RE);
    if (headingMatch) {
      flushBullets();
      flushOrdered();
      const level = headingMatch[1].length;
      const headingContent = parseInlineContent(headingMatch[2]);
      blocks.push({
        type: 'heading',
        attrs: { level },
        content: headingContent,
      });
      i++;
      continue;
    }

    const orderedMatch = trimmed.match(ORDERED_LIST_RE);
    if (orderedMatch) {
      flushBullets();
      const itemContent = parseInlineContent(orderedMatch[2]);
      pendingOrdered.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: itemContent,
        }],
      });
      i++;
      continue;
    }

    const bulletMatch = trimmed.match(BULLET_RE);
    if (bulletMatch || isStandaloneMathLine(trimmed)) {
      flushOrdered();
      const textForParsing = bulletMatch ? bulletMatch[1] : trimmed;
      const itemContent = parseInlineContent(textForParsing);
      pendingBullets.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: itemContent.length > 0 ? itemContent : [{ type: 'text', text: textForParsing }],
        }],
      });
      i++;
      continue;
    }

    const blockquoteMatch = trimmed.match(/^>\s*(.*)$/);
    if (blockquoteMatch) {
      flushBullets();
      flushOrdered();
      const quoteContent = parseInlineContent(blockquoteMatch[1]);
      blocks.push({
        type: 'blockquote',
        content: [{
          type: 'paragraph',
          content: quoteContent.length > 0 ? quoteContent : undefined,
        }],
      });
      i++;
      continue;
    }

    flushBullets();
    flushOrdered();
    const inlineNodes = parseInlineContent(trimmed);
    if (inlineNodes.length > 0) {
      blocks.push({
        type: 'paragraph',
        content: inlineNodes,
      });
    }
    i++;
  }

  flushBullets();
  flushOrdered();
  return blocks;
}

export function handleRichPaste(editor: Editor, text: string): boolean {
  if (!hasRichPatterns(text)) return false;

  const segments = splitByBlocks(text);
  const content: ContentNode[] = [];

  for (const seg of segments) {
    if (seg.type === 'displayMath') {
      content.push({
        type: 'mathBlock',
        content: [{ type: 'text', text: seg.value }],
      });
    } else if (seg.type === 'codeBlock') {
      content.push({
        type: 'codeBlock',
        attrs: { language: seg.lang || 'plaintext' },
        content: [{ type: 'text', text: seg.value }],
      });
    } else {
      content.push(...textToParagraphs(seg.value));
    }
  }

  if (content.length === 0) return false;

  editor.chain().focus().insertContent(content).run();
  return true;
}

export { handleRichPaste as handleMathPaste };
