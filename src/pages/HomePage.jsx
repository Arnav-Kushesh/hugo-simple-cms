import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFileSystem } from "../contexts/FileSystemContext";
import { FiFolder, FiEdit3, FiImage, FiEye } from "react-icons/fi";

function HomePage() {
  const navigate = useNavigate();
  const { selectFolder } = useFileSystem();
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectFolder = async () => {
    if (!window.showDirectoryPicker) {
      setError(
        "File System Access API not supported. Please use Chrome, Edge, or another Chromium-based browser."
      );
      return;
    }

    setIsSelecting(true);
    setError(null);

    try {
      const success = await selectFolder();
      if (success) {
        navigate("/app");
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(err.message || "Failed to select folder");
      }
    } finally {
      setIsSelecting(false);
    }
  };

  return (
    <div className="homepage">
      <div className="homepage-container">
        <div className="homepage-content">
          <div className="logo-section">
            <h1 className="logo">HUGO ZERO</h1>
            <p className="tagline">Zero Setup Hugo CMS </p>
            <p className="subtitle">
              Just select your Hugo folder and start working
            </p>
          </div>

          <div className="features-section">
            <div className="feature-card">
              <div className="feature-icon">
                <FiFolder size={25} />
              </div>
              <h3>Zero Configuration</h3>
              <p>
                No setup required. Just point to your Hugo folder and you're
                ready to go.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiEdit3 size={25} />
              </div>
              <h3>Edit in Browser</h3>
              <p>
                Edit your blog posts directly in the browser with a beautiful
                interface.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiImage size={25} />
              </div>
              <h3>Media Management</h3>
              <p>
                Upload images, manage your media library, and track unused
                assets.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">
                <FiEye size={25} />
              </div>
              <h3>Live Preview</h3>
              <p>
                Preview your posts in real-time or connect to your Hugo dev
                server.
              </p>
            </div>
          </div>

          <div className="cta-section">
            {error && <div className="error-message">{error}</div>}
            <button
              className="glow-button"
              onClick={handleSelectFolder}
              disabled={isSelecting}
            >
              {isSelecting ? (
                <>
                  <span className="spinner"></span>
                  Selecting Folder...
                </>
              ) : (
                <>
                  <FiFolder size={20} />
                  Select Hugo Folder
                </>
              )}
            </button>
            <p className="cta-hint">
              Choose your Hugo site root folder to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HomePage;
