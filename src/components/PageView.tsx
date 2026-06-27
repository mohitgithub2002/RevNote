'use client';

import { Page, PageStore } from '@/types';
import Editor from './Editor';
import { useState, useRef, useEffect } from 'react';
import { apiToggleShare } from '@/lib/api';

interface PageViewProps {
  page: Page;
  store: PageStore;
  breadcrumbs: Page[];
  onUpdatePage: (id: string, updates: Partial<Pick<Page, 'title' | 'content' | 'icon'>>) => void;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onShareUpdate: (id: string, isPublic: boolean, shareToken: string | null) => void;
}

const ICONS = ['📄', '📝', '📋', '📑', '🗒️', '💡', '🎯', '📌', '🔖', '✨', '🚀', '💎', '🔥', '⚡', '🌟', '🎨', '📊', '🔬', '📐', '🧮', '💻', '📚', '🎵', '🌍'];

export default function PageView({ page, store, breadcrumbs, onUpdatePage, onSelectPage, onCreatePage, onShareUpdate }: PageViewProps) {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [titleValue, setTitleValue] = useState(page.title);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareLoading, setShareLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const iconPickerRef = useRef<HTMLDivElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleValue(page.title);
  }, [page.id, page.title]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [titleValue]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (iconPickerRef.current && !iconPickerRef.current.contains(e.target as Node)) {
        setShowIconPicker(false);
      }
      if (shareMenuRef.current && !shareMenuRef.current.contains(e.target as Node)) {
        setShowShareMenu(false);
        setCopied(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleTitleChange = (value: string) => {
    setTitleValue(value);
    onUpdatePage(page.id, { title: value });
  };

  const handleToggleShare = async () => {
    setShareLoading(true);
    try {
      const result = await apiToggleShare(page.id, !page.isPublic);
      onShareUpdate(page.id, result.isPublic, result.shareToken);
    } catch (err) {
      console.error('Failed to toggle sharing:', err);
    }
    setShareLoading(false);
  };

  const handleCopyLink = () => {
    if (page.shareToken) {
      const url = `${window.location.origin}/share/${page.shareToken}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
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
        <div className="page-topbar-actions">
          <div className="share-wrapper" ref={shareMenuRef}>
            <button
              className={`share-btn ${page.isPublic ? 'shared' : ''}`}
              onClick={() => setShowShareMenu(!showShareMenu)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 9.5L10 6.5M6 6.5L10 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="4" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="12" cy="11" r="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Share
            </button>
            {showShareMenu && (
              <div className="share-menu">
                <div className="share-menu-header">
                  <h4>Share this page</h4>
                  <p>Anyone with the link can view this page</p>
                </div>
                <div className="share-menu-toggle">
                  <span>Public access</span>
                  <button
                    className={`toggle-switch ${page.isPublic ? 'on' : ''}`}
                    onClick={handleToggleShare}
                    disabled={shareLoading}
                  >
                    <span className="toggle-knob" />
                  </button>
                </div>
                {page.isPublic && page.shareToken && (
                  <div className="share-menu-link">
                    <input
                      className="share-link-input"
                      value={`${typeof window !== 'undefined' ? window.location.origin : ''}/share/${page.shareToken}`}
                      readOnly
                      onClick={(e) => (e.target as HTMLInputElement).select()}
                    />
                    <button className="share-copy-btn" onClick={handleCopyLink}>
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="page-meta">
            <span className="page-updated">{timeStr}</span>
          </div>
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
          <textarea
            ref={titleRef}
            className="page-title-input"
            value={titleValue}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            placeholder="Untitled"
            spellCheck={false}
            rows={1}
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
