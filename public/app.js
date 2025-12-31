// State
let hugoRootDirectoryHandle = null;
let contentDirectoryHandle = null;
let staticDirectoryHandle = null;
let posts = [];
let currentPost = null;
let currentPostData = null;
let currentPostFileHandle = null;
let mediaItems = [];
let hugoServerUrl = 'http://localhost:1313';

// DOM Elements
const selectFolderBtn = document.getElementById('selectFolderBtn');
const currentFolderDiv = document.getElementById('currentFolder');
const postsList = document.getElementById('postsList');
const editorContainer = document.getElementById('editorContainer');
const newPostBtn = document.getElementById('newPostBtn');
const newPostModal = document.getElementById('newPostModal');
const newPostForm = document.getElementById('newPostForm');
const cancelNewPostBtn = document.getElementById('cancelNewPost');
const closeModal = document.querySelector('.close');
const hugoServerUrlInput = document.getElementById('hugoServerUrl');
const mediaList = document.getElementById('mediaList');
const refreshMediaBtn = document.getElementById('refreshMediaBtn');

// Check if File System Access API is supported
if (!window.showDirectoryPicker) {
    selectFolderBtn.disabled = true;
    selectFolderBtn.textContent = '⚠️ File System Access API not supported';
    currentFolderDiv.innerHTML = '<p class="error">This browser does not support the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.</p>';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load saved server URL
    const savedUrl = localStorage.getItem('hugoServerUrl');
    if (savedUrl) {
        hugoServerUrl = savedUrl;
        hugoServerUrlInput.value = savedUrl;
    }
    
    // Save server URL on change
    hugoServerUrlInput.addEventListener('change', () => {
        hugoServerUrl = hugoServerUrlInput.value.trim();
        localStorage.setItem('hugoServerUrl', hugoServerUrl);
        // Update live preview if it's active
        const previewTab = document.querySelector('[data-tab="preview"]');
        if (previewTab && previewTab.classList.contains('active')) {
            const previewMode = document.querySelector('input[name="previewMode"]:checked');
            if (previewMode && previewMode.value === 'live') {
                updateLivePreview();
            }
        }
    });
    
    // Sidebar tab switching
    document.querySelectorAll('.sidebar-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.sidebarTab;
            document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.sidebar-content').forEach(c => c.style.display = 'none');
            tab.classList.add('active');
            document.getElementById(`${tabName}Sidebar`).style.display = 'block';
            
            if (tabName === 'media') {
                loadMedia();
            }
        });
    });
    
    // Refresh media button
    if (refreshMediaBtn) {
        refreshMediaBtn.addEventListener('click', () => {
            loadMedia();
        });
    }
});

// Select folder using File System Access API
selectFolderBtn.addEventListener('click', async () => {
    try {
        // Request directory picker
        const directoryHandle = await window.showDirectoryPicker();
        
        // Look for content directory
        let contentDirHandle = null;
        
        // Check if the selected directory itself is the content directory
        try {
            contentDirHandle = await directoryHandle.getDirectoryHandle('content');
        } catch (error) {
            // If content directory doesn't exist, check if we're already in it
            // or if the selected folder IS the content folder
            // For now, let's assume user selects the Hugo root folder
            showMessage('Please select the Hugo site root folder (the folder containing the "content" directory)', 'error');
            return;
        }
        
        hugoRootDirectoryHandle = directoryHandle;
        contentDirectoryHandle = contentDirHandle;
        
        // Try to get static directory handle
        try {
            staticDirectoryHandle = await directoryHandle.getDirectoryHandle('static');
        } catch (error) {
            // Static directory doesn't exist yet, will be created when needed
            staticDirectoryHandle = null;
        }
        
        currentFolderDiv.textContent = `Current folder: ${directoryHandle.name}`;
        currentFolderDiv.classList.add('active');
        showMessage('Folder selected successfully!', 'success');
        loadPosts();
        loadMedia();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error selecting folder:', error);
            showMessage('Error selecting folder: ' + error.message, 'error');
        }
    }
});

// Load posts
async function loadPosts() {
    if (!contentDirectoryHandle) {
        postsList.innerHTML = '<p class="empty-state">Select a Hugo folder to see posts</p>';
        return;
    }

    postsList.innerHTML = '<p class="loading">Loading posts...</p>';

    try {
        const foundPosts = await scanContentDirectory(contentDirectoryHandle);
        posts = foundPosts;
        renderPostsList();
    } catch (error) {
        postsList.innerHTML = `<p class="error">Error loading posts: ${error.message}</p>`;
        console.error('Error loading posts:', error);
    }
}

