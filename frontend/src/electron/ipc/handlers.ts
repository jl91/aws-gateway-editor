import { ipcMain, dialog, app, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export function setupIpcHandlers(): void {
  // File System Handlers
  ipcMain.handle('fs:open-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    
    if (result.canceled) {
      return null;
    }
    
    return result.filePaths[0];
  });

  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      return true;
    } catch (error) {
      console.error('Error writing file:', error);
      return false;
    }
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    return existsSync(filePath);
  });

  ipcMain.handle('fs:list-files', async (_event, dirPath: string, extensions?: string[]) => {
    try {
      // Function to recursively search for files
      async function searchFiles(dir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files: string[] = [];
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            // Skip common directories that shouldn't be searched
            if (!['node_modules', '.git', 'dist', 'build', '.vscode'].includes(entry.name)) {
              const subDirFiles = await searchFiles(fullPath);
              files.push(...subDirFiles);
            }
          } else if (entry.isFile()) {
            files.push(fullPath);
          }
        }
        
        return files;
      }
      
      let fileList = await searchFiles(dirPath);
      
      if (extensions && extensions.length > 0) {
        fileList = fileList.filter(file => {
          const ext = path.extname(file).toLowerCase().substring(1); // Remove the dot
          return extensions.some(e => ext === e.toLowerCase());
        });
      }
      
      return fileList;
    } catch (error) {
      console.error('Error listing files:', error);
      return [];
    }
  });

  // Git Handlers
  ipcMain.handle('git:is-repository', async (_event, repoPath: string) => {
    try {
      const gitPath = path.join(repoPath, '.git');
      return existsSync(gitPath);
    } catch (error) {
      return false;
    }
  });

  ipcMain.handle('git:status', async (_event, repoPath: string) => {
    try {
      const { stdout } = await execAsync('git status --porcelain', { cwd: repoPath });
      return stdout.split('\n').filter(line => line.trim()).map(line => {
        const [status, ...fileParts] = line.trim().split(' ');
        return {
          status,
          file: fileParts.join(' ')
        };
      });
    } catch (error) {
      console.error('Git status error:', error);
      return [];
    }
  });

  ipcMain.handle('git:commit', async (_event, repoPath: string, message: string, files: string[]) => {
    try {
      // Stage files
      for (const file of files) {
        await execAsync(`git add "${file}"`, { cwd: repoPath });
      }
      
      // Commit
      await execAsync(`git commit -m "${message}"`, { cwd: repoPath });
      return true;
    } catch (error) {
      console.error('Git commit error:', error);
      return false;
    }
  });

  ipcMain.handle('git:diff', async (_event, repoPath: string, file?: string) => {
    try {
      const command = file ? `git diff "${file}"` : 'git diff';
      const { stdout } = await execAsync(command, { cwd: repoPath });
      return stdout;
    } catch (error) {
      console.error('Git diff error:', error);
      return '';
    }
  });

  ipcMain.handle('git:log', async (_event, repoPath: string, limit = 10) => {
    try {
      const { stdout } = await execAsync(
        `git log --pretty=format:"%H|%an|%ae|%ad|%s" -n ${limit}`,
        { cwd: repoPath }
      );
      
      return stdout.split('\n').filter(line => line.trim()).map(line => {
        const [hash, author, email, date, message] = line.split('|');
        return { hash, author, email, date, message };
      });
    } catch (error) {
      console.error('Git log error:', error);
      return [];
    }
  });

  // GitHub Handlers (placeholder - needs Octokit implementation)
  ipcMain.handle('github:authenticate', async (_event, token: string) => {
    // TODO: Implement GitHub authentication
    console.log('GitHub auth with token:', token.substring(0, 4) + '...');
    return true;
  });

  ipcMain.handle('github:list-repos', async () => {
    // TODO: Implement GitHub repo listing
    return [];
  });

  ipcMain.handle('github:get-repo', async (_event, owner: string, repo: string) => {
    // TODO: Implement GitHub repo fetching
    console.log('Getting repo:', owner, repo);
    return null;
  });

  ipcMain.handle('github:create-pr', async (_event, owner: string, repo: string, data: any) => {
    // TODO: Implement PR creation
    console.log('Creating PR:', owner, repo, data);
    return null;
  });

  // App Handlers
  ipcMain.handle('app:get-version', () => {
    return app.getVersion();
  });

  ipcMain.on('app:quit', () => {
    app.quit();
  });

  ipcMain.on('app:minimize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      window.minimize();
    }
  });

  ipcMain.on('app:maximize', () => {
    const window = BrowserWindow.getFocusedWindow();
    if (window) {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }
  });

  ipcMain.handle('app:is-maximized', () => {
    const window = BrowserWindow.getFocusedWindow();
    return window ? window.isMaximized() : false;
  });

  // Storage Handlers (using electron-store would be better in production)
  const storage = new Map<string, any>();

  ipcMain.handle('storage:get', (_event, key: string) => {
    return storage.get(key);
  });

  ipcMain.handle('storage:set', (_event, key: string, value: any) => {
    storage.set(key, value);
    return true;
  });

  ipcMain.handle('storage:remove', (_event, key: string) => {
    storage.delete(key);
    return true;
  });

  ipcMain.handle('storage:clear', () => {
    storage.clear();
    return true;
  });
}