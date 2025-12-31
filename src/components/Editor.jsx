import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';
import { parseFrontmatter, stringifyFrontmatter } from '../utils/frontmatter';
import ContentTab from './editor/ContentTab';
import PreviewTab from './editor/PreviewTab';
import FrontmatterTab from './editor/FrontmatterTab';

async function uploadImage(hugoRootHandle, staticHandle, contentEditor) {
  if (!hugoRootHandle) {
    alert('Please select a Hugo folder first');
    return;
  }

  try {
    const fileHandles = await window.showOpenFilePicker({
      types: [{
        description: 'Image files',
        accept: {
          'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg']
        }
      }],
      multiple: true
    });

    if (fileHandles.length === 0) return;

    let staticDirHandle = staticHandle;
    if (!staticDirHandle) {
      try {
        staticDirHandle = await hugoRootHandle.getDirectoryHandle('static');
      } catch (error) {
        staticDirHandle = await hugoRootHandle.getDirectoryHandle('static', { create: true });
      }
    }

    let imagesDirHandle;
    try {
      imagesDirHandle = await staticDirHandle.getDirectoryHandle('images');
    } catch (error) {
      imagesDirHandle = await staticDirHandle.getDirectoryHandle('images', { create: true });
    }

    const cursorPos = contentEditor.selectionStart;
    const textBefore = contentEditor.value.substring(0, cursorPos);
    const textAfter = contentEditor.value.substring(cursorPos);
    
    let insertedMarkdown = '';
    let uploadedCount = 0;

    for (const fileHandle of fileHandles) {
      try {
        const file = await fileHandle.getFile();
        const timestamp = Date.now() + uploadedCount;
        const originalName = file.name;
        const extension = originalName.substring(originalName.lastIndexOf('.'));
        const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
        const sanitizedName = baseName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
        const newFileName = `${timestamp}-${sanitizedName}${extension}`;

        const newFileHandle = await imagesDirHandle.getFileHandle(newFileName, { create: true });
        const writable = await newFileHandle.createWritable();
        const fileContent = await file.arrayBuffer();
        await writable.write(fileContent);
        await writable.close();

        const imagePath = `/images/${newFileName}`;
        const imageMarkdown = `![${baseName}](${imagePath})\n`;
        insertedMarkdown += imageMarkdown;
        uploadedCount++;
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    if (uploadedCount > 0) {
      contentEditor.value = textBefore + insertedMarkdown + textAfter;
      const newCursorPos = cursorPos + insertedMarkdown.length;
      contentEditor.setSelectionRange(newCursorPos, newCursorPos);
      contentEditor.focus();
      alert(`Successfully uploaded ${uploadedCount} image(s)`);
    }
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error uploading image:', error);
      alert('Error uploading image: ' + error.message);
    }
  }
}

function Editor({ currentPost, setCurrentPost }) {
  const { hasAccess, hugoRootHandle, staticHandle } = useFileSystem();
  const [activeTab, setActiveTab] = useState('content');
  const [postData, setPostData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (currentPost) {
      loadPost();
    } else {
      setPostData(null);
    }
  }, [currentPost]);

  async function loadPost() {
    if (!currentPost?.fileHandle) return;

    setIsLoading(true);
    try {
      const file = await currentPost.fileHandle.getFile();
      const content = await file.text();
      const parsed = parseFrontmatter(content);
      
      setPostData({
        filename: currentPost.filename,
        frontmatter: parsed.data,
        content: parsed.content,
        fileHandle: currentPost.fileHandle
      });
    } catch (error) {
      console.error('Error loading post:', error);
      alert('Error loading post: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSave() {
    if (!postData?.fileHandle) return;

    setIsSaving(true);
    try {
      const content = document.getElementById('contentEditor')?.value || postData.content;
      const frontmatter = { ...postData.frontmatter };
      
      // Get frontmatter from inputs
      const frontmatterInputs = document.querySelectorAll('#frontmatterEditor [data-key]');
      frontmatterInputs.forEach(input => {
        const key = input.dataset.key;
        if (input.type === 'checkbox') {
          frontmatter[key] = input.checked;
        } else if (input.tagName === 'TEXTAREA') {
          const value = input.value.trim();
          try {
            if (value.startsWith('[') || value.startsWith('{')) {
              frontmatter[key] = JSON.parse(value);
            } else if (value.includes('\n')) {
              frontmatter[key] = value.split('\n').filter(v => v.trim());
            } else {
              frontmatter[key] = value;
            }
          } catch {
            frontmatter[key] = value;
          }
        } else {
          frontmatter[key] = input.value;
        }
      });

      const fileContent = stringifyFrontmatter(content, frontmatter);
      
      const writable = await postData.fileHandle.createWritable();
      await writable.write(fileContent);
      await writable.close();
      
      setPostData(prev => ({ ...prev, frontmatter, content }));
      alert('Post saved successfully!');
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!hasAccess) {
    return (
      <main className="editor-area">
        <div className="editor-container">
          <div className="empty-editor">
            <p>Select a Hugo folder to get started</p>
          </div>
        </div>
      </main>
    );
  }

  if (!currentPost) {
    return (
      <main className="editor-area">
        <div className="editor-container">
          <div className="empty-editor">
            <p>Select a post to edit or create a new one</p>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="editor-area">
        <div className="editor-container">
          <div className="empty-editor">
            <p>Loading post...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!postData) {
    return null;
  }

  return (
    <main className="editor-area">
      <div className="editor-container">
        <div className="editor-header">
          <h2>{postData.frontmatter.title || postData.filename}</h2>
          <div className="editor-toolbar">
            <button
              className="btn-toolbar"
              onClick={() => {
                const contentEditor = document.getElementById('contentEditor');
                if (contentEditor) {
                  uploadImage(hugoRootHandle, staticHandle, contentEditor);
                }
              }}
            >
              📷 Upload Image
            </button>
          </div>
        </div>
        <div className="editor-content">
          <div className="editor-tabs">
            <div
              className={`tab ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => setActiveTab('content')}
            >
              Content
            </div>
            <div
              className={`tab ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              Preview
            </div>
            <div
              className={`tab ${activeTab === 'frontmatter' ? 'active' : ''}`}
              onClick={() => setActiveTab('frontmatter')}
            >
              Frontmatter
            </div>
          </div>
          
          {activeTab === 'content' && (
            <ContentTab postData={postData} setPostData={setPostData} />
          )}
          {activeTab === 'preview' && (
            <PreviewTab postData={postData} />
          )}
          {activeTab === 'frontmatter' && (
            <FrontmatterTab postData={postData} setPostData={setPostData} />
          )}
          
          <button
            className="save-button"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : '💾 Save Post'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default Editor;
