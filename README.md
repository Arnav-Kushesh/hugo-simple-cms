# Hugo Simple CMS

A simple, browser-based content management system for Hugo static sites. Edit and create blog posts directly from your browser without needing to manually edit markdown files.

## Features

- 📁 **Native Folder Selection**: Use Chrome's File System Access API to select your Hugo folder with a native file explorer
- 📝 **Browse Posts**: View all blog posts from your Hugo content directory
- ✏️ **Edit Posts**: Edit both content and frontmatter in a user-friendly interface
- 👁️ **Dual Preview Modes**: 
  - Rendered preview with real-time markdown rendering
  - Live preview using iframe to show your actual Hugo site
- ➕ **Create Posts**: Create new blog posts with proper frontmatter
- 🖼️ **Image Upload**: Upload images directly to your Hugo site's `static/images/` directory and automatically insert markdown image syntax
- 📚 **Media Manager**: Browse all uploaded images, see which ones are unused ("Dangling Media"), and delete images you no longer need
- 🔄 **Direct File Access**: Read and write files directly using browser APIs (no server-side file operations needed)
- 📂 **Recursive Scanning**: Automatically finds all markdown files in subdirectories

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Development

The project is built with React and Vite. For development:

```bash
# Start the backend server
npm start

# In another terminal, start the Vite dev server
npm run dev:client
```

Then open `http://localhost:3001` in your browser.

## Building for Production

```bash
npm run build
```

This will build the React app into the `public` directory, which the Express server will serve.

## Usage

1. Start the server:

```bash
npm start
```

2. Open your browser (Chrome, Edge, or another Chromium-based browser) and navigate to:

```
http://localhost:3000
```

3. Click the "Select Hugo Folder" button and choose your Hugo site root folder (the folder containing the `content` directory)

4. Start editing your blog posts!

**Note**: The File System Access API is currently only supported in Chromium-based browsers (Chrome, Edge, etc.). The app will show a warning if your browser doesn't support it.

## How It Works

- Uses Chrome's **File System Access API** to access your local files directly from the browser
- The CMS scans the `content/` directory of your Hugo site
- It reads all `.md` files and parses their frontmatter using js-yaml
- You can edit the markdown content and frontmatter separately
- **Dual Preview Modes**: 
  - **Rendered Preview**: Switch to the Preview tab to see a rendered version of your blog post that updates in real-time as you type (uses markdown parser)
  - **Live Preview**: Enter your Hugo server URL (e.g., `http://localhost:1313`) and switch to "Live Server" mode to see your actual Hugo site in an iframe
- **Image Upload**: Click the "Upload Image" button to select images, which are automatically saved to `static/images/` and inserted as markdown image syntax at your cursor position
- **Media Manager**: 
  - Click the "🖼️ Media" tab in the sidebar to browse all uploaded images
  - Images that aren't referenced in any blog post are marked as "Dangling Media"
  - Delete unused images directly from the media manager
  - Refresh button to update the media list after changes
- Changes are saved directly back to the original files using the File System Access API
- New posts are created with proper Hugo frontmatter format
- All file operations happen in the browser - no server-side file access needed

## Requirements

- Node.js (v12 or higher)
- A Hugo site with a `content/` directory
- Chrome, Edge, or another Chromium-based browser (for File System Access API support)

## Technical Details

The CMS uses Chrome's File System Access API to:
- Request permission to access a directory via `window.showDirectoryPicker()`
- Read files directly from the selected directory
- Write changes back to files using `FileSystemWritableFileStream`
- Maintain file handles for efficient file operations

The backend server only serves the static files. All file operations happen in the browser using the File System Access API.

## Security Note

This CMS is designed for local development use. The File System Access API requires explicit user permission for each folder selection, providing a secure way to access local files. The server only serves static files and does not handle file operations.

## License

MIT
