import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ErrorLogService, ErrorLogEntry } from '../../core/services/error-log.service';

@Component({
  selector: 'app-error-log-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatTooltipModule,
    MatExpansionModule,
    MatBadgeModule,
    MatMenuModule,
    MatSnackBarModule
  ],
  templateUrl: './error-log-modal.component.html',
  styleUrls: ['./error-log-modal.component.scss']
})
export class ErrorLogModalComponent implements OnInit {
  errorLogs: ErrorLogEntry[] = [];
  filteredLogs: ErrorLogEntry[] = [];
  selectedTab = 0;
  
  errorCount = 0;
  warningCount = 0;
  infoCount = 0;

  displayedColumns = ['timestamp', 'severity', 'source', 'message', 'actions'];

  constructor(
    public dialogRef: MatDialogRef<ErrorLogModalComponent>,
    private errorLogService: ErrorLogService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadLogs();
  }

  private loadLogs(): void {
    this.errorLogService.errorLogs.subscribe(logs => {
      this.errorLogs = logs;
      this.updateCounts();
      this.filterLogsByTab();
    });
  }

  private updateCounts(): void {
    this.errorCount = this.errorLogs.filter(log => log.severity === 'error').length;
    this.warningCount = this.errorLogs.filter(log => log.severity === 'warning').length;
    this.infoCount = this.errorLogs.filter(log => log.severity === 'info').length;
  }

  onTabChange(index: number): void {
    this.selectedTab = index;
    this.filterLogsByTab();
  }

  private filterLogsByTab(): void {
    switch (this.selectedTab) {
      case 0: // All
        this.filteredLogs = this.errorLogs;
        break;
      case 1: // Errors
        this.filteredLogs = this.errorLogs.filter(log => log.severity === 'error');
        break;
      case 2: // Warnings
        this.filteredLogs = this.errorLogs.filter(log => log.severity === 'warning');
        break;
      case 3: // Info
        this.filteredLogs = this.errorLogs.filter(log => log.severity === 'info');
        break;
    }
  }

  getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }

  getSeverityColor(severity: string): string {
    switch (severity) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      default: return '#757575';
    }
  }

  getSourceLabel(source: string): string {
    const labels: { [key: string]: string } = {
      'file-open': 'File Open',
      'validation': 'Validation',
      'parsing': 'Parsing',
      'network': 'Network',
      'system': 'System'
    };
    return labels[source] || source;
  }

  getSourceColor(source: string): string {
    const colors: { [key: string]: string } = {
      'file-open': '#4caf50',
      'validation': '#ff9800',
      'parsing': '#f44336',
      'network': '#2196f3',
      'system': '#9c27b0'
    };
    return colors[source] || '#757575';
  }

  formatTimestamp(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds} seconds ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    
    return new Date(date).toLocaleString();
  }

  copyLogDetails(log: ErrorLogEntry): void {
    const details = `
Timestamp: ${new Date(log.timestamp).toISOString()}
Severity: ${log.severity.toUpperCase()}
Source: ${this.getSourceLabel(log.source)}
Message: ${log.message}
${log.details ? `Details: ${log.details}` : ''}
${log.filePath ? `File: ${log.filePath}` : ''}
${log.context ? `Context: ${JSON.stringify(log.context, null, 2)}` : ''}
${log.stack ? `Stack:\n${log.stack}` : ''}
    `.trim();

    navigator.clipboard.writeText(details).then(() => {
      this.snackBar.open('Log details copied to clipboard', 'Close', { duration: 2000 });
    });
  }

  clearAllLogs(): void {
    if (confirm('Are you sure you want to clear all error logs? This action cannot be undone.')) {
      this.errorLogService.clearLogs();
      this.snackBar.open('All logs cleared', 'Close', { duration: 2000 });
    }
  }

  exportLogs(): void {
    const exportData = this.errorLogService.exportLogs();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Logs exported successfully', 'Close', { duration: 2000 });
  }

  close(): void {
    this.dialogRef.close();
  }
}