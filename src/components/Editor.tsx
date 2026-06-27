'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import { TextStyle } from '@tiptap/extension-text-style';
import { all, createLowlight } from 'lowlight';
import { useCallback, useEffect, useRef, useState } from 'react';
import { MathBlock } from '@/extensions/math-block';
import { MathInline } from '@/extensions/math-inline';
import { SlashCommand } from '@/extensions/slash-command';
import { handleMathPaste } from '@/lib/paste-math';
import SlashMenu from './SlashMenu';
import FloatingToolbar from './FloatingToolbar';

const lowlight = createLowlight(all);

interface EditorProps {
  content: string;
  onUpdate: (content: string) => void;
  placeholder?: string;
}

export default function Editor({ content, onUpdate, placeholder }: EditorProps) {
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);
  const [slashMenuPos, setSlashMenuPos] = useState({ top: 0, left: 0 });
  const [slashQuery, setSlashQuery] = useState('');
  const slashRange = useRef<{ from: number; to: number } | null>(null);
  const editorRef = useRef<ReturnType<typeof useEditor>>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3, 4] },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Type \'/\' for commands...',
        showOnlyWhenEditable: true,
        showOnlyCurrent: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'plaintext',
      }),
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Link.configure({ openOnClick: false }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Typography,
      TextStyle,
      MathBlock,
      MathInline,
      SlashCommand,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'revnote-editor',
      },
      handlePaste: (_view, event) => {
        const text = event.clipboardData?.getData('text/plain');
        if (text && editorRef.current) {
          const handled = handleMathPaste(editorRef.current, text);
          if (handled) return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate(editor.getHTML());
    },
    immediatelyRender: false,
  });

  editorRef.current = editor;

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!editor) return;
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

      if (e.key === '/' && textBefore === '') {
        setTimeout(() => {
          const coords = editor.view.coordsAtPos($from.pos);
          setSlashMenuPos({ top: coords.bottom + 8, left: coords.left });
          setSlashMenuOpen(true);
          setSlashQuery('');
          slashRange.current = { from: $from.pos, to: $from.pos + 1 };
        }, 10);
      } else if (slashMenuOpen) {
        if (e.key === 'Escape') {
          setSlashMenuOpen(false);
        } else if (e.key === 'Backspace') {
          const currentText = $from.parent.textContent.slice(0, $from.parentOffset);
          if (!currentText.startsWith('/')) {
            setSlashMenuOpen(false);
          } else {
            setSlashQuery(currentText.slice(1, -1));
          }
        } else if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) {
          setSlashQuery((prev) => prev + e.key);
        }
      }
    },
    [editor, slashMenuOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSlashCommand = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (command: (editor: any) => void) => {
      if (!editor) return;
      const { state } = editor;
      const { $from } = state.selection;
      const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
      const slashIndex = textBefore.lastIndexOf('/');
      if (slashIndex >= 0) {
        const start = $from.pos - (textBefore.length - slashIndex);
        const end = $from.pos;
        editor.chain().focus().deleteRange({ from: start, to: end }).run();
      }
      command(editor);
      setSlashMenuOpen(false);
    },
    [editor]
  );

  if (!editor) return null;

  return (
    <div className="editor-wrapper">
      <FloatingToolbar editor={editor} />
      <EditorContent editor={editor} />
      {slashMenuOpen && (
        <SlashMenu
          position={slashMenuPos}
          query={slashQuery}
          onSelect={handleSlashCommand}
          onClose={() => setSlashMenuOpen(false)}
        />
      )}
    </div>
  );
}
