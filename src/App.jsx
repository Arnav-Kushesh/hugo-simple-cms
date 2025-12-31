import React, { useState } from 'react';
import { FileSystemProvider } from './contexts/FileSystemContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import './index.css';

function App() {
  const [currentPost, setCurrentPost] = useState(null);
  const [sidebarTab, setSidebarTab] = useState('posts');

  return (
    <FileSystemProvider>
      <div className="container">
        <Header />
        <div className="main-content">
          <Sidebar 
            sidebarTab={sidebarTab} 
            setSidebarTab={setSidebarTab}
            currentPost={currentPost}
            setCurrentPost={setCurrentPost}
          />
          <Editor 
            currentPost={currentPost}
            setCurrentPost={setCurrentPost}
          />
        </div>
      </div>
    </FileSystemProvider>
  );
}

export default App;
