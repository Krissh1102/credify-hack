'use client'
import React, { useState, useEffect } from 'react';

const NEWS_API_KEY = process.env.NEXT_PUBLIC_NEWS_API_KEY;
const NEWS_API_URL = `https://newsapi.org/v2/top-headlines?category=business&language=en&pageSize=10&apiKey=${NEWS_API_KEY}`;

export default function NewsEventsTab() {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // The actual fetch function, always fresh on each render
  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(NEWS_API_URL);
      const data = await response.json();
      setNews(data.articles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <section className="bg-white p-8 rounded-xl shadow-sm max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-800">News & Events</h2>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition"
          aria-label="Refresh News"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      {error && (
        <p className="text-red-500 mb-6 text-center">Error: {error}</p>
      )}
      {!error && news.length === 0 && !loading && (
        <p className="text-slate-600 text-center">No news available at the moment.</p>
      )}
      <div className="space-y-6">
        {news.map(({ title, url, source, publishedAt, description }, index) => (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            key={index}
            className="block group p-4 border rounded-lg hover:shadow-lg transition"
          >
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-lg font-semibold text-slate-800 group-hover:text-blue-600">{title}</h3>
              <time className="text-xs text-slate-400" dateTime={publishedAt}>
                {new Date(publishedAt).toLocaleDateString()}
              </time>
            </div>
            <p className="text-sm text-slate-600 mb-1">{description?.slice(0, 120)}{description && description.length > 120 ? '...' : ''}</p>
            <p className="text-xs text-slate-400">Source: {source.name}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
