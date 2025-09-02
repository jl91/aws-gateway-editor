import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  
  constructor() {}

  // Storage Methods using localStorage
  public getItem(key: string): any {
    const item = localStorage.getItem(key);
    if (item) {
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    }
    return null;
  }

  public setItem(key: string, value: any): void {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
  }

  public removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  public clear(): void {
    localStorage.clear();
  }

  // Recent projects
  public getRecentProjects(): any[] {
    return this.getItem('recentProjects') || [];
  }

  public addRecentProject(project: any): void {
    const recent = this.getRecentProjects();
    const filtered = recent.filter((p: any) => p.id !== project.id);
    filtered.unshift(project);
    // Keep only last 10 projects
    const limited = filtered.slice(0, 10);
    this.setItem('recentProjects', limited);
  }

  // User preferences
  public getPreferences(): any {
    return this.getItem('preferences') || {
      theme: 'light',
      autoSave: true,
      autoSaveInterval: 30000,
      defaultFormat: 'yaml'
    };
  }

  public setPreferences(preferences: any): void {
    this.setItem('preferences', preferences);
  }

  // Current workspace
  public getCurrentWorkspace(): any {
    return this.getItem('currentWorkspace');
  }

  public setCurrentWorkspace(workspace: any): void {
    this.setItem('currentWorkspace', workspace);
  }
}