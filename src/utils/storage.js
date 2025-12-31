// IndexedDB utilities for persisting File System Access API handles

const DB_NAME = 'hugo-cms-db';
const DB_VERSION = 1;
const STORE_NAME = 'directoryHandles';

// Open IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
}

// Save directory handle
export async function saveDirectoryHandle(key, handle) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // File System Access API handles can be stored directly in IndexedDB
        await store.put(handle, key);
        return true;
    } catch (error) {
        console.error('Error saving directory handle:', error);
        return false;
    }
}

// Get directory handle
export async function getDirectoryHandle(key) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error('Error getting directory handle:', error);
        return null;
    }
}

// Remove directory handle
export async function removeDirectoryHandle(key) {
    try {
        const db = await openDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        await store.delete(key);
        return true;
    } catch (error) {
        console.error('Error removing directory handle:', error);
        return false;
    }
}

// Verify handle is still valid
export async function verifyHandle(handle) {
    try {
        // Try to access the handle
        await handle.getDirectoryHandle('.', { create: false });
        return true;
    } catch (error) {
        return false;
    }
}
