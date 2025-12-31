const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const matter = require('gray-matter');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let hugoFolderPath = null;

// Set Hugo folder path
app.post('/api/set-folder', async (req, res) => {
  try {
    const { folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({ error: 'Folder path is required' });
    }

    // Check if folder exists
    try {
      await fs.access(folderPath);
      hugoFolderPath = folderPath;
      res.json({ success: true, message: 'Folder path set successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Folder does not exist or is not accessible' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current folder path
app.get('/api/get-folder', (req, res) => {
  res.json({ folderPath: hugoFolderPath });
});

// List all blog posts
app.get('/api/posts', async (req, res) => {
  try {
    if (!hugoFolderPath) {
      return res.status(400).json({ error: 'Hugo folder not set. Please set the folder path first.' });
    }

    const contentPath = path.join(hugoFolderPath, 'content');
    
    // Check if content directory exists
    try {
      await fs.access(contentPath);
    } catch (error) {
      return res.status(400).json({ error: 'Content directory not found. Make sure this is a valid Hugo site.' });
    }

    const posts = await scanContentDirectory(contentPath);
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get a specific blog post
app.get('/api/posts/:filename(*)', async (req, res) => {
  try {
    if (!hugoFolderPath) {
      return res.status(400).json({ error: 'Hugo folder not set' });
    }

    const filename = req.params.filename;
    const filePath = path.join(hugoFolderPath, 'content', filename);
    
    // Security check - ensure file is within content directory
    const contentPath = path.join(hugoFolderPath, 'content');
    const resolvedPath = path.resolve(filePath);
    const resolvedContentPath = path.resolve(contentPath);
    
    if (!resolvedPath.startsWith(resolvedContentPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(content);
    
    res.json({
      filename,
      frontmatter: parsed.data,
      content: parsed.content,
      raw: content
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save a blog post
app.put('/api/posts/:filename(*)', async (req, res) => {
  try {
    if (!hugoFolderPath) {
      return res.status(400).json({ error: 'Hugo folder not set' });
    }

    const filename = req.params.filename;
    const { frontmatter, content } = req.body;
    
    const filePath = path.join(hugoFolderPath, 'content', filename);
    
    // Security check
    const contentPath = path.join(hugoFolderPath, 'content');
    const resolvedPath = path.resolve(filePath);
    const resolvedContentPath = path.resolve(contentPath);
    
    if (!resolvedPath.startsWith(resolvedContentPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Reconstruct file with frontmatter
    const fileContent = matter.stringify(content || '', frontmatter || {});
    await fs.writeFile(filePath, fileContent, 'utf-8');
    
    res.json({ success: true, message: 'Post saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create a new blog post
app.post('/api/posts', async (req, res) => {
  try {
    if (!hugoFolderPath) {
      return res.status(400).json({ error: 'Hugo folder not set' });
    }

    const { filename, frontmatter, content } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Ensure filename ends with .md
    const finalFilename = filename.endsWith('.md') ? filename : `${filename}.md`;
    const filePath = path.join(hugoFolderPath, 'content', finalFilename);
    
    // Security check
    const contentPath = path.join(hugoFolderPath, 'content');
    const resolvedPath = path.resolve(filePath);
    const resolvedContentPath = path.resolve(contentPath);
    
    if (!resolvedPath.startsWith(resolvedContentPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file already exists
    try {
      await fs.access(filePath);
      return res.status(400).json({ error: 'File already exists' });
    } catch (error) {
      // File doesn't exist, which is what we want
    }

    // Ensure directory exists
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    // Create file with default frontmatter if not provided
    const defaultFrontmatter = {
      title: filename.replace('.md', '').replace(/-/g, ' '),
      date: new Date().toISOString(),
      draft: false,
      ...frontmatter
    };

    const fileContent = matter.stringify(content || '', defaultFrontmatter);
    await fs.writeFile(filePath, fileContent, 'utf-8');
    
    res.json({ success: true, message: 'Post created successfully', filename: finalFilename });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to scan content directory recursively
async function scanContentDirectory(dir, basePath = '') {
  const posts = [];
  
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(basePath, entry.name).replace(/\\/g, '/');
      
      if (entry.isDirectory()) {
        // Recursively scan subdirectories
        const subPosts = await scanContentDirectory(fullPath, relativePath);
        posts.push(...subPosts);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = await fs.readFile(fullPath, 'utf-8');
          const parsed = matter(content);
          
          posts.push({
            filename: relativePath,
            title: parsed.data.title || entry.name.replace('.md', ''),
            date: parsed.data.date || null,
            draft: parsed.data.draft !== undefined ? parsed.data.draft : false,
            ...parsed.data
          });
        } catch (error) {
          console.error(`Error reading ${fullPath}:`, error);
        }
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dir}:`, error);
  }
  
  return posts;
}

app.listen(PORT, () => {
  console.log(`Hugo Simple CMS server running at http://localhost:${PORT}`);
  console.log('Open your browser and navigate to http://localhost:3000');
});
