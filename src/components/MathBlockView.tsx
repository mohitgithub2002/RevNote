'use client';

import { NodeViewWrapper, NodeViewContent } from '@tiptap/react';
import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

export default function MathBlockView() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState('');
  const [showSource, setShowSource] = useState(false);

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
      <div className={`math-source ${showSource ? '' : 'math-source-collapsed'}`}>
        <div className="math-source-label">LaTeX</div>
        <NodeViewContent className="math-source-code" />
      </div>
      {rendered && (
        <div
          className="math-render"
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: rendered }}
          onDoubleClick={() => setShowSource((s) => !s)}
          title="Double-click to edit LaTeX"
        />
      )}
      {!rendered && !showSource && (
        <div
          className="math-render math-render-empty"
          contentEditable={false}
          onClick={() => setShowSource(true)}
        >
          Double-click to enter LaTeX
        </div>
      )}
    </NodeViewWrapper>
  );
}