// Scan content directory recursively
async function scanContentDirectory(directoryHandle, basePath = '') {
    const posts = [];
    
    try {
        for await (const [name, handle] of directoryHandle.entries()) {
            if (handle.kind === 'directory') {
                // Recursively scan subdirectories
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

// Load a specific post
async function loadPost(filename) {
    try {
        // Find the post in our list to get the file handle
        const post = posts.find(p => p.filename === filename);
        if (!post || !post.fileHandle) {
            showMessage('Post not found', 'error');
            return;
        }

        const file = await post.fileHandle.getFile();
        const content = await file.text();
        const parsed = parseFrontmatter(content);
        
        currentPost = filename;
        currentPostFileHandle = post.fileHandle;
        currentPostData = {
            filename,
            frontmatter: parsed.data,
            content: parsed.content,
            raw: content
        };
        
        renderEditor(currentPostData);
    } catch (error) {
        showMessage('Error loading post: ' + error.message, 'error');
        console.error('Error loading post:', error);
    }
}

// Render editor
function renderEditor(data) {
    const frontmatterFields = Object.keys(data.frontmatter || {});
    
    editorContainer.innerHTML = `
        <div class="editor-header">
            <h2>${data.frontmatter.title || data.filename}</h2>
            <div class="editor-toolbar">
                <button class="btn-toolbar" id="uploadImageBtn" title="Upload Image">
                    📷 Upload Image
                </button>
            </div>
        </div>
        <div class="editor-content">
            <div class="editor-tabs">
                <div class="tab active" data-tab="content">Content</div>
                <div class="tab" data-tab="preview">Preview</div>
                <div class="tab" data-tab="frontmatter">Frontmatter</div>
            </div>
            <div class="tab-content active" id="content-tab">
                <textarea class="editor-textarea" id="contentEditor" placeholder="Write your content here...">${escapeHtml(data.content || '')}</textarea>
            </div>
            <div class="tab-content" id="preview-tab">
                <div class="preview-mode-selector">
                    <label>
                        <input type="radio" name="previewMode" value="rendered" checked />
                        Rendered Preview
                    </label>
                    <label>
                        <input type="radio" name="previewMode" value="live" />
                        Live Server
                    </label>
                </div>
                <div class="preview-container" id="previewContainer">
                    ${renderPreview(data.content || '', data.frontmatter)}
                </div>
                <iframe id="livePreviewFrame" class="preview-iframe" style="display: none;" frameborder="0"></iframe>
            </div>
            <div class="tab-content" id="frontmatter-tab">
                <div class="frontmatter-editor" id="frontmatterEditor">
                    ${renderFrontmatterEditor(data.frontmatter)}
                </div>
            </div>
            <button class="save-button" id="saveBtn">💾 Save Post</button>
        </div>
    `;

    // Tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`${tabName}-tab`).classList.add('active');
            
            // Update preview when switching to preview tab
            if (tabName === 'preview') {
                updatePreview();
                updateLivePreview();
            }
            
            // Preview mode switching
            if (tabName === 'preview') {
                const previewModes = document.querySelectorAll('input[name="previewMode"]');
                previewModes.forEach(radio => {
                    radio.addEventListener('change', () => {
                        updatePreviewMode();
                    });
                });
                updatePreviewMode();
            }
        });
    });

    // Update preview on content change
    const contentEditor = document.getElementById('contentEditor');
    let previewUpdateTimeout;
    contentEditor.addEventListener('input', () => {
        // Debounce preview updates
        clearTimeout(previewUpdateTimeout);
        previewUpdateTimeout = setTimeout(() => {
            const previewTab = document.querySelector('[data-tab="preview"]');
            if (previewTab && previewTab.classList.contains('active')) {
                updatePreview();
            }
        }, 300);
    });

    // Update preview on frontmatter change
    const frontmatterEditor = document.getElementById('frontmatterEditor');
    if (frontmatterEditor) {
        frontmatterEditor.addEventListener('input', () => {
            // Debounce preview updates
            clearTimeout(previewUpdateTimeout);
            previewUpdateTimeout = setTimeout(() => {
                const previewTab = document.querySelector('[data-tab="preview"]');
                if (previewTab && previewTab.classList.contains('active')) {
                    updatePreview();
                }
            }, 300);
        });
    }

    // Save button
    document.getElementById('saveBtn').addEventListener('click', savePost);
    
    // Image upload button
    document.getElementById('uploadImageBtn').addEventListener('click', uploadImage);
}

