/**
 * Thin API client — wraps the Next.js route handlers.
 * All functions are async and throw on non-2xx responses.
 */

import type { Page, PageStore } from '@/types';

async function request<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** Returns the full page store (all pages + root IDs). */
export async function fetchStore(): Promise<PageStore> {
  const data = await request<{ pages: PageStore['pages']; rootPageIds: string[] }>('/api/pages');
  return data;
}

/** Create a new page. Returns the new page with an empty children array. */
export async function apiCreatePage(parentId: string | null, title = 'Untitled'): Promise<Page> {
  return request<Page>('/api/pages', {
    method: 'POST',
    body: JSON.stringify({ parentId, title }),
  });
}

/** Create a new folder. */
export async function apiCreateFolder(parentId: string | null, title = 'Untitled'): Promise<Page> {
  return request<Page>('/api/pages', {
    method: 'POST',
    body: JSON.stringify({ parentId, title, type: 'folder' }),
  });
}

/** Partially update a page (title, content, icon). */
export async function apiUpdatePage(
  id: string,
  updates: Partial<Pick<Page, 'title' | 'content' | 'icon'>>
): Promise<Page> {
  return request<Page>(`/api/pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
}

/** Move a page to a new parent and/or position. */
export async function apiMovePage(
  id: string,
  parentId: string | null,
  position: number
): Promise<Page> {
  return request<Page>(`/api/pages/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ parentId, position }),
  });
}

/** Bulk reorder pages under a parent. */
export async function apiReorderPages(
  parentId: string | null,
  orderedIds: string[]
): Promise<void> {
  await request<{ ok: boolean }>('/api/pages/reorder', {
    method: 'POST',
    body: JSON.stringify({ parentId, orderedIds }),
  });
}

/** Delete a page and all its descendants. */
export async function apiDeletePage(id: string): Promise<void> {
  await request<{ ok: boolean }>(`/api/pages/${id}`, { method: 'DELETE' });
}

/** Toggle public sharing for a page. */
export async function apiToggleShare(
  id: string,
  isPublic: boolean
): Promise<{ isPublic: boolean; shareToken: string }> {
  return request<{ isPublic: boolean; shareToken: string }>(`/api/pages/${id}/share`, {
    method: 'POST',
    body: JSON.stringify({ isPublic }),
  });
}

/** Compute breadcrumbs from the in-memory store (no extra API call needed). */
export function getPageBreadcrumbs(id: string, store: PageStore): Page[] {
  const crumbs: Page[] = [];
  let current = store.pages[id];
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? store.pages[current.parentId] : undefined!;
  }
  return crumbs;
}
