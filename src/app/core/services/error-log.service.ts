import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  message: string;
  details?: string;
  source: 'file-open' | 'validation' | 'parsing' | 'network' | 'system';
  severity: 'error' | 'warning' | 'info';
  context?: any;
  stack?: string;
  filePath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ErrorLogService {
  private errorLogs$ = new BehaviorSubject<ErrorLogEntry[]>([]);
  private maxLogEntries = 100;

  constructor() {
    this.loadLogsFromStorage();
  }

  get errorLogs(): Observable<ErrorLogEntry[]> {
    return this.errorLogs$.asObservable();
  }

  logError(
    message: string,
    source: ErrorLogEntry['source'],
    details?: string,
    context?: any,
    filePath?: string
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      message,
      details,
      source,
      severity: 'error',
      context,
      filePath,
      stack: new Error().stack
    };

    this.addLogEntry(entry);
  }

  logWarning(
    message: string,
    source: ErrorLogEntry['source'],
    details?: string,
    context?: any
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      message,
      details,
      source,
      severity: 'warning',
      context
    };

    this.addLogEntry(entry);
  }

  logInfo(
    message: string,
    source: ErrorLogEntry['source'],
    details?: string,
    context?: any
  ): void {
    const entry: ErrorLogEntry = {
      id: this.generateId(),
      timestamp: new Date(),
      message,
      details,
      source,
      severity: 'info',
      context
    };

    this.addLogEntry(entry);
  }

  private addLogEntry(entry: ErrorLogEntry): void {
    const currentLogs = this.errorLogs$.value;
    const updatedLogs = [entry, ...currentLogs].slice(0, this.maxLogEntries);
    this.errorLogs$.next(updatedLogs);
    this.saveLogsToStorage(updatedLogs);
    
    // Also log to console for debugging
    const consoleMethod = entry.severity === 'error' ? console.error : 
                         entry.severity === 'warning' ? console.warn : 
                         console.log;
    consoleMethod(`[${entry.source}] ${entry.message}`, entry.details, entry.context);
  }

  clearLogs(): void {
    this.errorLogs$.next([]);
    localStorage.removeItem('errorLogs');
  }

  getLogsBySource(source: ErrorLogEntry['source']): ErrorLogEntry[] {
    return this.errorLogs$.value.filter(log => log.source === source);
  }

  getLogsBySeverity(severity: ErrorLogEntry['severity']): ErrorLogEntry[] {
    return this.errorLogs$.value.filter(log => log.severity === severity);
  }

  getRecentLogs(count: number = 10): ErrorLogEntry[] {
    return this.errorLogs$.value.slice(0, count);
  }

  exportLogs(): string {
    const logs = this.errorLogs$.value;
    const exportData = logs.map(log => ({
      timestamp: log.timestamp.toISOString(),
      severity: log.severity,
      source: log.source,
      message: log.message,
      details: log.details,
      filePath: log.filePath,
      context: log.context ? JSON.stringify(log.context) : undefined
    }));

    return JSON.stringify(exportData, null, 2);
  }

  hasErrors(): boolean {
    return this.errorLogs$.value.some(log => log.severity === 'error');
  }

  getErrorCount(): number {
    return this.errorLogs$.value.filter(log => log.severity === 'error').length;
  }

  getWarningCount(): number {
    return this.errorLogs$.value.filter(log => log.severity === 'warning').length;
  }

  private generateId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadLogsFromStorage(): void {
    const stored = localStorage.getItem('errorLogs');
    if (stored) {
      try {
        const logs = JSON.parse(stored);
        // Convert stored timestamps back to Date objects
        const parsedLogs = logs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
        this.errorLogs$.next(parsedLogs.slice(0, this.maxLogEntries));
      } catch (error) {
        console.error('Failed to load error logs from storage:', error);
      }
    }
  }

  private saveLogsToStorage(logs: ErrorLogEntry[]): void {
    try {
      // Only save essential data to storage
      const logsToSave = logs.slice(0, 50).map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        message: log.message,
        details: log.details,
        source: log.source,
        severity: log.severity,
        filePath: log.filePath
      }));
      localStorage.setItem('errorLogs', JSON.stringify(logsToSave));
    } catch (error) {
      console.error('Failed to save error logs to storage:', error);
    }
  }
}