// Update preview mode
function updatePreviewMode() {
    const previewContainer = document.getElementById('previewContainer');
    const liveFrame = document.getElementById('livePreviewFrame');
    const previewModes = document.querySelectorAll('input[name="previewMode"]');
    
    if (!previewContainer || !liveFrame) return;
    
    const selectedMode = Array.from(previewModes).find(r => r.checked)?.value || 'rendered';
    
    if (selectedMode === 'live') {
        previewContainer.style.display = 'none';
        liveFrame.style.display = 'block';
        updateLivePreview();
    } else {
        previewContainer.style.display = 'block';
        liveFrame.style.display = 'none';
        updatePreview();
    }
}

// Update live preview iframe
function updateLivePreview() {
    const liveFrame = document.getElementById('livePreviewFrame');
    if (!liveFrame || !currentPost) return;
    
    // Get the post URL from filename
    // Hugo typically serves posts at /posts/filename/ or similar
    const filename = currentPost.replace('.md', '').replace(/\\/g, '/');
    const pathParts = filename.split('/');
    const slug = pathParts[pathParts.length - 1];
    
    // Try common Hugo URL patterns
    const possibleUrls = [
        `${hugoServerUrl}/${slug}/`,
        `${hugoServerUrl}/posts/${slug}/`,
        `${hugoServerUrl}/${filename.replace('.md', '')}/`
    ];
    
    // Try the first URL (most common pattern)
    liveFrame.src = possibleUrls[0];
    
    // Handle iframe load errors with timeout
    let loadTimeout = setTimeout(() => {
        liveFrame.onerror = null;
        liveFrame.srcdoc = `
            <html>
                <head><title>Preview Error</title></head>
                <body style="padding: 20px; font-family: sans-serif;">
                    <h2>Unable to load preview</h2>
                    <p>The Hugo server might not be running, or the URL pattern might be different.</p>
                    <p>Current URL: ${possibleUrls[0]}</p>
                    <p>Make sure your Hugo server is running at: <strong>${hugoServerUrl}</strong></p>
                    <p>Common Hugo URL patterns:</p>
                    <ul>
                        <li>${possibleUrls[0]}</li>
                        <li>${possibleUrls[1]}</li>
                        <li>${possibleUrls[2]}</li>
                    </ul>
                </body>
            </html>
        `;
    }, 3000);
    
    liveFrame.onload = () => {
        clearTimeout(loadTimeout);
    };
}

