import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

function PreviewTab({ postData }) {
  const [previewMode, setPreviewMode] = useState('rendered');
  const [hugoServerUrl, setHugoServerUrl] = useState('http://localhost:1313');

  useEffect(() => {
    const savedUrl = localStorage.getItem('hugoServerUrl');
    if (savedUrl) {
      setHugoServerUrl(savedUrl);
    }
  }, []);

  useEffect(() => {
    if (previewMode === 'live') {
      updateLivePreview();
    }
  }, [previewMode, postData, hugoServerUrl]);

  function renderPreview() {
    if (typeof marked === 'undefined') {
      return '<p class="error">Markdown parser not loaded. Please refresh the page.</p>';
    }

    marked.setOptions({
      breaks: true,
      gfm: true
    });

    try {
      const html = marked.parse(postData?.content || '');
      const title = postData?.frontmatter?.title || 'Untitled';
      const date = postData?.frontmatter?.date ? new Date(postData.frontmatter.date).toLocaleDateString() : '';
      
      return `
        <article class="preview-article">
          <header class="preview-header">
            <h1 class="preview-title">${escapeHtml(title)}</h1>
            ${date ? `<time class="preview-date">${date}</time>` : ''}
          </header>
          <div class="preview-content">
            ${html}
          </div>
        </article>
      `;
    } catch (error) {
      return `<p class="error">Error rendering preview: ${error.message}</p>`;
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function updateLivePreview() {
    const liveFrame = document.getElementById('livePreviewFrame');
    if (!liveFrame || !postData) return;
    
    const filename = postData.filename.replace('.md', '').replace(/\\/g, '/');
    const pathParts = filename.split('/');
    const slug = pathParts[pathParts.length - 1];
    
    const possibleUrls = [
      `${hugoServerUrl}/${slug}/`,
      `${hugoServerUrl}/posts/${slug}/`,
      `${hugoServerUrl}/${filename.replace('.md', '')}/`
    ];
    
    liveFrame.src = possibleUrls[0];
  }

  return (
    <div className="tab-content active" id="preview-tab">
      <div className="preview-mode-selector">
        <label>
          <input
            type="radio"
            name="previewMode"
            value="rendered"
            checked={previewMode === 'rendered'}
            onChange={(e) => setPreviewMode(e.target.value)}
          />
          Rendered Preview
        </label>
        <label>
          <input
            type="radio"
            name="previewMode"
            value="live"
            checked={previewMode === 'live'}
            onChange={(e) => setPreviewMode(e.target.value)}
          />
          Live Server
        </label>
      </div>
      {previewMode === 'rendered' ? (
        <div
          className="preview-container"
          id="previewContainer"
          dangerouslySetInnerHTML={{ __html: renderPreview() }}
        />
      ) : (
        <iframe
          id="livePreviewFrame"
          className="preview-iframe"
          title="Live Preview"
        />
      )}
    </div>
  );
}

export default PreviewTab;
