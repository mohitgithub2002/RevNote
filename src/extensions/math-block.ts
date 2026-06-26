import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import MathBlockView from '@/components/MathBlockView';

export const MathBlock = Node.create({
  name: 'mathBlock',
  group: 'block',
  content: 'text*',
  marks: '',
  code: true,
  defining: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="math-block"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'math-block' }), ['code', 0]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathBlockView);
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-m': () => this.editor.commands.toggleNode(this.name, 'paragraph'),
    };
  },
});