// Render preview
function renderPreview(content, frontmatter) {
    if (typeof marked === 'undefined') {
        return '<p class="error">Markdown parser not loaded. Please refresh the page.</p>';
    }

    // Configure marked options
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    try {
        const html = marked.parse(content || '');
        const title = frontmatter?.title || 'Untitled';
        const date = frontmatter?.date ? new Date(frontmatter.date).toLocaleDateString() : '';
        
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

// Update preview content
function updatePreview() {
    const contentEditor = document.getElementById('contentEditor');
    const previewContainer = document.getElementById('previewContainer');
    
    if (!contentEditor || !previewContainer) return;
    
    const content = contentEditor.value;
    
    // Get current frontmatter from inputs if available
    let frontmatter = currentPostData?.frontmatter || {};
    const frontmatterEditor = document.getElementById('frontmatterEditor');
    if (frontmatterEditor) {
        const frontmatterInputs = frontmatterEditor.querySelectorAll('[data-key]');
        const updatedFrontmatter = { ...frontmatter };
        
        frontmatterInputs.forEach(input => {
            const key = input.dataset.key;
            if (input.type === 'checkbox') {
                updatedFrontmatter[key] = input.checked;
            } else if (input.tagName === 'TEXTAREA') {
                const value = input.value.trim();
                try {
                    if (value.startsWith('[') || value.startsWith('{')) {
                        updatedFrontmatter[key] = JSON.parse(value);
                    } else if (value.includes('\n')) {
                        updatedFrontmatter[key] = value.split('\n').filter(v => v.trim());
                    } else {
                        updatedFrontmatter[key] = value;
                    }
                } catch {
                    updatedFrontmatter[key] = value;
                }
            } else {
                updatedFrontmatter[key] = input.value;
            }
        });
        frontmatter = updatedFrontmatter;
    }
    
    previewContainer.innerHTML = renderPreview(content, frontmatter);
}

// Render frontmatter editor
function renderFrontmatterEditor(frontmatter) {
    const fields = Object.keys(frontmatter || {});
    
    if (fields.length === 0) {
        return '<p class="empty-state">No frontmatter fields</p>';
    }

    return fields.map(key => {
        const value = frontmatter[key];
        const isBoolean = typeof value === 'boolean';
        const isArray = Array.isArray(value);
        const isObject = typeof value === 'object' && value !== null && !isArray;
        
        if (isBoolean) {
            return `
                <div class="form-group">
                    <label>
                        <input type="checkbox" data-key="${key}" ${value ? 'checked' : ''} />
                        ${key}
                    </label>
                </div>
            `;
        } else if (isArray) {
            return `
                <div class="form-group">
                    <label>${key}:</label>
                    <textarea data-key="${key}" placeholder="One item per line">${value.join('\n')}</textarea>
                </div>
            `;
        } else if (isObject) {
            return `
                <div class="form-group">
                    <label>${key}:</label>
                    <textarea data-key="${key}" placeholder="JSON object">${JSON.stringify(value, null, 2)}</textarea>
                </div>
            `;
        } else {
            return `
                <div class="form-group">
                    <label>${key}:</label>
                    <input type="text" data-key="${key}" value="${escapeHtml(String(value))}" />
                </div>
            `;
        }
    }).join('');
}

// Save post using File System Access API
async function savePost() {
    if (!currentPostFileHandle) return;

    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
        // Get content
        const content = document.getElementById('contentEditor').value;

        // Get frontmatter
        const frontmatter = { ...currentPostData.frontmatter };
        const frontmatterInputs = document.querySelectorAll('#frontmatterEditor [data-key]');
        
        frontmatterInputs.forEach(input => {
            const key = input.dataset.key;
            if (input.type === 'checkbox') {
                frontmatter[key] = input.checked;
            } else if (input.tagName === 'TEXTAREA') {
                const value = input.value.trim();
                // Try to parse as JSON or array
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

        // Reconstruct file content with frontmatter
        const fileContent = stringifyFrontmatter(content, frontmatter);
        
        // Write to file using File System Access API
        const writable = await currentPostFileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        
        showMessage('Post saved successfully!', 'success');
        loadPosts(); // Reload to get updated data
    } catch (error) {
        showMessage('Error saving post: ' + error.message, 'error');
        console.error('Error saving post:', error);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 Save Post';
    }
}

// New post modal
newPostBtn.addEventListener('click', () => {
    if (!contentDirectoryHandle) {
        showMessage('Please select a Hugo folder first', 'error');
        return;
    }
    newPostModal.classList.add('active');
    document.getElementById('newPostDate').value = new Date().toISOString().slice(0, 16);
});

closeModal.addEventListener('click', () => {
    newPostModal.classList.remove('active');
});

cancelNewPostBtn.addEventListener('click', () => {
    newPostModal.classList.remove('active');
});

newPostModal.addEventListener('click', (e) => {
    if (e.target === newPostModal) {
        newPostModal.classList.remove('active');
    }
});

// Upload image
async function uploadImage() {
    if (!hugoRootDirectoryHandle) {
        showMessage('Please select a Hugo folder first', 'error');
        return;
    }

    try {
        // Create file picker for images (allow multiple)
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

        // Get or create static/images directory
        let staticDirHandle;
        try {
            staticDirHandle = await hugoRootDirectoryHandle.getDirectoryHandle('static');
            staticDirectoryHandle = staticDirHandle; // Store for later use
        } catch (error) {
            // Create static directory if it doesn't exist
            staticDirHandle = await hugoRootDirectoryHandle.getDirectoryHandle('static', { create: true });
            staticDirectoryHandle = staticDirHandle;
        }

        let imagesDirHandle;
        try {
            imagesDirHandle = await staticDirHandle.getDirectoryHandle('images');
        } catch (error) {
            // Create images directory if it doesn't exist
            imagesDirHandle = await staticDirHandle.getDirectoryHandle('images', { create: true });
        }

        const contentEditor = document.getElementById('contentEditor');
        const cursorPos = contentEditor.selectionStart;
        const textBefore = contentEditor.value.substring(0, cursorPos);
        const textAfter = contentEditor.value.substring(cursorPos);
        
        let insertedMarkdown = '';
        let uploadedCount = 0;

        // Process each selected image
        for (const fileHandle of fileHandles) {
            try {
                const file = await fileHandle.getFile();
                
                // Generate unique filename with timestamp
                const timestamp = Date.now() + uploadedCount; // Add count to ensure uniqueness
                const originalName = file.name;
                const extension = originalName.substring(originalName.lastIndexOf('.'));
                const baseName = originalName.substring(0, originalName.lastIndexOf('.'));
                // Sanitize filename
                const sanitizedName = baseName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
                const newFileName = `${timestamp}-${sanitizedName}${extension}`;

                // Create new file in images directory
                const newFileHandle = await imagesDirHandle.getFileHandle(newFileName, { create: true });
                const writable = await newFileHandle.createWritable();
                
                // Write file content
                const fileContent = await file.arrayBuffer();
                await writable.write(fileContent);
                await writable.close();

                // Hugo image path (from static directory)
                const imagePath = `/images/${newFileName}`;
                const imageMarkdown = `![${baseName}](${imagePath})\n`;
                insertedMarkdown += imageMarkdown;
                uploadedCount++;
            } catch (error) {
                console.error('Error processing image:', error);
                showMessage(`Error uploading one image: ${error.message}`, 'error');
            }
        }

        if (uploadedCount > 0) {
            // Insert all markdown at cursor position
            contentEditor.value = textBefore + insertedMarkdown + textAfter;
            
            // Move cursor after inserted text
            const newCursorPos = cursorPos + insertedMarkdown.length;
            contentEditor.setSelectionRange(newCursorPos, newCursorPos);
            contentEditor.focus();
            
            // Update preview if it's active
            const previewTab = document.querySelector('[data-tab="preview"]');
            if (previewTab && previewTab.classList.contains('active')) {
                updatePreview();
            }
            
            showMessage(`Successfully uploaded ${uploadedCount} image(s)`, 'success');
            
            // Refresh media list if media sidebar is active
            const mediaTab = document.querySelector('[data-sidebar-tab="media"]');
            if (mediaTab && mediaTab.classList.contains('active')) {
                loadMedia();
            }
        }
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error uploading image:', error);
            showMessage('Error uploading image: ' + error.message, 'error');
        }
    }
}

// Load media library
async function loadMedia() {
    if (!hugoRootDirectoryHandle) {
        mediaList.innerHTML = '<p class="empty-state">Select a Hugo folder to see media</p>';
        return;
    }

    mediaList.innerHTML = '<p class="loading">Loading media...</p>';

    try {
        // Get or create static/images directory
        let staticDirHandle;
        try {
            staticDirHandle = await hugoRootDirectoryHandle.getDirectoryHandle('static');
        } catch (error) {
            mediaList.innerHTML = '<p class="empty-state">No static directory found</p>';
            return;
        }

        let imagesDirHandle;
        try {
            imagesDirHandle = await staticDirHandle.getDirectoryHandle('images');
        } catch (error) {
            mediaList.innerHTML = '<p class="empty-state">No images directory found</p>';
            return;
        }

        // Scan images
        const images = await scanImagesDirectory(imagesDirHandle);
        
        // Check which images are used
        const usedImages = await checkImageUsage();
        
        // Mark images as used/unused
        mediaItems = images.map(img => ({
            ...img,
            isUsed: usedImages.has(img.filename)
        }));
        
        renderMediaList();
    } catch (error) {
        mediaList.innerHTML = `<p class="error">Error loading media: ${error.message}</p>`;
        console.error('Error loading media:', error);
    }
}

// Scan images directory
async function scanImagesDirectory(directoryHandle, basePath = '') {
    const images = [];
    
    try {
        for await (const [name, handle] of directoryHandle.entries()) {
            if (handle.kind === 'directory') {
                // Recursively scan subdirectories
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

// Check which images are used in blog posts
async function checkImageUsage() {
    const usedImages = new Set();
    
    // Get all image references from posts
    for (const post of posts) {
        try {
            if (!post.fileHandle) continue;
            
            const file = await post.fileHandle.getFile();
            const content = await file.text();
            
            // Find all image references in markdown
            // Match patterns like: ![alt](/images/filename.jpg) or ![](/images/filename.jpg)
            const imageRegex = /!\[.*?\]\(([^)]+)\)/g;
            let match;
            
            while ((match = imageRegex.exec(content)) !== null) {
                const imagePath = match[1];
                // Extract filename from path
                const filename = imagePath.split('/').pop();
                if (filename) {
                    usedImages.add(filename);
                }
            }
        } catch (error) {
            console.error(`Error checking image usage in ${post.filename}:`, error);
        }
    }
    
    return usedImages;
}

// Render media list
function renderMediaList() {
    if (mediaItems.length === 0) {
        mediaList.innerHTML = '<p class="empty-state">No images found</p>';
        return;
    }

    // Sort by last modified (newest first)
    const sortedMedia = [...mediaItems].sort((a, b) => b.lastModified - a.lastModified);

    mediaList.innerHTML = sortedMedia.map(item => {
        const sizeKB = (item.size / 1024).toFixed(1);
        const date = new Date(item.lastModified).toLocaleDateString();
        const danglingBadge = item.isUsed ? '' : '<span class="dangling-badge">Dangling Media</span>';
        
        return `
            <div class="media-item ${item.isUsed ? '' : 'dangling'}" data-filename="${item.filename}">
                <div class="media-info">
                    <div class="media-name">${escapeHtml(item.name)}</div>
                    <div class="media-meta">
                        ${sizeKB} KB • ${date}
                        ${danglingBadge}
                    </div>
                </div>
                <div class="media-actions">
                    <button class="btn-small btn-delete" data-filename="${item.filename}" title="Delete">🗑️</button>
                </div>
            </div>
        `;
    }).join('');

    // Add delete button handlers
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const filename = btn.dataset.filename;
            if (confirm(`Are you sure you want to delete "${filename}"?`)) {
                await deleteImage(filename);
            }
        });
    });
}

// Delete image
async function deleteImage(filename) {
    try {
        const imageItem = mediaItems.find(item => item.filename === filename);
        if (!imageItem || !imageItem.fileHandle) {
            showMessage('Image not found', 'error');
            return;
        }

        // Get parent directory handle
        const staticDirHandle = await hugoRootDirectoryHandle.getDirectoryHandle('static');
        const imagesDirHandle = await staticDirHandle.getDirectoryHandle('images');
        
        // Parse filename to get path parts
        const pathParts = filename.split('/');
        const actualFilename = pathParts[pathParts.length - 1];
        
        // Navigate to subdirectory if needed
        let targetDir = imagesDirHandle;
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (pathParts[i]) {
                targetDir = await targetDir.getDirectoryHandle(pathParts[i]);
            }
        }
        
        // Remove file
        await targetDir.removeEntry(actualFilename);
        
        showMessage(`Image "${actualFilename}" deleted successfully`, 'success');
        loadMedia(); // Refresh media list
    } catch (error) {
        console.error('Error deleting image:', error);
        showMessage('Error deleting image: ' + error.message, 'error');
    }
}

// Create new post
newPostForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!contentDirectoryHandle) {
        showMessage('Please select a Hugo folder first', 'error');
        return;
    }

    const filename = document.getElementById('newPostFilename').value.trim();
    const title = document.getElementById('newPostTitle').value.trim();
    const date = document.getElementById('newPostDate').value;
    const draft = document.getElementById('newPostDraft').checked;

    if (!filename) {
        alert('Please enter a filename');
        return;
    }

    try {
        // Parse filename to get path parts
        const pathParts = filename.split('/');
        const actualFilename = pathParts.pop();
        const finalFilename = actualFilename.endsWith('.md') ? actualFilename : `${actualFilename}.md`;
        
        // Navigate to the correct directory in content folder
        let targetDir = contentDirectoryHandle;
        for (const part of pathParts) {
            if (part) {
                try {
                    targetDir = await targetDir.getDirectoryHandle(part);
                } catch (error) {
                    // Directory doesn't exist, create it
                    targetDir = await targetDir.getDirectoryHandle(part, { create: true });
                }
            }
        }

        // Check if file already exists
        try {
            await targetDir.getFileHandle(finalFilename);
            showMessage('File already exists', 'error');
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
        
        showMessage('Post created successfully!', 'success');
        newPostModal.classList.remove('active');
        newPostForm.reset();
        loadPosts();
        
        // Load the new post
        const relativePath = pathParts.length > 0 
            ? `${pathParts.join('/')}/${finalFilename}`
            : finalFilename;
        setTimeout(() => {
            loadPost(relativePath);
        }, 500);
    } catch (error) {
        showMessage('Error creating post: ' + error.message, 'error');
        console.error('Error creating post:', error);
    }
});

