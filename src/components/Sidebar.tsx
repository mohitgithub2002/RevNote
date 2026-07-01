'use client';

import { Page, PageStore } from '@/types';
import { useState, useCallback, useMemo, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  MeasuringStrategy,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  store: PageStore;
  currentPageId: string | null;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDeletePage: (id: string) => void;
  onMovePage: (id: string, newParentId: string | null, newIndex: number) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  userEmail: string | null;
  onSignOut: () => void;
}

interface FlatItem {
  id: string;
  parentId: string | null;
  depth: number;
  page: Page;
  isFolder: boolean;
}

const EXPAND_KEY = 'revnote-expanded';

function getExpanded(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(EXPAND_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveExpanded(exp: Record<string, boolean>) {
  localStorage.setItem(EXPAND_KEY, JSON.stringify(exp));
}

function isDescendantOf(id: string, ancestorId: string, store: PageStore): boolean {
  let current = store.pages[id];
  while (current) {
    if (current.id === ancestorId) return true;
    current = current.parentId ? store.pages[current.parentId] : undefined!;
  }
  return false;
}

function SortableTreeItem({
  item,
  currentPageId,
  expanded,
  onToggleExpand,
  onSelectPage,
  onCreatePage,
  onCreateFolder,
  onDeletePage,
  isOverFolder,
}: {
  item: FlatItem;
  currentPageId: string | null;
  expanded: Record<string, boolean>;
  onToggleExpand: (id: string) => void;
  onSelectPage: (id: string) => void;
  onCreatePage: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onDeletePage: (id: string) => void;
  isOverFolder: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const page = item.page;
  const hasChildren = page.children.length > 0;
  const isActive = currentPageId === page.id;
  const isExpanded = expanded[page.id] !== false;
  const isFolder = item.isFolder;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`page-tree-item ${isDragging ? 'dragging' : ''}`}
    >
      <button
        className={`page-tree-button ${isActive ? 'active' : ''} ${isOverFolder ? 'drop-target' : ''} ${isFolder ? 'folder-item' : ''}`}
        style={{ paddingLeft: `${12 + item.depth * 16}px` }}
        onClick={() => {
          if (isFolder) {
            onToggleExpand(page.id);
          } else {
            onSelectPage(page.id);
          }
        }}
        {...attributes}
        {...listeners}
      >
        <span
          className={`page-tree-toggle ${hasChildren || isFolder ? 'has-children' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(page.id);
          }}
        >
          {(hasChildren || isFolder) && (
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`toggle-arrow ${isExpanded ? 'expanded' : ''}`}
            >
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="page-tree-icon">
          {isFolder ? (isExpanded ? '📂' : '📁') : page.icon}
        </span>
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
            onPointerDown={(e) => e.stopPropagation()}
            title="Add sub-page"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 3V11M3 7H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          {isFolder && (
            <span
              role="button"
              tabIndex={0}
              className="page-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onCreateFolder(page.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              title="Add sub-folder"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 4.5H5L6.5 3H12V11H2V4.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M7 6.5V9.5M5.5 8H8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </span>
          )}
          <span
            role="button"
            tabIndex={0}
            className="page-action-btn delete"
            onClick={(e) => {
              e.stopPropagation();
              onDeletePage(page.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            title={isFolder ? 'Delete folder' : 'Delete page'}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3.5H11M5.5 6V10M8.5 6V10M4 3.5L4.5 11.5H9.5L10 3.5M5.5 3.5V2H8.5V3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </span>
      </button>
    </div>
  );
}

export default function Sidebar({
  store,
  currentPageId,
  onSelectPage,
  onCreatePage,
  onCreateFolder,
  onDeletePage,
  onMovePage,
  collapsed,
  onToggleCollapse,
  userEmail,
  onSignOut,
}: SidebarProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(getExpanded);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [id]: prev[id] === false ? true : (prev[id] ? false : false) };
      if (prev[id] === undefined) next[id] = false;
      else next[id] = !prev[id];
      saveExpanded(next);
      return next;
    });
  }, []);

  const flatItems = useMemo(() => {
    const items: FlatItem[] = [];
    const walk = (ids: string[], depth: number) => {
      for (const id of ids) {
        const page = store.pages[id];
        if (!page) continue;
        const isFolder = page.type === 'folder';
        items.push({ id, parentId: page.parentId, depth, page, isFolder });
        const isExpanded = expanded[id] !== false;
        if (isExpanded && page.children.length > 0) {
          walk(page.children, depth + 1);
        }
      }
    };
    walk(store.rootPageIds, 0);
    return items;
  }, [store, expanded]);

  const flatIds = useMemo(() => flatItems.map((i) => i.id), [flatItems]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const overId = event.over?.id as string | null;
    setOverId(overId);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverId(null);

      if (!over || active.id === over.id) return;

      const draggedId = active.id as string;
      const targetId = over.id as string;
      const targetPage = store.pages[targetId];
      if (!targetPage) return;

      if (isDescendantOf(targetId, draggedId, store)) return;

      const targetIsFolder = targetPage.type === 'folder';

      if (targetIsFolder) {
        const children = targetPage.children.filter((c) => c !== draggedId);
        onMovePage(draggedId, targetId, children.length);
      } else {
        const targetParentId = targetPage.parentId;
        const siblingIds = targetParentId
          ? (store.pages[targetParentId]?.children ?? [])
          : store.rootPageIds;
        const filteredSiblings = siblingIds.filter((c) => c !== draggedId);
        const targetIndex = filteredSiblings.indexOf(targetId);
        onMovePage(draggedId, targetParentId, targetIndex >= 0 ? targetIndex + 1 : filteredSiblings.length);
      }
    },
    [store, onMovePage]
  );

  const activeItem = activeId ? flatItems.find((i) => i.id === activeId) : null;

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
              <div className="sidebar-section-actions">
                <button
                  className="new-page-btn"
                  onClick={() => onCreateFolder(null)}
                  title="New folder"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M2 5.5H6L7.5 3.5H14V13H2V5.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
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
            </div>
            <div className="page-tree">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
              >
                <SortableContext items={flatIds} strategy={verticalListSortingStrategy}>
                  {flatItems.map((item) => (
                    <SortableTreeItem
                      key={item.id}
                      item={item}
                      currentPageId={currentPageId}
                      expanded={expanded}
                      onToggleExpand={toggleExpand}
                      onSelectPage={onSelectPage}
                      onCreatePage={onCreatePage}
                      onCreateFolder={onCreateFolder}
                      onDeletePage={onDeletePage}
                      isOverFolder={overId === item.id && item.isFolder && activeId !== item.id}
                    />
                  ))}
                </SortableContext>
                <DragOverlay>
                  {activeItem && (
                    <div className="page-tree-drag-overlay">
                      <span className="page-tree-icon">
                        {activeItem.isFolder ? '📁' : activeItem.page.icon}
                      </span>
                      <span className="page-tree-title">
                        {activeItem.page.title || 'Untitled'}
                      </span>
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
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

          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-user-avatar">
                {userEmail?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="sidebar-user-email" title={userEmail ?? ''}>
                {userEmail ?? ''}
              </span>
            </div>
            <button className="sidebar-signout-btn" onClick={onSignOut} title="Sign out">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 14H3.5C3.22386 14 3 13.7761 3 13.5V2.5C3 2.22386 3.22386 2 3.5 2H6M11 11L14 8L11 5M6 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
