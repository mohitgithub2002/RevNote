'use client';

import { useCallback, useEffect, useState } from 'react';
import { PageStore } from '@/types';
import {
  getAllPages,
  createPage,
  updatePage,
  deletePage,
  getPageBreadcrumbs,
} from '@/lib/storage';
import Sidebar from '@/components/Sidebar';
import PageView from '@/components/PageView';

export default function Home() {
  const [store, setStore] = useState<PageStore>({ pages: {}, rootPageIds: [] });
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const s = getAllPages();
    setStore(s);
    const lastPage = localStorage.getItem('revnote-last-page');
    if (lastPage && s.pages[lastPage]) {
      setCurrentPageId(lastPage);
    } else if (s.rootPageIds.length > 0) {
      setCurrentPageId(s.rootPageIds[0]);
    }
  }, []);

  const refreshStore = useCallback(() => {
    setStore(getAllPages());
  }, []);

  const handleCreatePage = useCallback(
    (parentId: string | null) => {
      const page = createPage(parentId);
      refreshStore();
      setCurrentPageId(page.id);
      localStorage.setItem('revnote-last-page', page.id);
    },
    [refreshStore]
  );

  const handleSelectPage = useCallback((id: string) => {
    setCurrentPageId(id);
    localStorage.setItem('revnote-last-page', id);
  }, []);

  const handleUpdatePage = useCallback(
    (id: string, updates: Parameters<typeof updatePage>[1]) => {
      updatePage(id, updates);
      refreshStore();
    },
    [refreshStore]
  );

  const handleDeletePage = useCallback(
    (id: string) => {
      deletePage(id);
      refreshStore();
      if (currentPageId === id) {
        const s = getAllPages();
        setCurrentPageId(s.rootPageIds[0] || null);
      }
    },
    [currentPageId, refreshStore]
  );

  if (!mounted) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const currentPage = currentPageId ? store.pages[currentPageId] : null;
  const breadcrumbs = currentPageId ? getPageBreadcrumbs(currentPageId) : [];

  return (
    <div className="app-layout">
      <Sidebar
        store={store}
        currentPageId={currentPageId}
        onSelectPage={handleSelectPage}
        onCreatePage={handleCreatePage}
        onDeletePage={handleDeletePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <main className="main-content">
        {currentPage ? (
          <PageView
            page={currentPage}
            store={store}
            breadcrumbs={breadcrumbs}
            onUpdatePage={handleUpdatePage}
            onSelectPage={handleSelectPage}
            onCreatePage={handleCreatePage}
          />
        ) : (
          <div className="empty-state">
            <div className="empty-state-content">
              <div className="empty-state-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                  <rect x="16" y="8" width="48" height="64" rx="8" stroke="currentColor" strokeWidth="2" />
                  <path d="M28 28H52M28 36H52M28 44H40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="56" cy="56" r="16" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2" />
                  <path d="M56 48V64M48 56H64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <h2>Welcome to RevNote</h2>
              <p>Create your first page to get started.</p>
              <button className="empty-state-btn" onClick={() => handleCreatePage(null)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 3V13M3 8H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                New Page
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
