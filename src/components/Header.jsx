import React, { useState, useEffect } from 'react';
import { useFileSystem } from '../contexts/FileSystemContext';

function Header() {
  const { currentFolderName, selectFolder, hasAccess } = useFileSystem();
  const [hugoServerUrl, setHugoServerUrl] = useState('http://localhost:1313');
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);

  useEffect(() => {
    const savedUrl = localStorage.getItem('hugoServerUrl');
    if (savedUrl) {
      setHugoServerUrl(savedUrl);
    }
  }, []);

  const handleSelectFolder = async () => {
    try {
      await selectFolder();
      showMessage('Folder selected successfully!', 'success');
    } catch (error) {
      showMessage(error.message, 'error');
    }
  };

  const handleUrlChange = (e) => {
    const url = e.target.value.trim();
    setHugoServerUrl(url);
    localStorage.setItem('hugoServerUrl', url);
  };

  const showMessage = (msg, type) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => {
      setMessage(null);
      setMessageType(null);
    }, 3000);
  };

  return (
    <header>
      <h1>📝 Hugo Simple CMS</h1>
      <div className="header-controls">
        <div className="folder-selector">
          <button 
            id="selectFolderBtn" 
            className="btn-primary"
            onClick={handleSelectFolder}
            disabled={!window.showDirectoryPicker}
          >
            {!window.showDirectoryPicker 
              ? '⚠️ File System Access API not supported'
              : '📁 Select Hugo Folder'
            }
          </button>
        </div>
        <div className="server-url-input">
          <label htmlFor="hugoServerUrl">Hugo Server URL:</label>
          <input
            type="text"
            id="hugoServerUrl"
            value={hugoServerUrl}
            onChange={handleUrlChange}
            placeholder="http://localhost:1313"
          />
        </div>
      </div>
      <div id="currentFolder" className={`current-folder ${hasAccess ? 'active' : ''}`}>
        {currentFolderName ? `Current folder: ${currentFolderName}` : ''}
      </div>
      {message && (
        <div className={messageType}>{message}</div>
      )}
      {!window.showDirectoryPicker && (
        <p className="error">
          This browser does not support the File System Access API. Please use Chrome, Edge, or another Chromium-based browser.
        </p>
      )}
    </header>
  );
}

export default Header;
