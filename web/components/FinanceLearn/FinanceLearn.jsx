"use client";

import React, { useState } from "react";


const financePlaylists = [
  {
    category: "Investing",
    playlists: [
      {
        id: "PL9X8vPs1mT0CtQxdDqunP7B0IIoPxU9_Q", // 
        title: "Investing 101",
        description: "Basics of stock market investing, portfolios, and strategies.",
        videos: [
          {
            id: "EJHPltmAULA",
            title: "Fundamentals of Finance & Economics for Businesses",
            summary:
              "This video dives deep into finance & economics for smart investing decisions.",
          },
          
        ],
      },
      
    ],
  },
  {
    category: "Personal Finance",
    playlists: [
      {
        id: "PLA_tb393dqDdcUaaW6WBArekG5fDYAJVN", // Personal Finance playlist id from Moneycontrol
        title: "Personal Finance",
        description: "Manage your money, budgeting, and finance literacy essentials.",
        videos: [
          {
            id: "YOUTUBE_VIDEO_ID",
            title: "Sample Video Title",
            summary: "Brief description and takeaways for the video.",
          },
          
        ],
      },
      
    ],
  },
  
];

function VideoCard({ video }) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-md space-y-2">
      <iframe
        width="100%"
        height="180"
        src={`https://www.youtube.com/embed/${video.id}`}
        title={video.title}
        allowFullScreen
      ></iframe>
      <h3 className="text-lg font-semibold">{video.title}</h3>
      <p className="text-sm text-gray-600">{video.summary}</p>
    </div>
  );
}

function PlaylistView({ playlist }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-bold mb-1">{playlist.title}</h2>
      <p className="text-gray-700 mb-4">{playlist.description}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {playlist.videos.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </section>
  );
}

export default function FinanceVideosSection() {
  const [selectedCategory, setSelectedCategory] = useState(financePlaylists[0].category);

  const categoryData = financePlaylists.find((c) => c.category === selectedCategory);

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-4xl font-bold mb-6">Finance & Investing Videos</h1>
      <div className="mb-6">
        {financePlaylists.map(({ category }) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`mr-4 mb-2 px-4 py-2 rounded ${
              selectedCategory === category
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {category}
          </button>
        ))}
      </div>
      <div>
        {categoryData.playlists.map((playlist) => (
          <PlaylistView key={playlist.id} playlist={playlist} />
        ))}
      </div>
    </div>
  );
}
