'use client';

import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { useMemo, useCallback, useState } from 'react';
import katex from 'katex';

export default function MathInlineView({ node, updateAttributes }: ReactNodeViewProps) {
  const latex = (node.attrs.latex as string) || '';
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(latex);

  const rendered = useMemo(() => {
    if (!latex.trim()) return '';
    try {
      return katex.renderToString(latex, {
        displayMode: false,
        throwOnError: false,
        trust: true,
      });
    } catch {
      return '';
    }
  }, [latex]);

  const handleDoubleClick = useCallback(() => {
    setEditValue(latex);
    setEditing(true);
  }, [latex]);

  const handleSave = useCallback(() => {
    updateAttributes({ latex: editValue });
    setEditing(false);
  }, [editValue, updateAttributes]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditing(false);
    }
  }, [handleSave]);

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="math-inline-wrapper math-inline-editing">
        <input
          className="math-inline-input"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" className="math-inline-wrapper" onDoubleClick={handleDoubleClick}>
      {rendered ? (
        <span
          className="math-inline-render"
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      ) : (
        <span className="math-inline-empty">{latex || 'equation'}</span>
      )}
    </NodeViewWrapper>
  );
}
