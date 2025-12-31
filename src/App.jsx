import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { FileSystemProvider } from './contexts/FileSystemContext';
import HomePage from './pages/HomePage';
import AppPage from './pages/AppPage';
import './index.css';

function App() {
  return (
    <FileSystemProvider>
      <Router>
        <Routes>
          <Route index element={<HomePage />} />
          <Route path="app" element={<AppPage />} />
        </Routes>
      </Router>
    </FileSystemProvider>
  );
}

export default App;
