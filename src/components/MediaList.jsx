import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

function MediaList() {
  const { staticHandle, contentHandle, hasAccess } = useFileSystem();
  const [mediaItems, setMediaItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (hasAccess && staticHandle) {
      loadMedia();
    }
  }, [hasAccess, staticHandle]);

  useEffect(() => {
    if (hasAccess && contentHandle) {
      loadPosts();
    }
  }, [hasAccess, contentHandle]);

  async function loadPosts() {
    if (!contentHandle) return;
    
    try {
      const foundPosts = await scanContentDirectory(contentHandle);
      setPosts(foundPosts);
    } catch (error) {
      console.error('Error loading posts:', error);
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
            const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
            let match;
            const imagePaths = [];
            
            while ((match = imageRegex.exec(content)) !== null) {
              imagePaths.push(match[1]);
            }
            
            posts.push({ imagePaths, handle });
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

  async function loadMedia() {
    if (!staticHandle) {
      return;
    }

    setIsLoading(true);
    try {
      let imagesDirHandle;
      try {
        imagesDirHandle = await staticHandle.getDirectoryHandle('images');
      } catch (error) {
        setMediaItems([]);
        return;
      }

      const images = await scanImagesDirectory(imagesDirHandle);
      const usedImages = await checkImageUsage();
      
      const items = images.map(img => ({
        ...img,
        isUsed: usedImages.has(img.filename)
      }));
      
      setMediaItems(items.sort((a, b) => b.lastModified - a.lastModified));
    } catch (error) {
      console.error('Error loading media:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function scanImagesDirectory(directoryHandle, basePath = '') {
    const images = [];
    
    try {
      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'directory') {
          const subImages = await scanImagesDirectory(handle, basePath ? `${basePath}/${name}` : name);
          images.push(...subImages);
        } else if (handle.kind === 'file') {
          const lowerName = name.toLowerCase();
          if (lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || 
              lowerName.endsWith('.jpeg') || lowerName.endsWith('.gif') || 
              lowerName.endsWith('.webp') || lowerName.endsWith('.svg')) {
            const relativePath = basePath ? `${basePath}/${name}` : name;
            const file = await handle.getFile();
            
            images.push({
              filename: relativePath,
              name: name,
              fileHandle: handle,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning images directory:`, error);
    }
    
    return images;
  }

  async function checkImageUsage() {
    const usedImages = new Set();
    
    for (const post of posts) {
      try {
        const file = await post.handle.getFile();
        const content = await file.text();
        
        const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
        let match;
        
        while ((match = imageRegex.exec(content)) !== null) {
          const imagePath = match[1];
          const filename = imagePath.split('/').pop();
          if (filename) {
            usedImages.add(filename);
          }
        }
      } catch (error) {
        console.error(`Error checking image usage:`, error);
      }
    }
    
    return usedImages;
  }

  async function handleDelete(filename) {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    try {
      const imageItem = mediaItems.find(item => item.filename === filename);
      if (!imageItem || !imageItem.fileHandle) {
        alert('Image not found');
        return;
      }

      const staticDirHandle = await staticHandle.getDirectoryHandle('static');
      const imagesDirHandle = await staticDirHandle.getDirectoryHandle('images');
      
      const pathParts = filename.split('/');
      const actualFilename = pathParts[pathParts.length - 1];
      
      let targetDir = imagesDirHandle;
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (pathParts[i]) {
          targetDir = await targetDir.getDirectoryHandle(pathParts[i]);
        }
      }
      
      await targetDir.removeEntry(actualFilename);
      loadMedia();
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Error deleting image: ' + error.message);
    }
  }

  if (!hasAccess) {
    return (
      <div className="sidebar-header">
        <h2>Media Library</h2>
        <button className="btn-primary" onClick={loadMedia}>🔄</button>
      </div>
    );
  }

  return (
    <>
      <div className="sidebar-header">
        <h2>Media Library</h2>
        <button className="btn-primary" onClick={loadMedia} title="Refresh">🔄</button>
      </div>
      <div className="media-list">
        {isLoading ? (
          <p className="loading">Loading media...</p>
        ) : mediaItems.length === 0 ? (
          <p className="empty-state">No images found</p>
        ) : (
          mediaItems.map(item => {
            const sizeKB = (item.size / 1024).toFixed(1);
            const date = new Date(item.lastModified).toLocaleDateString();
            
            return (
              <div
                key={item.filename}
                className={`media-item ${item.isUsed ? '' : 'dangling'}`}
              >
                <div className="media-info">
                  <div className="media-name">{item.name}</div>
                  <div className="media-meta">
                    {sizeKB} KB • {date}
                    {!item.isUsed && (
                      <span className="dangling-badge">Dangling Media</span>
                    )}
                  </div>
                </div>
                <div className="media-actions">
                  <button
                    className="btn-small btn-delete"
                    onClick={() => handleDelete(item.filename)}
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

export default MediaList;
