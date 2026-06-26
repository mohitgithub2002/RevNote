export interface Page {
  id: string;
  title: string;
  content: string;
  parentId: string | null;
  children: string[];
  icon: string;
  createdAt: number;
  updatedAt: number;
}

export interface PageStore {
  pages: Record<string, Page>;
  rootPageIds: string[];
}
