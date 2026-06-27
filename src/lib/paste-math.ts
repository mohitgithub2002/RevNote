import type { Editor } from '@tiptap/core';

interface ContentNode {
  type: string;
  content?: ContentNode[];
  text?: string;
  attrs?: Record<string, unknown>;
}

const DISPLAY_MATH_RE = /\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\[\s*\n([\s\S]*?)\n\s*\]/g;
const INLINE_MATH_RE = /\\\(([\s\S]*?)\\\)|\$([^\$\n]+?)\$|\(([^()]*[=^_\\{}][^()]*)\)/g;

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

function splitByDisplayMath(text: string): Array<{ type: 'text' | 'displayMath'; value: string }> {
  const parts: Array<{ type: 'text' | 'displayMath'; value: string }> = [];
  let lastIndex = 0;

  const regex = new RegExp(DISPLAY_MATH_RE.source, 'g');
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: 'displayMath', value: extractMatch(match, 1) });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts;
}

function parseInlineMath(text: string): ContentNode[] {
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

function isStandaloneMathLine(line: string): boolean {
  const trimmed = line.replace(/^[•\-*]\s*/, '').trim();
  const regex = new RegExp(`^(?:${INLINE_MATH_RE.source})$`);
  return regex.test(trimmed);
}

function textToParagraphs(text: string): ContentNode[] {
  const lines = text.split('\n');
  const blocks: ContentNode[] = [];
  const pendingBullets: ContentNode[] = [];

  const flushBullets = () => {
    if (pendingBullets.length === 0) return;
    blocks.push({
      type: 'bulletList',
      content: pendingBullets.splice(0),
    });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const isBulletItem = trimmed.startsWith('• ') || trimmed.startsWith('- ') || trimmed.startsWith('* ');
    const textForParsing = isBulletItem ? trimmed.replace(/^[•\-*]\s*/, '') : trimmed;

    if (isBulletItem || isStandaloneMathLine(trimmed)) {
      const bulletNodes = parseInlineMath(textForParsing);
      pendingBullets.push({
        type: 'listItem',
        content: [{
          type: 'paragraph',
          content: bulletNodes.length > 0 ? bulletNodes : [{ type: 'text', text: textForParsing }],
        }],
      });
    } else {
      flushBullets();
      const inlineNodes = parseInlineMath(trimmed);
      if (inlineNodes.length === 0) continue;
      blocks.push({
        type: 'paragraph',
        content: inlineNodes,
      });
    }
  }

  flushBullets();
  return blocks;
}

export function handleMathPaste(editor: Editor, text: string): boolean {
  if (!hasLatexPatterns(text)) return false;

  const displayParts = splitByDisplayMath(text);
  const content: ContentNode[] = [];

  for (const part of displayParts) {
    if (part.type === 'displayMath') {
      content.push({
        type: 'mathBlock',
        content: [{ type: 'text', text: part.value }],
      });
    } else {
      content.push(...textToParagraphs(part.value));
    }
  }

  if (content.length === 0) return false;

  editor.chain().focus().insertContent(content).run();
  return true;
}
