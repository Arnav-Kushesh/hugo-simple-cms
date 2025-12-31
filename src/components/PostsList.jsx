import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { parseFrontmatter } from '../utils/frontmatter';
import NewPostModal from './NewPostModal';

function PostsList({ currentPost, setCurrentPost }) {
  const { contentHandle, hasAccess } = useFileSystem();
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showNewPostModal, setShowNewPostModal] = useState(false);

  useEffect(() => {
    if (hasAccess && contentHandle) {
      loadPosts();
    }
  }, [hasAccess, contentHandle]);

  async function loadPosts() {
    if (!contentHandle) {
      return;
    }

    setIsLoading(true);
    try {
      const foundPosts = await scanContentDirectory(contentHandle);
      setPosts(foundPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function scanContentDirectory(directoryHandle, basePath = '') {
    const posts = [];
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'directory') {
          const subPosts = await scanContentDirectory(handle, basePath ? `${basePath}/${name}` : name);
          posts.push(...subPosts);
        } else if (handle.kind === 'file' && name.endsWith('.md')) {
          try {
            const file = await handle.getFile();
            const content = await file.text();
            const parsed = parseFrontmatter(content);
            
            const relativePath = basePath ? `${basePath}/${name}` : name;
            posts.push({
              filename: relativePath,
              fileHandle: handle,
              title: parsed.data.title || name.replace('.md', ''),
              date: parsed.data.date || null,
              draft: parsed.data.draft !== undefined ? parsed.data.draft : false,
              ...parsed.data
            });
          } catch (error) {
            console.error(`Error reading ${name}:`, error);
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory:`, error);
    }
    
    return posts;
  }

  const handlePostClick = (post) => {
    setCurrentPost(post);
  };

  if (!hasAccess) {
    return (
      <div className="sidebar-header">
        <h2>Blog Posts</h2>
        <button className="btn-primary" onClick={() => setShowNewPostModal(true)}>
          + New Post
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-header">
        <h2>Blog Posts</h2>
        <button className="btn-primary" onClick={() => setShowNewPostModal(true)}>
          + New Post
        </button>
      </div>
      <div className="posts-list">
        {isLoading ? (
          <p className="loading">Loading posts...</p>
        ) : posts.length === 0 ? (
          <p className="empty-state">No posts found</p>
        ) : (
          posts.map(post => (
            <div
              key={post.filename}
              className={`post-item ${currentPost?.filename === post.filename ? 'active' : ''}`}
              onClick={() => handlePostClick(post)}
            >
              <h3>{post.title || post.filename}</h3>
              <div className="post-meta">
                {post.date ? new Date(post.date).toLocaleDateString() : 'No date'}
                {post.draft ? ' • Draft' : ''}
              </div>
              <div className="post-filename">{post.filename}</div>
            </div>
          ))
        )}
      </div>
      {showNewPostModal && (
        <NewPostModal
          onClose={() => setShowNewPostModal(false)}
          onPostCreated={(post) => {
            setCurrentPost(post);
            setShowNewPostModal(false);
            loadPosts();
          }}
        />
      )}
    </>
  );
}

export default PostsList;
