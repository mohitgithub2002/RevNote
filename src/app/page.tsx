'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { PageStore } from '@/types';
import {
  fetchStore,
  apiCreatePage,
  apiUpdatePage,
  apiDeletePage,
  getPageBreadcrumbs,
} from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import PageView from '@/components/PageView';

const LAST_PAGE_KEY = 'revnote-last-page';

export default function Home() {
  const [store, setStore] = useState<PageStore>({ pages: {}, rootPageIds: [] });
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStore = useCallback(async () => {
    const s = await fetchStore();
    setStore(s);
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      const s = await loadStore();
      setMounted(true);
      const lastId = localStorage.getItem(LAST_PAGE_KEY);
      if (lastId && s.pages[lastId]) setCurrentPageId(lastId);
      else if (s.rootPageIds.length > 0) setCurrentPageId(s.rootPageIds[0]);
    })();
  }, [loadStore]);

  const handleCreatePage = useCallback(
    async (parentId: string | null) => {
      const page = await apiCreatePage(parentId);
      await loadStore();
      setCurrentPageId(page.id);
      localStorage.setItem(LAST_PAGE_KEY, page.id);
    },
    [loadStore]
  );

  const handleSelectPage = useCallback((id: string) => {
    setCurrentPageId(id);
    localStorage.setItem(LAST_PAGE_KEY, id);
  }, []);

  const handleUpdatePage = useCallback(
    (id: string, updates: Parameters<typeof apiUpdatePage>[1]) => {
      // Debounce saves: wait 600 ms after the last keystroke before hitting the API.
      // This prevents a DB write on every single character typed.
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await apiUpdatePage(id, updates);
        await loadStore();
      }, 600);

      // Optimistically update local state so the UI feels instant.
      setStore((prev) => {
        const page = prev.pages[id];
        if (!page) return prev;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [id]: { ...page, ...updates, updatedAt: Date.now() },
          },
        };
      });
    },
    [loadStore]
  );

  const handleDeletePage = useCallback(
    async (id: string) => {
      await apiDeletePage(id);
      const s = await loadStore();
      if (currentPageId === id) {
        setCurrentPageId(s.rootPageIds[0] ?? null);
      }
    },
    [currentPageId, loadStore]
  );

  if (!mounted) {
    return (
      <div className="app-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  const currentPage = currentPageId ? store.pages[currentPageId] : null;
  const breadcrumbs = currentPageId ? getPageBreadcrumbs(currentPageId, store) : [];

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
