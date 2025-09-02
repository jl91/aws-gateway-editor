import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private isElectron: boolean;
  private electronAPI: any;
  private eventSubjects: Map<string, Subject<any>> = new Map();

  constructor() {
    this.isElectron = !!(window && window.electronAPI);
    if (this.isElectron) {
      this.electronAPI = window.electronAPI;
      this.setupEventListeners();
    }
  }

  private setupEventListeners(): void {
    const events = [
      'menu-new-gateway',
      'menu-open-folder',
      'menu-save',
      'menu-save-as',
      'menu-about',
      'file-changed',
      'git-status-changed'
    ];

    events.forEach(event => {
      const subject = new Subject<any>();
      this.eventSubjects.set(event, subject);
      
      if (this.electronAPI) {
        this.electronAPI.on(event, (_event: any, ...args: any[]) => {
          subject.next(args.length === 1 ? args[0] : args);
        });
      }
    });
  }

  public isElectronApp(): boolean {
    return this.isElectron;
  }

  public on(channel: string): Observable<any> {
    const subject = this.eventSubjects.get(channel);
    if (subject) {
      return subject.asObservable();
    }
    throw new Error(`Event channel '${channel}' not found`);
  }

  public async invoke(channel: string, ...args: any[]): Promise<any> {
    if (!this.isElectron) {
      throw new Error('Electron API not available');
    }
    return this.electronAPI.invoke(channel, ...args);
  }

  // File System Methods
  public async openFolder(): Promise<string | null> {
    if (!this.isElectron) {
      console.warn('Electron API not available');
      return null;
    }
    return this.electronAPI.fileSystem.openFolder();
  }

  public async readFile(filePath: string): Promise<string> {
    if (!this.isElectron) {
      throw new Error('Electron API not available');
    }
    return this.electronAPI.fileSystem.readFile(filePath);
  }

  public async writeFile(filePath: string, content: string): Promise<boolean> {
    if (!this.isElectron) {
      throw new Error('Electron API not available');
    }
    return this.electronAPI.fileSystem.writeFile(filePath, content);
  }

  public async fileExists(filePath: string): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    return this.electronAPI.fileSystem.exists(filePath);
  }

  public async listFiles(dirPath: string, extensions?: string[]): Promise<string[]> {
    if (!this.isElectron) {
      return [];
    }
    return this.electronAPI.fileSystem.listFiles(dirPath, extensions);
  }

  // Git Methods
  public async isGitRepository(path: string): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    return this.electronAPI.git.isRepository(path);
  }

  public async getGitStatus(path: string): Promise<any> {
    if (!this.isElectron) {
      return null;
    }
    return this.electronAPI.git.status(path);
  }

  public async gitCommit(path: string, message: string, files: string[]): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    return this.electronAPI.git.commit(path, message, files);
  }

  public async getGitDiff(path: string, file?: string): Promise<string> {
    if (!this.isElectron) {
      return '';
    }
    return this.electronAPI.git.diff(path, file);
  }

  public async getGitLog(path: string, limit?: number): Promise<any[]> {
    if (!this.isElectron) {
      return [];
    }
    return this.electronAPI.git.log(path, limit);
  }

  // GitHub Methods
  public async authenticateGitHub(token: string): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    return this.electronAPI.github.authenticate(token);
  }

  public async listGitHubRepos(): Promise<any[]> {
    if (!this.isElectron) {
      return [];
    }
    return this.electronAPI.github.listRepos();
  }

  public async getGitHubRepo(owner: string, repo: string): Promise<any> {
    if (!this.isElectron) {
      return null;
    }
    return this.electronAPI.github.getRepo(owner, repo);
  }

  public async createPullRequest(owner: string, repo: string, data: any): Promise<any> {
    if (!this.isElectron) {
      return null;
    }
    return this.electronAPI.github.createPullRequest(owner, repo, data);
  }

  // App Methods
  public async getVersion(): Promise<string> {
    if (!this.isElectron) {
      return '0.0.0';
    }
    return this.electronAPI.app.getVersion();
  }

  public quit(): void {
    if (this.isElectron) {
      this.electronAPI.app.quit();
    }
  }

  public minimize(): void {
    if (this.isElectron) {
      this.electronAPI.app.minimize();
    }
  }

  public maximize(): void {
    if (this.isElectron) {
      this.electronAPI.app.maximize();
    }
  }

  public async isMaximized(): Promise<boolean> {
    if (!this.isElectron) {
      return false;
    }
    return this.electronAPI.app.isMaximized();
  }

  // Storage Methods
  public async getStorageItem(key: string): Promise<any> {
    if (!this.isElectron) {
      return localStorage.getItem(key);
    }
    return this.electronAPI.storage.get(key);
  }

  public async setStorageItem(key: string, value: any): Promise<void> {
    if (!this.isElectron) {
      localStorage.setItem(key, JSON.stringify(value));
      return;
    }
    return this.electronAPI.storage.set(key, value);
  }

  public async removeStorageItem(key: string): Promise<void> {
    if (!this.isElectron) {
      localStorage.removeItem(key);
      return;
    }
    return this.electronAPI.storage.remove(key);
  }

  public async clearStorage(): Promise<void> {
    if (!this.isElectron) {
      localStorage.clear();
      return;
    }
    return this.electronAPI.storage.clear();
  }
}