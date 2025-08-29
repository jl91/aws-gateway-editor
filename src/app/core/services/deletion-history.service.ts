import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DeletedEndpoint {
  id: string;
  endpoint: any;
  deletedAt: Date;
  deletedBy?: string;
  reason?: string;
}

export interface DeletionHistoryEntry {
  endpoints: DeletedEndpoint[];
  timestamp: Date;
  canUndo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DeletionHistoryService {
  private readonly MAX_HISTORY_SIZE = 50;
  private readonly UNDO_TIMEOUT_MS = 30000; // 30 seconds
  
  private history$ = new BehaviorSubject<DeletionHistoryEntry[]>([]);
  private undoStack$ = new BehaviorSubject<DeletionHistoryEntry[]>([]);
  
  constructor() {
    this.loadHistory();
  }
  
  get history(): Observable<DeletionHistoryEntry[]> {
    return this.history$.asObservable();
  }
  
  get undoStack(): Observable<DeletionHistoryEntry[]> {
    return this.undoStack$.asObservable();
  }
  
  get canUndo(): boolean {
    const stack = this.undoStack$.value;
    if (stack.length === 0) return false;
    
    const lastEntry = stack[stack.length - 1];
    const timeDiff = Date.now() - lastEntry.timestamp.getTime();
    return timeDiff < this.UNDO_TIMEOUT_MS;
  }
  
  addDeletion(endpoints: any[], reason?: string): void {
    const deletedEndpoints: DeletedEndpoint[] = endpoints.map(endpoint => ({
      id: endpoint.id,
      endpoint: JSON.parse(JSON.stringify(endpoint)), // Deep copy
      deletedAt: new Date(),
      reason
    }));
    
    const entry: DeletionHistoryEntry = {
      endpoints: deletedEndpoints,
      timestamp: new Date(),
      canUndo: true
    };
    
    // Add to history
    const history = this.history$.value;
    history.unshift(entry);
    
    // Limit history size
    if (history.length > this.MAX_HISTORY_SIZE) {
      history.pop();
    }
    
    this.history$.next(history);
    
    // Add to undo stack
    const undoStack = this.undoStack$.value;
    undoStack.push(entry);
    this.undoStack$.next(undoStack);
    
    // Set timeout to disable undo
    setTimeout(() => {
      entry.canUndo = false;
      this.history$.next([...this.history$.value]);
      this.removeFromUndoStack(entry);
    }, this.UNDO_TIMEOUT_MS);
    
    this.saveHistory();
  }
  
  undoLastDeletion(): DeletionHistoryEntry | null {
    const undoStack = this.undoStack$.value;
    if (undoStack.length === 0) return null;
    
    const lastEntry = undoStack.pop();
    if (!lastEntry || !lastEntry.canUndo) return null;
    
    this.undoStack$.next(undoStack);
    
    // Mark as restored in history
    const history = this.history$.value;
    const historyEntry = history.find(e => e === lastEntry);
    if (historyEntry) {
      historyEntry.canUndo = false;
    }
    this.history$.next(history);
    
    this.saveHistory();
    
    return lastEntry;
  }
  
  clearHistory(): void {
    this.history$.next([]);
    this.undoStack$.next([]);
    this.saveHistory();
  }
  
  getDeletedEndpoint(id: string): DeletedEndpoint | undefined {
    const history = this.history$.value;
    for (const entry of history) {
      const endpoint = entry.endpoints.find(e => e.id === id);
      if (endpoint) return endpoint;
    }
    return undefined;
  }
  
  restoreEndpoint(id: string): any | null {
    const deletedEndpoint = this.getDeletedEndpoint(id);
    if (!deletedEndpoint) return null;
    
    // Remove from history
    const history = this.history$.value;
    for (const entry of history) {
      const index = entry.endpoints.findIndex(e => e.id === id);
      if (index !== -1) {
        entry.endpoints.splice(index, 1);
        if (entry.endpoints.length === 0) {
          const entryIndex = history.indexOf(entry);
          history.splice(entryIndex, 1);
        }
        break;
      }
    }
    this.history$.next(history);
    this.saveHistory();
    
    return deletedEndpoint.endpoint;
  }
  
  private removeFromUndoStack(entry: DeletionHistoryEntry): void {
    const undoStack = this.undoStack$.value;
    const index = undoStack.indexOf(entry);
    if (index !== -1) {
      undoStack.splice(index, 1);
      this.undoStack$.next(undoStack);
    }
  }
  
  private loadHistory(): void {
    try {
      const stored = localStorage.getItem('deletion-history');
      if (stored) {
        const history = JSON.parse(stored);
        // Convert date strings back to Date objects
        history.forEach((entry: any) => {
          entry.timestamp = new Date(entry.timestamp);
          entry.endpoints.forEach((endpoint: any) => {
            endpoint.deletedAt = new Date(endpoint.deletedAt);
          });
          // Disable undo for old entries
          const timeDiff = Date.now() - entry.timestamp.getTime();
          entry.canUndo = timeDiff < this.UNDO_TIMEOUT_MS;
        });
        this.history$.next(history);
      }
    } catch (error) {
      console.error('Failed to load deletion history:', error);
    }
  }
  
  private saveHistory(): void {
    try {
      localStorage.setItem('deletion-history', JSON.stringify(this.history$.value));
    } catch (error) {
      console.error('Failed to save deletion history:', error);
    }
  }
}