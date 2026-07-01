export interface Page {
  id: string;
  title: string;
  content: string;
  type: 'page' | 'folder';
  parentId: string | null;
  children: string[];
  icon: string;
  position: number;
  isPublic: boolean;
  shareToken: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PageStore {
  pages: Record<string, Page>;
  rootPageIds: string[];
}
