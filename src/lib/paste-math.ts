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

function hasLatexPatterns(text: string): boolean {
  return (
    /\\\[[\s\S]*?\\\]/.test(text) ||
    /\$\$[\s\S]*?\$\$/.test(text) ||
    /\[\s*\n[\s\S]*?\n\s*\]/.test(text) ||
    /\\\([\s\S]*?\\\)/.test(text) ||
    /\$[^\$\n]+?\$/.test(text) ||
    /\([^()]*[=^_\\{}][^()]*\)/.test(text)
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

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (DIVIDER_RE.test(trimmed)) {
      flushBullets();
      flushOrdered();
      blocks.push({ type: 'horizontalRule' });
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
      continue;
    }

    flushBullets();
    flushOrdered();
    const inlineNodes = parseInlineContent(trimmed);
    if (inlineNodes.length === 0) continue;
    blocks.push({
      type: 'paragraph',
      content: inlineNodes,
    });
  }

  flushBullets();
  flushOrdered();
  return blocks;
}

export function handleMathPaste(editor: Editor, text: string): boolean {
  if (!hasLatexPatterns(text)) return false;

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
