import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { ApiService } from './api.service';
import { OpenApiService, OpenAPIDocument } from './openapi.service';
import * as yaml from 'js-yaml';

export interface SaveState {
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  isAutoSaveEnabled: boolean;
  autoSaveInterval: number; // in seconds
}

export interface EndpointDocumentation {
  id: string;
  method: string;
  path: string;
  summary?: string;
  modified: string; // ISO 8601 timestamp
  curl: string;
}

export interface Project {
  id: string;
  name: string;
  path: string;
  type: 'local' | 'github';
  lastOpened: Date;
}

@Injectable({
  providedIn: 'root'
})
export class PersistenceService {
  private saveState$ = new BehaviorSubject<SaveState>({
    hasUnsavedChanges: false,
    lastSaved: null,
    isAutoSaveEnabled: false,
    autoSaveInterval: 60 // default 60 seconds
  });
  
  private originalDocument: OpenAPIDocument | null = null;
  private currentDocument: OpenAPIDocument | null = null;
  private autoSaveSubscription: any;
  private destroy$ = new Subject<void>();
  
  constructor(
    private apiService: ApiService,
    private openApiService: OpenApiService
  ) {
    this.setupAutoSave();
  }

  get saveState(): Observable<SaveState> {
    return this.saveState$.asObservable();
  }

  setDocument(document: OpenAPIDocument): void {
    if (!this.originalDocument) {
      this.originalDocument = JSON.parse(JSON.stringify(document));
    }
    this.currentDocument = document;
    this.checkForChanges();
  }

  getOriginalDocument(): OpenAPIDocument | null {
    return this.originalDocument ? JSON.parse(JSON.stringify(this.originalDocument)) : null;
  }

  private checkForChanges(): void {
    const hasChanges = this.originalDocument !== null && 
                      JSON.stringify(this.originalDocument) !== JSON.stringify(this.currentDocument);
    
    const currentState = this.saveState$.value;
    this.saveState$.next({
      ...currentState,
      hasUnsavedChanges: hasChanges
    });
  }

  async saveDocument(configId: string): Promise<boolean> {
    if (!this.currentDocument || !configId) {
      return false;
    }

    try {
      // Save to backend
      const result = await this.apiService.updateGatewayConfig(
        configId,
        {
          name: this.currentDocument.info.title,
          version: this.currentDocument.info.version,
          description: this.currentDocument.info.description,
          metadata: {
            servers: this.currentDocument.servers,
            security: this.currentDocument.security,
            tags: this.currentDocument.tags
          }
        }
      ).toPromise();
      
      if (result) {
        // Update state
        this.originalDocument = JSON.parse(JSON.stringify(this.currentDocument));
        this.saveState$.next({
          ...this.saveState$.value,
          hasUnsavedChanges: false,
          lastSaved: new Date()
        });
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }

  async exportDocument(configId: string, format: 'json' | 'yaml'): Promise<Blob | null> {
    try {
      return await this.apiService.exportConfig(configId, format).toPromise();
    } catch (error) {
      console.error('Failed to export document:', error);
      return null;
    }
  }

  enableAutoSave(enabled: boolean, intervalSeconds: number = 60): void {
    const currentState = this.saveState$.value;
    this.saveState$.next({
      ...currentState,
      isAutoSaveEnabled: enabled,
      autoSaveInterval: intervalSeconds
    });
    
    if (enabled) {
      this.startAutoSave();
    } else {
      this.stopAutoSave();
    }
  }

  private setupAutoSave(): void {
    this.saveState$.pipe(
      takeUntil(this.destroy$),
      filter(state => state.isAutoSaveEnabled),
      debounceTime(1000)
    ).subscribe(() => {
      this.startAutoSave();
    });
  }

  private startAutoSave(): void {
    this.stopAutoSave();
    
    const intervalMs = this.saveState$.value.autoSaveInterval * 1000;
    this.autoSaveSubscription = interval(intervalMs).pipe(
      takeUntil(this.destroy$),
      filter(() => this.saveState$.value.hasUnsavedChanges)
    ).subscribe(() => {
      // Auto save will be triggered here when implemented
      console.log('Auto-save triggered');
    });
  }

  private stopAutoSave(): void {
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
      this.autoSaveSubscription = null;
    }
  }

  hasUnsavedChanges(): boolean {
    return this.saveState$.value.hasUnsavedChanges;
  }

  reset(): void {
    this.originalDocument = null;
    this.currentDocument = null;
    this.saveState$.next({
      hasUnsavedChanges: false,
      lastSaved: null,
      isAutoSaveEnabled: false,
      autoSaveInterval: 60
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopAutoSave();
  }
}