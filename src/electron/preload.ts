import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export interface IElectronAPI {
  fileSystem: {
    openFolder: () => Promise<string | null>;
    readFile: (filePath: string) => Promise<string>;
    writeFile: (filePath: string, content: string) => Promise<boolean>;
    exists: (filePath: string) => Promise<boolean>;
    listFiles: (dirPath: string, extensions?: string[]) => Promise<string[]>;
  };
  git: {
    isRepository: (path: string) => Promise<boolean>;
    status: (path: string) => Promise<any>;
    commit: (path: string, message: string, files: string[]) => Promise<boolean>;
    diff: (path: string, file?: string) => Promise<string>;
    log: (path: string, limit?: number) => Promise<any[]>;
  };
  github: {
    authenticate: (token: string) => Promise<boolean>;
    listRepos: () => Promise<any[]>;
    getRepo: (owner: string, repo: string) => Promise<any>;
    createPullRequest: (owner: string, repo: string, data: any) => Promise<any>;
  };
  app: {
    getVersion: () => Promise<string>;
    quit: () => void;
    minimize: () => void;
    maximize: () => void;
    isMaximized: () => Promise<boolean>;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    remove: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => void;
  removeAllListeners: (channel: string) => void;
}

const electronAPI: IElectronAPI = {
  fileSystem: {
    openFolder: () => ipcRenderer.invoke('fs:open-folder'),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) => 
      ipcRenderer.invoke('fs:write-file', filePath, content),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
    listFiles: (dirPath: string, extensions?: string[]) => 
      ipcRenderer.invoke('fs:list-files', dirPath, extensions)
  },
  git: {
    isRepository: (path: string) => ipcRenderer.invoke('git:is-repository', path),
    status: (path: string) => ipcRenderer.invoke('git:status', path),
    commit: (path: string, message: string, files: string[]) => 
      ipcRenderer.invoke('git:commit', path, message, files),
    diff: (path: string, file?: string) => ipcRenderer.invoke('git:diff', path, file),
    log: (path: string, limit?: number) => ipcRenderer.invoke('git:log', path, limit)
  },
  github: {
    authenticate: (token: string) => ipcRenderer.invoke('github:authenticate', token),
    listRepos: () => ipcRenderer.invoke('github:list-repos'),
    getRepo: (owner: string, repo: string) => 
      ipcRenderer.invoke('github:get-repo', owner, repo),
    createPullRequest: (owner: string, repo: string, data: any) => 
      ipcRenderer.invoke('github:create-pr', owner, repo, data)
  },
  app: {
    getVersion: () => ipcRenderer.invoke('app:get-version'),
    quit: () => ipcRenderer.send('app:quit'),
    minimize: () => ipcRenderer.send('app:minimize'),
    maximize: () => ipcRenderer.send('app:maximize'),
    isMaximized: () => ipcRenderer.invoke('app:is-maximized')
  },
  storage: {
    get: (key: string) => ipcRenderer.invoke('storage:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('storage:set', key, value),
    remove: (key: string) => ipcRenderer.invoke('storage:remove', key),
    clear: () => ipcRenderer.invoke('storage:clear')
  },
  on: (channel: string, callback: (event: IpcRendererEvent, ...args: any[]) => void) => {
    const validChannels = [
      'menu-new-gateway',
      'menu-open-folder',
      'menu-save',
      'menu-save-as',
      'menu-about',
      'file-changed',
      'git-status-changed'
    ];
    
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, callback);
    }
  },
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel);
  }
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// Type augmentation for window object
declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}