'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import { PageStore } from '@/types';
import {
  fetchStore,
  apiCreatePage,
  apiCreateFolder,
  apiUpdatePage,
  apiDeletePage,
  apiReorderPages,
  getPageBreadcrumbs,
} from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import Sidebar from '@/components/Sidebar';
import PageView from '@/components/PageView';

const LAST_PAGE_KEY = 'revnote-last-page';

export default function Home() {
  const [store, setStore] = useState<PageStore>({ pages: {}, rootPageIds: [] });
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadStore = useCallback(async () => {
    const s = await fetchStore();
    setStore(s);
    return s;
  }, []);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);

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

  const handleCreateFolder = useCallback(
    async (parentId: string | null) => {
      await apiCreateFolder(parentId);
      await loadStore();
    },
    [loadStore]
  );

  const handleSelectPage = useCallback((id: string) => {
    setCurrentPageId(id);
    localStorage.setItem(LAST_PAGE_KEY, id);
  }, []);

  const handleUpdatePage = useCallback(
    (id: string, updates: Parameters<typeof apiUpdatePage>[1]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        await apiUpdatePage(id, updates);
        await loadStore();
      }, 600);

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
      const page = store.pages[id];
      if (page?.type === 'folder' && page.children.length > 0) {
        const ok = window.confirm(
          `Delete folder "${page.title || 'Untitled'}" and all its contents?`
        );
        if (!ok) return;
      }
      await apiDeletePage(id);
      const s = await loadStore();
      if (currentPageId === id || (currentPageId && !s.pages[currentPageId])) {
        setCurrentPageId(s.rootPageIds[0] ?? null);
      }
    },
    [currentPageId, loadStore, store.pages]
  );

  const handleMovePage = useCallback(
    async (id: string, newParentId: string | null, newIndex: number) => {
      setStore((prev) => {
        const next = { ...prev, pages: { ...prev.pages }, rootPageIds: [...prev.rootPageIds] };
        const page = next.pages[id];
        if (!page) return prev;

        const oldParentId = page.parentId;
        if (oldParentId && next.pages[oldParentId]) {
          next.pages[oldParentId] = {
            ...next.pages[oldParentId],
            children: next.pages[oldParentId].children.filter((c) => c !== id),
          };
        } else {
          next.rootPageIds = next.rootPageIds.filter((c) => c !== id);
        }

        next.pages[id] = { ...page, parentId: newParentId };

        if (newParentId && next.pages[newParentId]) {
          const children = [...next.pages[newParentId].children];
          children.splice(newIndex, 0, id);
          next.pages[newParentId] = { ...next.pages[newParentId], children };
        } else {
          const rootIds = [...next.rootPageIds];
          rootIds.splice(newIndex, 0, id);
          next.rootPageIds = rootIds;
        }

        return next;
      });

      const siblingIds = newParentId
        ? store.pages[newParentId]?.children.filter((c) => c !== id) ?? []
        : store.rootPageIds.filter((c) => c !== id);
      const ordered = [...siblingIds];
      ordered.splice(newIndex, 0, id);

      try {
        await apiReorderPages(newParentId, ordered);
        await loadStore();
      } catch (err) {
        console.error('Failed to move page:', err);
        await loadStore();
      }
    },
    [loadStore, store]
  );

  const handleShareUpdate = useCallback(
    (id: string, isPublic: boolean, shareToken: string | null) => {
      setStore((prev) => {
        const page = prev.pages[id];
        if (!page) return prev;
        return {
          ...prev,
          pages: {
            ...prev.pages,
            [id]: { ...page, isPublic, shareToken },
          },
        };
      });
    },
    []
  );

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/auth';
  }, []);

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
        onCreateFolder={handleCreateFolder}
        onDeletePage={handleDeletePage}
        onMovePage={handleMovePage}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        userEmail={userEmail}
        onSignOut={handleSignOut}
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
            onShareUpdate={handleShareUpdate}
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
