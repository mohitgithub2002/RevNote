'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

export default function MathBlockView() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState('');

  useEffect(() => {
    const update = () => {
      const el = wrapperRef.current;
      if (!el) return;
      const contentEl = el.querySelector('[data-node-view-content]');
      const latex = (contentEl || el).textContent || '';
      if (!latex.trim()) {
        setRendered('');
        return;
      }
      try {
        setRendered(
          katex.renderToString(latex, {
            displayMode: true,
            throwOnError: false,
            trust: true,
          })
        );
      } catch {
        setRendered('');
      }
    };

    update();
    const observer = new MutationObserver(update);
    if (wrapperRef.current) {
      observer.observe(wrapperRef.current, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }
    return () => observer.disconnect();
  }, []);

  return (
    <NodeViewWrapper className="math-block-wrapper" ref={wrapperRef}>
      <div className="math-source">
        <div className="math-source-label">LaTeX</div>
        <NodeViewContent className="math-source-code" />
      </div>
      {rendered && (
        <div
          className="math-render"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      )}
    </NodeViewWrapper>
  );
}
