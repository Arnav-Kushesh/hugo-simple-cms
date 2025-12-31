import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { saveDirectoryHandle, getDirectoryHandle, verifyHandle } from '../utils/storage';

const FileSystemContext = createContext();

export function useFileSystem() {
    const context = useContext(FileSystemContext);
    if (!context) {
        throw new Error('useFileSystem must be used within FileSystemProvider');
    }
    return context;
}

export function FileSystemProvider({ children }) {
    const [hugoRootHandle, setHugoRootHandle] = useState(null);
    const [contentHandle, setContentHandle] = useState(null);
    const [staticHandle, setStaticHandle] = useState(null);
    const [currentFolderName, setCurrentFolderName] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // Load saved directory handle on mount
    useEffect(() => {
        async function loadSavedHandle() {
            try {
                const savedHandle = await getDirectoryHandle('hugoRoot');
                if (savedHandle) {
                    const isValid = await verifyHandle(savedHandle);
                    if (isValid) {
                        await initializeHandles(savedHandle);
                    }
                }
            } catch (error) {
                console.error('Error loading saved handle:', error);
            } finally {
                setIsLoading(false);
            }
        }
        loadSavedHandle();
    }, []);

    const initializeHandles = async (rootHandle) => {
        try {
            // Get content directory
            const contentDirHandle = await rootHandle.getDirectoryHandle('content');
            setContentHandle(contentDirHandle);
            
            // Try to get static directory
            try {
                const staticDirHandle = await rootHandle.getDirectoryHandle('static');
                setStaticHandle(staticDirHandle);
            } catch (error) {
                setStaticHandle(null);
            }
            
            setHugoRootHandle(rootHandle);
            setCurrentFolderName(rootHandle.name);
            
            // Save handle for persistence
            await saveDirectoryHandle('hugoRoot', rootHandle);
        } catch (error) {
            throw new Error('Failed to initialize directory handles: ' + error.message);
        }
    };

    const selectFolder = useCallback(async () => {
        try {
            if (!window.showDirectoryPicker) {
                throw new Error('File System Access API not supported');
            }

            const directoryHandle = await window.showDirectoryPicker();
            
            // Verify it has content directory
            try {
                await directoryHandle.getDirectoryHandle('content');
            } catch (error) {
                throw new Error('Please select the Hugo site root folder (the folder containing the "content" directory)');
            }

            await initializeHandles(directoryHandle);
            return true;
        } catch (error) {
            if (error.name !== 'AbortError') {
                throw error;
            }
            return false;
        }
    }, []);

    const value = {
        hugoRootHandle,
        contentHandle,
        staticHandle,
        currentFolderName,
        isLoading,
        selectFolder,
        hasAccess: !!hugoRootHandle
    };

    return (
        <FileSystemContext.Provider value={value}>
            {children}
        </FileSystemContext.Provider>
    );
}
