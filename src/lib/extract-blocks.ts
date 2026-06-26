import { parse, HTMLElement } from 'node-html-parser';
import type { BlockType } from '@/db/schema';

export interface ExtractedBlock {
  type: BlockType;
  content: string;   // plain text
  html: string;      // original HTML fragment
  position: number;
  metadata: Record<string, unknown>;
}

/**
 * Parses TipTap HTML into discrete, semantically typed blocks.
 *
 * Each block is an independent retrieval unit — ideal for embedding and
 * chunk-level vector search. The output is deterministic: re-saving the same
 * HTML always produces the same blocks (safe to delete-and-replace on update).
 */
export function extractBlocks(html: string): ExtractedBlock[] {
  if (!html.trim()) return [];

  const root = parse(html);
  const blocks: ExtractedBlock[] = [];
  let pos = 0;

  function text(node: HTMLElement): string {
    return node.textContent.replace(/\s+/g, ' ').trim();
  }

  function push(
    type: BlockType,
    node: HTMLElement,
    metadata: Record<string, unknown> = {}
  ) {
    const content = text(node);
    if (!content) return;
    blocks.push({ type, content, html: node.outerHTML, position: pos++, metadata });
  }

  function processNode(node: HTMLElement) {
    const tag = node.tagName?.toLowerCase();

    if (!tag) return;

    // ── Headings ────────────────────────────────────────────────────────────
    if (/^h[1-4]$/.test(tag)) {
      const level = parseInt(tag[1], 10);
      push('heading', node, { level });
      return;
    }

    // ── Paragraph ───────────────────────────────────────────────────────────
    if (tag === 'p') {
      push('paragraph', node);
      return;
    }

    // ── Blockquote ──────────────────────────────────────────────────────────
    if (tag === 'blockquote') {
      push('blockquote', node);
      return;
    }

    // ── Code block (pre > code) ──────────────────────────────────────────────
    if (tag === 'pre') {
      const codeEl = node.querySelector('code');
      // lowlight sets data-language via the parent <code class="language-xxx">
      const langAttr = codeEl?.getAttribute('class') || '';
      const langMatch = langAttr.match(/language-(\S+)/);
      const language = langMatch ? langMatch[1] : 'plaintext';
      blocks.push({
        type: 'code',
        content: codeEl?.textContent ?? text(node),
        html: node.outerHTML,
        position: pos++,
        metadata: { language },
      });
      return;
    }

    // ── Math block (TipTap custom node) ────────────────────────────────────
    if (
      node.getAttribute('data-type') === 'math-block' ||
      node.classList.contains('math-block-wrapper')
    ) {
      const latex = text(node);
      blocks.push({
        type: 'math',
        content: latex,
        html: node.outerHTML,
        position: pos++,
        metadata: { latex },
      });
      return;
    }

    // ── Bullet list ─────────────────────────────────────────────────────────
    if (tag === 'ul' && node.getAttribute('data-type') !== 'taskList') {
      node.querySelectorAll('li').forEach((li) => {
        push('bullet_item', li);
      });
      return;
    }

    // ── Task list ───────────────────────────────────────────────────────────
    if (node.getAttribute('data-type') === 'taskList') {
      node.querySelectorAll('li').forEach((li) => {
        const checked = li.getAttribute('data-checked') === 'true';
        const content = text(li);
        if (!content) return;
        blocks.push({
          type: 'task_item',
          content,
          html: li.outerHTML,
          position: pos++,
          metadata: { checked },
        });
      });
      return;
    }

    // ── Ordered list ────────────────────────────────────────────────────────
    if (tag === 'ol') {
      node.querySelectorAll('li').forEach((li, i) => {
        const content = text(li);
        if (!content) return;
        blocks.push({
          type: 'ordered_item',
          content,
          html: li.outerHTML,
          position: pos++,
          metadata: { index: i + 1 },
        });
      });
      return;
    }

    // ── Table cells ─────────────────────────────────────────────────────────
    if (tag === 'table') {
      node.querySelectorAll('td, th').forEach((cell) => {
        push('table_cell', cell, { isHeader: cell.tagName.toLowerCase() === 'th' });
      });
      return;
    }

    // ── Recurse into unknown containers ─────────────────────────────────────
    node.childNodes.forEach((child) => {
      if (child instanceof HTMLElement) processNode(child);
    });
  }

  root.childNodes.forEach((child) => {
    if (child instanceof HTMLElement) processNode(child);
  });

  return blocks;
}

/** Strips all HTML tags to get searchable plain text for the whole page. */
export function htmlToPlainText(html: string): string {
  if (!html.trim()) return '';
  const root = parse(html);
  return root.textContent.replace(/\s+/g, ' ').trim();
}
