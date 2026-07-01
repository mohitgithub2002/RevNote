import { Page, PageStore } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'revnote-pages';

const PAGE_ICONS = ['📄', '📝', '📋', '📑', '🗒️', '💡', '🎯', '📌', '🔖', '✨'];

function randomIcon(): string {
  return PAGE_ICONS[Math.floor(Math.random() * PAGE_ICONS.length)];
}

function getStore(): PageStore {
  if (typeof window === 'undefined') return { pages: {}, rootPageIds: [] };
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { pages: {}, rootPageIds: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { pages: {}, rootPageIds: [] };
  }
}

function saveStore(store: PageStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getAllPages(): PageStore {
  return getStore();
}

export function getPage(id: string): Page | null {
  const store = getStore();
  return store.pages[id] || null;
}

export function createPage(parentId: string | null = null, title = 'Untitled'): Page {
  const store = getStore();
  const id = uuidv4();
  const page: Page = {
    id,
    title,
    content: '',
    type: 'page',
    parentId,
    children: [],
    icon: randomIcon(),
    position: 0,
    isPublic: false,
    shareToken: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  store.pages[id] = page;

  if (parentId && store.pages[parentId]) {
    store.pages[parentId].children.push(id);
  } else {
    store.rootPageIds.push(id);
  }

  saveStore(store);
  return page;
}

export function updatePage(id: string, updates: Partial<Pick<Page, 'title' | 'content' | 'icon'>>) {
  const store = getStore();
  if (!store.pages[id]) return null;
  store.pages[id] = { ...store.pages[id], ...updates, updatedAt: Date.now() };
  saveStore(store);
  return store.pages[id];
}

export function deletePage(id: string) {
  const store = getStore();
  const page = store.pages[id];
  if (!page) return;

  const deleteRecursive = (pageId: string) => {
    const p = store.pages[pageId];
    if (!p) return;
    p.children.forEach(deleteRecursive);
    delete store.pages[pageId];
  };

  if (page.parentId && store.pages[page.parentId]) {
    store.pages[page.parentId].children = store.pages[page.parentId].children.filter(
      (c) => c !== id
    );
  } else {
    store.rootPageIds = store.rootPageIds.filter((c) => c !== id);
  }

  deleteRecursive(id);
  saveStore(store);
}

export function getPageBreadcrumbs(id: string): Page[] {
  const store = getStore();
  const crumbs: Page[] = [];
  let current = store.pages[id];
  while (current) {
    crumbs.unshift(current);
    current = current.parentId ? store.pages[current.parentId] : undefined!;
  }
  return crumbs;
}
