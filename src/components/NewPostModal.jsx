import React, { useState } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { stringifyFrontmatter } from '../utils/frontmatter';

function NewPostModal({ onClose, onPostCreated }) {
  const { contentHandle } = useFileSystem();
  const [filename, setFilename] = useState('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [draft, setDraft] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!filename || !contentHandle) return;

    setIsCreating(true);
    try {
      const pathParts = filename.split('/');
      const actualFilename = pathParts.pop();
      const finalFilename = actualFilename.endsWith('.md') ? actualFilename : `${actualFilename}.md`;
      
      // Navigate to the correct directory
      let targetDir = contentHandle;
      for (const part of pathParts) {
        if (part) {
          try {
            targetDir = await targetDir.getDirectoryHandle(part);
          } catch (error) {
            targetDir = await targetDir.getDirectoryHandle(part, { create: true });
          }
        }
      }

      // Check if file already exists
      try {
        await targetDir.getFileHandle(finalFilename);
        alert('File already exists');
        return;
      } catch (error) {
        // File doesn't exist, which is what we want
      }

      // Create file
      const fileHandle = await targetDir.getFileHandle(finalFilename, { create: true });
      
      const frontmatter = {
        title: title || finalFilename.replace('.md', '').replace(/-/g, ' '),
        draft: draft
      };

      if (date) {
        frontmatter.date = new Date(date).toISOString();
      }

      const fileContent = stringifyFrontmatter('', frontmatter);
      
      // Write initial content
      const writable = await fileHandle.createWritable();
      await writable.write(fileContent);
      await writable.close();
      
      const relativePath = pathParts.length > 0 
        ? `${pathParts.join('/')}/${finalFilename}`
        : finalFilename;

      onPostCreated({
        filename: relativePath,
        fileHandle,
        title: frontmatter.title,
        date: frontmatter.date,
        draft: frontmatter.draft
      });
    } catch (error) {
      alert('Error creating post: ' + error.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal active" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <span className="close" onClick={onClose}>&times;</span>
        <h2>Create New Post</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="newPostFilename">Filename (e.g., my-new-post.md):</label>
            <input
              type="text"
              id="newPostFilename"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              required
              placeholder="my-new-post.md"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPostTitle">Title:</label>
            <input
              type="text"
              id="newPostTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="My New Post"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPostDate">Date:</label>
            <input
              type="datetime-local"
              id="newPostDate"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                id="newPostDraft"
                checked={draft}
                onChange={(e) => setDraft(e.target.checked)}
              />
              Draft
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewPostModal;
