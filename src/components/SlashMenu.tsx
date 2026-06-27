'use client';

import { useEffect, useRef, useState } from 'react';

interface SlashMenuItem {
  title: string;
  description: string;
  icon: string;
  category: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  command: (editor: any) => void;
}

const SLASH_ITEMS: SlashMenuItem[] = [
  {
    title: 'Text',
    description: 'Plain text block',
    icon: 'Aa',
    category: 'Basic',
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: 'Heading 1',
    description: 'Large section heading',
    icon: 'H1',
    category: 'Basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading',
    icon: 'H2',
    category: 'Basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: 'Heading 3',
    description: 'Small section heading',
    icon: 'H3',
    category: 'Basic',
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    icon: '•',
    category: 'Lists',
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    icon: '1.',
    category: 'Lists',
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: 'Task List',
    description: 'Checklist with checkboxes',
    icon: '☑',
    category: 'Lists',
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: 'Code Block',
    description: 'Syntax highlighted code',
    icon: '</>',
    category: 'Advanced',
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: 'Math Block',
    description: 'LaTeX equation block',
    icon: '∑',
    category: 'Advanced',
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mathBlock',
          content: [{ type: 'text', text: 'E = mc^2' }],
        })
        .run(),
  },
  {
    title: 'Inline Math',
    description: 'Inline LaTeX equation',
    icon: 'π',
    category: 'Advanced',
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mathInline',
          attrs: { latex: 'x^2' },
        })
        .run(),
  },
  {
    title: 'Table',
    description: 'Insert a table',
    icon: '▦',
    category: 'Advanced',
    command: (editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run(),
  },
  {
    title: 'Blockquote',
    description: 'Quote or callout',
    icon: '"',
    category: 'Basic',
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    icon: '—',
    category: 'Basic',
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
];

interface SlashMenuProps {
  position: { top: number; left: number };
  query: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (command: (editor: any) => void) => void;
  onClose: () => void;
}

export default function SlashMenu({ position, query, onSelect, onClose }: SlashMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = SLASH_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filtered[selectedIndex]) {
          onSelect(filtered[selectedIndex].command);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [filtered, selectedIndex, onSelect, onClose]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  if (filtered.length === 0) return null;

  const categories = [...new Set(filtered.map((i) => i.category))];

  return (
    <div
      ref={menuRef}
      className="slash-menu"
      style={{ top: position.top, left: position.left }}
    >
      {categories.map((category) => (
        <div key={category}>
          <div className="slash-menu-category">{category}</div>
          {filtered
            .filter((item) => item.category === category)
            .map((item) => {
              const globalIndex = filtered.indexOf(item);
              return (
                <button
                  key={item.title}
                  className={`slash-menu-item ${globalIndex === selectedIndex ? 'selected' : ''}`}
                  onClick={() => onSelect(item.command)}
                  onMouseEnter={() => setSelectedIndex(globalIndex)}
                >
                  <span className="slash-menu-icon">{item.icon}</span>
                  <div className="slash-menu-text">
                    <span className="slash-menu-title">{item.title}</span>
                    <span className="slash-menu-desc">{item.description}</span>
                  </div>
                </button>
              );
            })}
        </div>
      ))}
    </div>
  );
}
