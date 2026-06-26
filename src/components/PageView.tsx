'use client';

import { Page, PageStore } from '@/types';
import Editor from './Editor';
import { useState, useRef, useEffect } from 'react';

interface PageViewProps {
  page: Page;
  store: PageStore;
  breadcrumbs: Page[];
  onUpdatePage: (id: string, updates: Partial<Pick<Page, 'title' | 'content' | 'icon'>>) => void;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
}

const ICONS = ['📄', '📝', '📋', '📑', '🗒️', '💡', '🎯', '📌', '🔖', '✨', '🚀', '💎', '🔥', '⚡', '🌟', '🎨', '📊', '🔬', '📐', '🧮', '💻', '📚', '🎵', '🌍'];

export default function PageView({ page, store, breadcrumbs, onUpdatePage, onSelectPage, onCreatePage }: PageViewProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const titleRef = useRef<HTMLInputElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleValue(page.title);
  }, [page.id, page.title]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTitleChange = (value: string) => {
    setTitleValue(value);
    onUpdatePage(page.id, { title: value });
  };

  const children = page.children
    .map((id) => store.pages[id])
    .filter(Boolean);

  const updatedAt = new Date(page.updatedAt);
  const timeStr = updatedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="page-view">
      <div className="page-topbar">
        <div className="breadcrumbs">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.id} className="breadcrumb-item">
              {i > 0 && <span className="breadcrumb-sep">/</span>}
              <button
                className={`breadcrumb-link ${crumb.id === page.id ? 'current' : ''}`}
                onClick={() => onSelectPage(crumb.id)}
              >
                <span className="breadcrumb-icon">{crumb.icon}</span>
                {crumb.title || 'Untitled'}
              </button>
            </span>
          ))}
        </div>
        <div className="page-meta">
          <span className="page-updated">Last edited {timeStr}</span>
        </div>
      </div>

      <div className="page-content">
        <div className="page-header">
          <div className="page-icon-wrapper" ref={iconPickerRef}>
            <button
              className="page-icon-btn"
              onClick={() => setShowIconPicker(!showIconPicker)}
            >
              {page.icon}
            </button>
            {showIconPicker && (
              <div className="icon-picker">
                {ICONS.map((icon) => (
                  <button
                    key={icon}
                    className="icon-option"
                    onClick={() => {
                      onUpdatePage(page.id, { icon });
                      setShowIconPicker(false);
                    }}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            ref={titleRef}
            className="page-title-input"
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Untitled"
            spellCheck={false}
          />
        </div>

        <Editor
          key={page.id}
          content={page.content}
          onUpdate={(content) => onUpdatePage(page.id, { content })}
        />

        {children.length > 0 && (
          <div className="sub-pages">
            <h3 className="sub-pages-header">Sub-pages</h3>
            <div className="sub-pages-grid">
              {children.map((child) => (
                <button
                  key={child.id}
                  className="sub-page-card"
                  onClick={() => onSelectPage(child.id)}
                >
                  <span className="sub-page-icon">{child.icon}</span>
                  <span className="sub-page-title">{child.title || 'Untitled'}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="add-subpage-area">
          <button
            className="add-subpage-btn"
            onClick={() => onCreatePage(page.id)}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Add a sub-page
          </button>
        </div>
      </div>
    </div>
  );
}
