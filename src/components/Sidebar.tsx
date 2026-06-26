'use client';

import { Page, PageStore } from '@/types';
import { useState } from 'react';

interface SidebarProps {
  store: PageStore;
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onDeletePage: (id: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

function PageTreeItem({
  page,
  store,
  depth,
  currentPageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
}: {
  page: Page;
  store: PageStore;
  depth: number;
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onDeletePage: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = page.children.length > 0;
  const isActive = currentPageId === page.id;

  return (
    <div className="page-tree-item">
      <button
        className={`page-tree-button ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={() => onSelectPage(page.id)}
      >
        <span
          className={`page-tree-toggle ${hasChildren ? 'has-children' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(!expanded);
          }}
        >
          {hasChildren && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`toggle-arrow ${expanded ? 'expanded' : ''}`}
            >
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="page-tree-icon">{page.icon}</span>
        <span className="page-tree-title">{page.title || 'Untitled'}</span>
        <span className="page-tree-actions">
          <span
            role="button"
            tabIndex={0}
            className="page-action-btn"
            onClick={(e) => {
              e.stopPropagation();
              onCreatePage(page.id);
            }}
            title="Add sub-page"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span
            role="button"
            tabIndex={0}
            className="page-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePage(page.id);
            }}
            title="Delete page"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3.5H11M5.5 6V10M8.5 6V10M4 3.5L4.5 11.5H9.5L10 3.5M5.5 3.5V2H8.5V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>
      {expanded && hasChildren && (
        <div className="page-tree-children">
          {page.children.map((childId) => {
            const child = store.pages[childId];
            if (!child) return null;
            return (
              <PageTreeItem
                key={childId}
                page={child}
                store={store}
                depth={depth + 1}
                currentPageId={currentPageId}
                onSelectPage={onSelectPage}
                onCreatePage={onCreatePage}
                onDeletePage={onDeletePage}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  store,
  currentPageId,
  onSelectPage,
  onCreatePage,
  onDeletePage,
  collapsed,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <>
            <div className="sidebar-brand">
              <div className="brand-icon">R</div>
              <span className="brand-name">RevNote</span>
            </div>
          </>
        )}
        <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? 'Expand' : 'Collapse'}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            {collapsed ? (
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span>Pages</span>
              <button
                className="new-page-btn"
                onClick={() => onCreatePage(null)}
                title="New page"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="page-tree">
              {store.rootPageIds.map((id) => {
                const page = store.pages[id];
                if (!page) return null;
                return (
                  <PageTreeItem
                    key={id}
                    page={page}
                    store={store}
                    depth={0}
                    currentPageId={currentPageId}
                    onSelectPage={onSelectPage}
                    onCreatePage={onCreatePage}
                    onDeletePage={onDeletePage}
                  />
                );
              })}
              {store.rootPageIds.length === 0 && (
                <div className="empty-pages">
                  <p>No pages yet</p>
                  <button className="create-first-btn" onClick={() => onCreatePage(null)}>
                    Create your first page
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </aside>
  );
}