// Parse frontmatter from markdown content
function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
        return { data: {}, content: content };
    }
    
    const yamlContent = match[1];
    const markdownContent = match[2];
    
    // Use js-yaml if available, otherwise fall back to simple parser
    let data = {};
    if (typeof jsyaml !== 'undefined') {
        try {
            data = jsyaml.load(yamlContent) || {};
        } catch (error) {
            console.warn('Error parsing YAML with js-yaml, using fallback:', error);
            data = parseYamlSimple(yamlContent);
        }
    } else {
        data = parseYamlSimple(yamlContent);
    }
    
    return { data, content: markdownContent };
}

// Simple YAML parser fallback
function parseYamlSimple(yamlContent) {
    const data = {};
    const lines = yamlContent.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        // Try to parse as boolean
        if (value === 'true') {
            data[key] = true;
        } else if (value === 'false') {
            data[key] = false;
        } else if (value === 'null' || value === '~') {
            data[key] = null;
        } else if (!isNaN(value) && value !== '') {
            // Try to parse as number
            data[key] = Number(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Stringify frontmatter to markdown format
function stringifyFrontmatter(content, frontmatter) {
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
        return content;
    }
    
    // Use js-yaml if available for better YAML formatting
    let yamlContent;
    if (typeof jsyaml !== 'undefined') {
        try {
            yamlContent = jsyaml.dump(frontmatter, {
                lineWidth: -1,
                noRefs: true,
                quotingType: '"',
                forceQuotes: false
            }).trim();
        } catch (error) {
            console.warn('Error stringifying YAML with js-yaml, using fallback:', error);
            yamlContent = stringifyYamlSimple(frontmatter);
        }
    } else {
        yamlContent = stringifyYamlSimple(frontmatter);
    }
    
    return `---\n${yamlContent}\n---\n${content}`;
}

// Simple YAML stringifier fallback
function stringifyYamlSimple(frontmatter) {
    const yamlLines = [];
    for (const [key, value] of Object.entries(frontmatter)) {
        if (value === null || value === undefined) {
            yamlLines.push(`${key}: null`);
        } else if (typeof value === 'boolean') {
            yamlLines.push(`${key}: ${value}`);
        } else if (typeof value === 'number') {
            yamlLines.push(`${key}: ${value}`);
        } else if (Array.isArray(value)) {
            yamlLines.push(`${key}:`);
            value.forEach(item => {
                yamlLines.push(`  - ${item}`);
            });
        } else if (typeof value === 'object') {
            yamlLines.push(`${key}:`);
            for (const [subKey, subValue] of Object.entries(value)) {
                yamlLines.push(`  ${subKey}: ${subValue}`);
            }
        } else {
            // Escape if needed
            const stringValue = String(value);
            if (stringValue.includes(':') || stringValue.includes('\n') || stringValue.includes('"')) {
                yamlLines.push(`${key}: "${stringValue.replace(/"/g, '\\"')}"`);
            } else {
                yamlLines.push(`${key}: ${stringValue}`);
            }
        }
    }
    return yamlLines.join('\n');
}

// Render posts list
function renderPostsList() {
    if (posts.length === 0) {
        postsList.innerHTML = '<p class="empty-state">No posts found</p>';
        return;
    }

    postsList.innerHTML = posts.map(post => `
        <div class="post-item" data-filename="${post.filename}">
            <h3>${post.title || post.filename}</h3>
            <div class="post-meta">
                ${post.date ? new Date(post.date).toLocaleDateString() : 'No date'}
                ${post.draft ? ' • Draft' : ''}
            </div>
            <div class="post-filename">${post.filename}</div>
        </div>
    `).join('');

    // Add click handlers
    document.querySelectorAll('.post-item').forEach(item => {
        item.addEventListener('click', () => {
            const filename = item.dataset.filename;
            loadPost(filename);
            document.querySelectorAll('.post-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Utility functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.textContent = message;
    
    const header = document.querySelector('header');
    header.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}
