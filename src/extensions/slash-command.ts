import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: string;
  command: (props: { editor: ReturnType<typeof import('@tiptap/core').Editor.prototype.chain>; range: { from: number; to: number } }) => void;
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('slashCommand'),
        props: {
          decorations: (state) => {
            const { doc, selection } = state;
            const decorations: Decoration[] = [];
            const { $from } = selection;
            const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);

            if (textBefore === '/') {
              decorations.push(
                Decoration.widget($from.pos, () => {
                  const el = document.createElement('span');
                  el.className = 'slash-command-trigger';
                  return el;
                })
              );
            }

            return DecorationSet.create(doc, decorations);
          },
        },
      }),
    ];
  },
});
