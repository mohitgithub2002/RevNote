'use client';

import { Editor } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';

interface FloatingToolbarProps {
  editor: Editor;
}

export default function FloatingToolbar({ editor }: FloatingToolbarProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateToolbar = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || from === to) {
        setVisible(false);
        return;
      }

      const coords = editor.view.coordsAtPos(from);
      const endCoords = editor.view.coordsAtPos(to);
      const centerX = (coords.left + endCoords.left) / 2;
      const topY = Math.min(coords.top, endCoords.top);

      setPosition({
        top: topY - 48,
        left: Math.max(centerX - 140, 8),
      });
      setVisible(true);
    };

    editor.on('selectionUpdate', updateToolbar);
    editor.on('blur', () => {
      setTimeout(() => setVisible(false), 150);
    });

    return () => {
      editor.off('selectionUpdate', updateToolbar);
    };
  }, [editor]);

  if (!visible) return null;

  return (
    <div
      ref={toolbarRef}
      className="bubble-menu"
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 50,
      }}
    >
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'is-active' : ''}
        title="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'is-active' : ''}
        title="Italic"
      >
        <em>I</em>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={editor.isActive('underline') ? 'is-active' : ''}
        title="Underline"
      >
        <span style={{ textDecoration: 'underline' }}>U</span>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className={editor.isActive('strike') ? 'is-active' : ''}
        title="Strikethrough"
      >
        <s>S</s>
      </button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={editor.isActive('code') ? 'is-active' : ''}
        title="Code"
      >
        {'</>'}
      </button>
      <div className="bubble-divider" />
      <button
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        className={editor.isActive('highlight') ? 'is-active' : ''}
        title="Highlight"
      >
        <span className="highlight-icon">H</span>
      </button>
      <button
        onClick={() => {
          const url = window.prompt('Enter URL');
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}
        className={editor.isActive('link') ? 'is-active' : ''}
        title="Link"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M6 8L8 6M5 9L3.5 10.5C2.67 11.33 2.67 12.67 3.5 13.5C4.33 14.33 5.67 14.33 6.5 13.5L8 12M8 5L9.5 3.5C10.33 2.67 11.67 2.67 12.5 3.5C13.33 4.33 13.33 5.67 12.5 6.5L11 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
