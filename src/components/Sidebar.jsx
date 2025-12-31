import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import PostsList from './PostsList';
import MediaList from './MediaList';

function Sidebar({ sidebarTab, setSidebarTab, currentPost, setCurrentPost }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-tabs">
        <button
          className={`sidebar-tab ${sidebarTab === 'posts' ? 'active' : ''}`}
          onClick={() => setSidebarTab('posts')}
        >
          📝 Posts
        </button>
        <button
          className={`sidebar-tab ${sidebarTab === 'media' ? 'active' : ''}`}
          onClick={() => setSidebarTab('media')}
        >
          🖼️ Media
        </button>
      </div>

      <div className="sidebar-content" style={{ display: sidebarTab === 'posts' ? 'block' : 'none' }}>
        <PostsList currentPost={currentPost} setCurrentPost={setCurrentPost} />
      </div>

      <div className="sidebar-content" style={{ display: sidebarTab === 'media' ? 'block' : 'none' }}>
        <MediaList />
      </div>
    </aside>
  );
}

export default Sidebar;
