'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface SharedPage {
  id: string;
  title: string;
  content: string;
  icon: string;
  author: string;
  createdAt: string;
  updatedAt: string;
}

export default function SharedPageView() {
  const params = useParams();
  const token = params.token as string;
  const [page, setPage] = useState<SharedPage | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/public/pages/${token}`)
      .then((res) => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(setPage)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="share-page">
        <div className="share-loading">
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="share-page">
        <div className="share-not-found">
          <h1>Page not found</h1>
          <p>This page may have been unshared or doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const updatedAt = new Date(page.updatedAt);
  const timeStr = updatedAt.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="share-page">
      <div className="share-topbar">
        <div className="share-brand">
          <div className="share-brand-icon">R</div>
          <span className="share-brand-name">RevNote</span>
        </div>
        <div className="share-meta">
          <span>By {page.author}</span>
          <span className="share-meta-sep">&middot;</span>
          <span>{timeStr}</span>
        </div>
      </div>
      <div className="share-content">
        <div className="share-header">
          <span className="share-page-icon">{page.icon}</span>
          <h1 className="share-page-title">{page.title || 'Untitled'}</h1>
        </div>
        <div
          className="share-body revnote-editor"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </div>
    </div>
  );
}
