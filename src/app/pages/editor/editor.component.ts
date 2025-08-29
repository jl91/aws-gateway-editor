import { Component, OnInit, ViewChild, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { FormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { OpenApiService, OpenAPIDocument } from '../../core/services/openapi.service';
import { ElectronService } from '../../core/services/electron.service';
import { PersistenceService, SaveState } from '../../core/services/persistence.service';
import { ValidationService, ValidationResult, ValidationError } from '../../core/services/validation.service';
import { EndpointModalComponent, EndpointModalData } from '../../components/endpoint-modal/endpoint-modal.component';
import { EndpointPreviewComponent, EndpointPreviewData } from '../../components/endpoint-preview/endpoint-preview.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../components/confirm-dialog/confirm-dialog.component';
import { ContractPreviewComponent, ContractPreviewData } from '../../components/contract-preview/contract-preview.component';
import { DeletionHistoryService } from '../../core/services/deletion-history.service';

export interface Endpoint {
  id: string;
  method: string;
  path: string;
  summary?: string;
  description?: string;
  tags?: string[];
  deprecated?: boolean;
  selected?: boolean;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  security?: any[];
  extensions?: { [key: string]: any };
}

export interface SavedFilter {
  name: string;
  searchTerm: string;
  filterMethod: string;
  filterTag: string;
  filterExtension: string;
  createdAt: Date;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatSortModule,
    MatCheckboxModule,
    MatChipsModule,
    MatMenuModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatDividerModule
  ],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  
  displayedColumns: string[] = ['select', 'method', 'path', 'summary', 'tags', 'actions'];
  dataSource: MatTableDataSource<Endpoint>;
  currentDocument: OpenAPIDocument | null = null;
  
  searchTerm = '';
  selectedEndpoints: Set<string> = new Set();
  searchSubject = new Subject<string>();
  
  filterMethod = '';
  filterTag = '';
  filterExtension = '';
  availableTags: string[] = [];
  availableExtensions: string[] = [];
  availableMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  
  savedFilters: SavedFilter[] = [];
  showSavedFilters = false;
  
  isLoading = false;
  projectName = 'Untitled API';
  saveState: SaveState | null = null;
  currentProject: any = null;
  
  // Validation
  validationResult: ValidationResult | null = null;
  showValidationPanel = false;
  validationPanelWidth = 350;

  constructor(
    private openApiService: OpenApiService,
    private electronService: ElectronService,
    private persistenceService: PersistenceService,
    private validationService: ValidationService,
    private deletionHistoryService: DeletionHistoryService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {
    this.dataSource = new MatTableDataSource<Endpoint>([]);
  }

  ngOnInit(): void {
    this.loadCurrentDocument();
    this.setupSearch();
    this.setupCustomFilter();
    this.setupSaveState();
    this.setupValidation();
    this.checkCrashRecovery();
    this.loadSavedFilters();
  }
  
  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.saveState?.hasUnsavedChanges) {
        this.saveDocument();
      }
    }
    
    // Ctrl+Shift+S or Cmd+Shift+S for save as
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'S') {
      event.preventDefault();
      this.saveAs();
    }
    
    // Ctrl+P or Cmd+P for preview
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.openContractPreview();
    }
  }
  
  private loadCurrentDocument(): void {
    this.openApiService.currentDocument.subscribe(document => {
      console.log('Editor received document:', document);
      if (document) {
        this.currentDocument = document;
        this.projectName = document.info.title || 'Untitled API';
        this.loadEndpoints(document);
        this.persistenceService.setDocument(document);
        console.log('Endpoints loaded:', this.dataSource.data.length);
      }
    });
    
    this.openApiService.currentProject.subscribe(project => {
      console.log('Editor received project:', project);
      this.currentProject = project;
      if (project && !this.currentDocument) {
        // If project but no document, try to load it
        if (project.openApiPath) {
          console.log('Loading OpenAPI file from project path:', project.openApiPath);
          this.loadOpenApiFile(project.openApiPath);
        }
      }
    });
  }
  
  private async loadOpenApiFile(path: string): Promise<void> {
    this.isLoading = true;
    const document = await this.openApiService.loadOpenAPIFile(path);
    if (document) {
      this.loadEndpoints(document);
    }
    this.isLoading = false;
  }
  
  private loadEndpoints(document: OpenAPIDocument): void {
    console.log('Loading endpoints from document:', document.info.title);
    const endpoints = this.openApiService.getEndpoints(document);
    console.log('Found endpoints:', endpoints);
    this.dataSource.data = endpoints;
    
    // Extract unique tags
    const tagsSet = new Set<string>();
    const extensionsSet = new Set<string>();
    
    endpoints.forEach(endpoint => {
      if (endpoint.tags) {
        endpoint.tags.forEach((tag: string) => tagsSet.add(tag));
      }
      
      // Extract x-extensions keys
      if (endpoint.extensions) {
        Object.keys(endpoint.extensions)
          .filter(key => key.startsWith('x-'))
          .forEach(key => extensionsSet.add(key));
      }
    });
    
    this.availableTags = Array.from(tagsSet).sort();
    this.availableExtensions = Array.from(extensionsSet).sort();
    console.log('Available tags:', this.availableTags);
    console.log('DataSource updated with', this.dataSource.data.length, 'endpoints');
  }
  
  private setupSearch(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.applyFilter();
      });
  }
  
  private setupCustomFilter(): void {
    this.dataSource.filterPredicate = (data: Endpoint, filter: string): boolean => {
      const searchStr = filter.toLowerCase();
      
      // Method filter
      if (this.filterMethod && data.method !== this.filterMethod) {
        return false;
      }
      
      // Tag filter
      if (this.filterTag && (!data.tags || !data.tags.includes(this.filterTag))) {
        return false;
      }
      
      // Extension filter
      if (this.filterExtension && (!data.extensions || !data.extensions[this.filterExtension])) {
        return false;
      }
      
      // Search filter
      if (searchStr) {
        const matchesSearch = data.method.toLowerCase().includes(searchStr) ||
               data.path.toLowerCase().includes(searchStr) ||
               (data.summary ? data.summary.toLowerCase().includes(searchStr) : false) ||
               (data.description ? data.description.toLowerCase().includes(searchStr) : false) ||
               (data.id ? data.id.toLowerCase().includes(searchStr) : false) ||
               (data.tags ? data.tags.some(tag => tag.toLowerCase().includes(searchStr)) : false);
        return matchesSearch;
      }
      
      return true;
    };
  }
  
  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.searchSubject.next(searchTerm);
  }
  
  applyFilter(): void {
    this.dataSource.filter = this.searchTerm.trim().toLowerCase();
  }
  
  onMethodFilterChange(method: string): void {
    this.filterMethod = method;
    this.applyFilter();
  }
  
  onTagFilterChange(tag: string): void {
    this.filterTag = tag;
    this.applyFilter();
  }
  
  onExtensionFilterChange(extension: string): void {
    this.filterExtension = extension;
    this.applyFilter();
  }
  
  clearFilters(): void {
    this.searchTerm = '';
    this.filterMethod = '';
    this.filterTag = '';
    this.filterExtension = '';
    this.dataSource.filter = '';
  }

  addEndpoint(): void {
    const dialogRef = this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { mode: 'create' } as EndpointModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.currentDocument) {
        this.currentDocument = this.openApiService.updateEndpoint(this.currentDocument, result);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        this.snackBar.open('Endpoint created successfully', 'Close', { duration: 2000 });
      }
    });
  }

  editEndpoint(endpoint: Endpoint): void {
    const dialogRef = this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { endpoint, mode: 'edit' } as EndpointModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.currentDocument) {
        this.currentDocument = this.openApiService.updateEndpoint(this.currentDocument, result);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        this.snackBar.open('Endpoint updated successfully', 'Close', { duration: 2000 });
      }
    });
  }

  createNewEndpoint(): void {
    // Create default endpoint with pre-populated values
    const defaultEndpoint: Endpoint = {
      id: '',
      method: 'GET',
      path: '/new-endpoint',
      summary: '',
      description: '',
      tags: [],
      deprecated: false,
      parameters: [],
      responses: {
        '200': {
          description: 'Successful response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  message: { type: 'string' }
                }
              },
              example: {
                message: 'Success'
              }
            }
          }
        }
      }
    };

    const dialogRef = this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { endpoint: defaultEndpoint, mode: 'create' } as EndpointModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.currentDocument) {
        // Validate unique operationId
        const existingIds = this.endpoints.map(e => e.id);
        if (existingIds.includes(result.id)) {
          this.snackBar.open('Operation ID already exists. Please use a unique ID.', 'Close', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Add endpoint to OpenAPI document
        this.currentDocument = this.openApiService.addEndpoint(this.currentDocument, result);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        // Show success notification
        this.snackBar.open(`Endpoint ${result.method} ${result.path} created successfully`, 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Scroll to the new endpoint in the table
        setTimeout(() => {
          const newEndpointIndex = this.dataSource.data.findIndex(e => e.id === result.id);
          if (newEndpointIndex !== -1) {
            // If paginator exists, navigate to the page containing the new endpoint
            if (this.paginator) {
              const pageIndex = Math.floor(newEndpointIndex / this.paginator.pageSize);
              this.paginator.pageIndex = pageIndex;
            }
          }
        }, 100);
      }
    });
  }

  viewEndpoint(endpoint: Endpoint): void {
    this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { endpoint, mode: 'view' } as EndpointModalData
    });
  }

  createSimilarEndpoint(endpoint: Endpoint): void {
    // Create a copy with cleared ID and modified path
    const similarEndpoint: Endpoint = {
      ...endpoint,
      id: '',
      path: endpoint.path + '-copy',
      summary: endpoint.summary ? endpoint.summary + ' (Copy)' : 'Copy of endpoint',
      responses: JSON.parse(JSON.stringify(endpoint.responses)) // Deep copy responses
    };

    const dialogRef = this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { endpoint: similarEndpoint, mode: 'create' } as EndpointModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.currentDocument) {
        // Validate unique operationId
        const existingIds = this.endpoints.map(e => e.id);
        if (existingIds.includes(result.id)) {
          this.snackBar.open('Operation ID already exists. Please use a unique ID.', 'Close', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          return;
        }

        // Add endpoint to OpenAPI document
        this.currentDocument = this.openApiService.addEndpoint(this.currentDocument, result);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        this.snackBar.open(`Similar endpoint ${result.method} ${result.path} created successfully`, 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      }
    });
  }

  duplicateEndpoint(endpoint: Endpoint): void {
    // Create an exact duplicate with new ID
    const duplicatedEndpoint: Endpoint = {
      ...JSON.parse(JSON.stringify(endpoint)), // Deep copy
      id: endpoint.id + '-copy',
      path: endpoint.path + '-duplicate'
    };

    if (this.currentDocument) {
      try {
        // Validate unique operationId
        const existingIds = this.endpoints.map(e => e.id);
        if (existingIds.includes(duplicatedEndpoint.id)) {
          // Generate unique ID
          let counter = 2;
          while (existingIds.includes(`${endpoint.id}-copy-${counter}`)) {
            counter++;
          }
          duplicatedEndpoint.id = `${endpoint.id}-copy-${counter}`;
        }

        // Add endpoint directly without opening modal
        this.currentDocument = this.openApiService.addEndpoint(this.currentDocument, duplicatedEndpoint);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        this.snackBar.open(`Endpoint duplicated as ${duplicatedEndpoint.method} ${duplicatedEndpoint.path}`, 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error: any) {
        this.snackBar.open(error.message || 'Failed to duplicate endpoint', 'Close', { 
          duration: 4000,
          panelClass: ['error-snackbar']
        });
      }
    }
  }
  
  previewEndpoint(endpoint: Endpoint): void {
    const index = this.dataSource.data.findIndex(e => e.id === endpoint.id);
    
    this.dialog.open(EndpointPreviewComponent, {
      width: '90%',
      maxWidth: '1200px',
      maxHeight: '90vh',
      data: {
        endpoint,
        document: this.currentDocument,
        allEndpoints: this.dataSource.data,
        currentIndex: index
      } as EndpointPreviewData
    });
  }

  async deleteEndpoint(endpoint: Endpoint): Promise<void> {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Endpoint',
        message: `Are you sure you want to delete this endpoint?`,
        details: [
          `Method: ${endpoint.method}`,
          `Path: ${endpoint.path}`,
          endpoint.summary ? `Summary: ${endpoint.summary}` : null
        ].filter(Boolean),
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger'
      } as ConfirmDialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.currentDocument) {
        // Add to deletion history
        this.deletionHistoryService.addDeletion([endpoint], 'Manual deletion');
        
        // Delete from document
        this.currentDocument = this.openApiService.deleteEndpoint(
          this.currentDocument,
          endpoint.path,
          endpoint.method
        );
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        // Show success message with undo option
        const snackBarRef = this.snackBar.open(
          'Endpoint deleted successfully', 
          'UNDO', 
          { 
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );
        
        snackBarRef.onAction().subscribe(() => {
          this.undoLastDeletion();
        });
      }
    });
  }

  toggleSelection(endpoint: Endpoint): void {
    endpoint.selected = !endpoint.selected;
    if (endpoint.selected) {
      this.selectedEndpoints.add(endpoint.id);
    } else {
      this.selectedEndpoints.delete(endpoint.id);
    }
  }

  toggleAllSelection(): void {
    const allSelected = this.endpoints.every(e => e.selected);
    this.endpoints.forEach(endpoint => {
      endpoint.selected = !allSelected;
      if (endpoint.selected) {
        this.selectedEndpoints.add(endpoint.id);
      } else {
        this.selectedEndpoints.delete(endpoint.id);
      }
    });
  }

  isAllSelected(): boolean {
    return this.endpoints.length > 0 && this.endpoints.every(e => e.selected);
  }

  async deleteSelected(): Promise<void> {
    const count = this.selectedEndpoints.size;
    if (count === 0) return;
    
    const endpoints = this.dataSource.data.filter(e => this.selectedEndpoints.has(e.id));
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Delete Multiple Endpoints',
        message: `Are you sure you want to delete ${count} endpoint${count > 1 ? 's' : ''}?`,
        details: endpoints.slice(0, 5).map(e => `${e.method} ${e.path}`).concat(
          count > 5 ? [`... and ${count - 5} more`] : []
        ),
        confirmText: `Delete ${count} Endpoint${count > 1 ? 's' : ''}`,
        cancelText: 'Cancel',
        type: 'danger'
      } as ConfirmDialogData
    });
    
    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed && this.currentDocument) {
        // Add to deletion history
        this.deletionHistoryService.addDeletion(endpoints, 'Batch deletion');
        
        // Delete from document
        endpoints.forEach(endpoint => {
          this.currentDocument = this.openApiService.deleteEndpoint(
            this.currentDocument!,
            endpoint.path,
            endpoint.method
          );
        });
        
        this.selectedEndpoints.clear();
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        // Show success message with undo option
        const snackBarRef = this.snackBar.open(
          `${count} endpoint${count > 1 ? 's' : ''} deleted successfully`, 
          'UNDO', 
          { 
            duration: 5000,
            panelClass: ['success-snackbar']
          }
        );
        
        snackBarRef.onAction().subscribe(() => {
          this.undoLastDeletion();
        });
      }
    });
  }
  
  undoLastDeletion(): void {
    const deletionEntry = this.deletionHistoryService.undoLastDeletion();
    
    if (deletionEntry && this.currentDocument) {
      let restoredCount = 0;
      
      deletionEntry.endpoints.forEach(deletedEndpoint => {
        try {
          this.currentDocument = this.openApiService.addEndpoint(
            this.currentDocument!,
            deletedEndpoint.endpoint
          );
          restoredCount++;
        } catch (error) {
          console.error('Failed to restore endpoint:', error);
        }
      });
      
      if (restoredCount > 0) {
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        
        this.snackBar.open(
          `${restoredCount} endpoint${restoredCount > 1 ? 's' : ''} restored successfully`, 
          'Close', 
          { 
            duration: 3000,
            panelClass: ['success-snackbar']
          }
        );
      } else {
        this.snackBar.open('Failed to restore endpoints', 'Close', { 
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    } else {
      this.snackBar.open('No recent deletions to undo', 'Close', { 
        duration: 2000,
        panelClass: ['info-snackbar']
      });
    }
  }

  exportEndpoints(): void {
    const selected = this.dataSource.data.filter(e => this.selectedEndpoints.has(e.id));
    const toExport = selected.length > 0 ? selected : this.dataSource.filteredData;
    
    if (toExport.length === 0) {
      this.snackBar.open('No endpoints to export', 'Close', { duration: 2000 });
      return;
    }
    
    const exportData = toExport.map(e => ({
      method: e.method,
      path: e.path,
      operationId: e.id,
      summary: e.summary,
      tags: e.tags?.join(', '),
      parameters: e.parameters?.length || 0,
      responses: Object.keys(e.responses || {}).join(', ')
    }));
    
    const csv = this.convertToCSV(exportData);
    this.downloadFile(csv, 'endpoints.csv', 'text/csv');
    
    this.snackBar.open(`Exported ${toExport.length} endpoints`, 'Close', { duration: 2000 });
  }
  
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(row => 
      headers.map(header => {
        const value = row[header];
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value || '';
      }).join(',')
    );
    
    return [csvHeaders, ...csvRows].join('\n');
  }
  
  private downloadFile(content: string, filename: string, type: string): void {
    const blob = new Blob([content], { type });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
  
  private setupSaveState(): void {
    this.persistenceService.saveState.subscribe(state => {
      this.saveState = state;
    });
  }
  
  private async checkCrashRecovery(): Promise<void> {
    const recovery = await this.persistenceService.checkCrashRecovery();
    if (recovery) {
      const shouldRecover = confirm(
        'A previous session was found. Would you like to recover your unsaved work?'
      );
      
      if (shouldRecover) {
        this.currentDocument = recovery.document;
        this.loadEndpoints(recovery.document);
        this.openApiService.setCurrentProject(recovery.project);
        this.snackBar.open('Previous session recovered', 'Close', { duration: 3000 });
      }
      
      await this.persistenceService.clearCrashRecovery();
    }
  }

  async saveDocument(): Promise<void> {
    if (!this.currentDocument || !this.currentProject) {
      this.snackBar.open('No document to save', 'Close', { duration: 2000 });
      return;
    }
    
    const success = await this.persistenceService.saveDocument(this.currentProject);
    
    if (success) {
      this.snackBar.open('Document saved successfully', 'Close', { duration: 2000 });
    } else {
      this.snackBar.open('Failed to save document', 'Close', { duration: 3000 });
    }
  }
  
  async saveAs(): Promise<void> {
    if (!this.currentDocument || !this.currentProject) {
      this.snackBar.open('No document to save', 'Close', { duration: 2000 });
      return;
    }
    
    const newPath = await this.persistenceService.saveAs(this.currentProject);
    
    if (newPath) {
      // Update current project path
      this.currentProject.openApiPath = newPath;
      this.openApiService.setCurrentProject(this.currentProject);
      this.snackBar.open('Document saved to new location', 'Close', { duration: 2000 });
    }
  }
  
  toggleAutoSave(): void {
    if (this.saveState?.isAutoSaveEnabled) {
      this.persistenceService.disableAutoSave();
      this.snackBar.open('Auto-save disabled', 'Close', { duration: 2000 });
    } else {
      this.persistenceService.enableAutoSave(60);
      this.snackBar.open('Auto-save enabled (every 60 seconds)', 'Close', { duration: 2000 });
    }
  }
  
  private setupValidation(): void {
    // Subscribe to validation results
    this.validationService.validationResult.subscribe(result => {
      this.validationResult = result;
    });
    
    // Subscribe to document changes for real-time validation
    this.openApiService.currentDocument.subscribe(async document => {
      if (document) {
        await this.validateDocument();
      }
    });
  }
  
  async validateDocument(): Promise<void> {
    if (!this.currentDocument) return;
    
    try {
      await this.validationService.validateDocument(this.currentDocument);
    } catch (error) {
      console.error('Validation error:', error);
    }
  }
  
  toggleValidationPanel(): void {
    this.showValidationPanel = !this.showValidationPanel;
  }
  
  getValidationSeverityIcon(severity: string): string {
    switch (severity) {
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      case 'hint': return 'lightbulb';
      default: return 'info';
    }
  }
  
  getValidationSeverityColor(severity: string): string {
    switch (severity) {
      case 'error': return '#f44336';
      case 'warning': return '#ff9800';
      case 'info': return '#2196f3';
      case 'hint': return '#9c27b0';
      default: return '#757575';
    }
  }
  
  navigateToError(error: ValidationError): void {
    // Find and highlight the endpoint with the error
    if (error.path && error.path.length > 1) {
      const pathSegments = error.path;
      if (pathSegments[0] === 'paths' && pathSegments.length >= 3) {
        const path = pathSegments[1];
        const method = pathSegments[2];
        
        // Find the endpoint in the table
        const endpoint = this.dataSource.data.find(e => 
          e.path === path && e.method.toLowerCase() === method
        );
        
        if (endpoint) {
          // Open edit modal with validation context
          this.editEndpointWithValidation(endpoint, error);
        }
      }
    }
  }
  
  private editEndpointWithValidation(endpoint: Endpoint, validationError?: ValidationError): void {
    const dialogRef = this.dialog.open(EndpointModalComponent, {
      width: '90%',
      maxWidth: '1000px',
      data: { 
        endpoint, 
        mode: 'edit',
        validationError
      } as EndpointModalData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.currentDocument) {
        this.currentDocument = this.openApiService.updateEndpoint(this.currentDocument, result);
        this.loadEndpoints(this.currentDocument);
        this.persistenceService.setDocument(this.currentDocument);
        this.snackBar.open('Endpoint updated successfully', 'Close', { duration: 2000 });
      }
    });
  }
  
  async exportValidationReport(): Promise<void> {
    if (!this.currentDocument) return;
    
    const report = await this.validationService.exportValidationReport(this.currentDocument);
    this.downloadFile(report, 'validation-report.md', 'text/markdown');
    this.snackBar.open('Validation report exported', 'Close', { duration: 2000 });
  }
  
  openContractPreview(): void {
    if (!this.currentDocument) {
      this.snackBar.open('No document to preview', 'Close', { duration: 2000 });
      return;
    }
    
    // Get the original document from persistence service for comparison
    const originalDocument = this.persistenceService.getOriginalDocument();
    
    const dialogRef = this.dialog.open(ContractPreviewComponent, {
      width: '90%',
      maxWidth: '1400px',
      height: '85vh',
      data: {
        document: this.currentDocument,
        originalDocument: originalDocument,
        readOnly: false
      } as ContractPreviewData
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.document) {
        // Update the document if changes were made in the preview
        this.currentDocument = result.document;
        if (this.currentDocument) {
          this.loadEndpoints(this.currentDocument);
          this.persistenceService.setDocument(this.currentDocument);
        }
        
        this.snackBar.open('Contract updated from preview', 'Close', { 
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Re-validate the document
        this.validateDocument();
      }
    });
  }
  
  get endpoints(): Endpoint[] {
    return this.dataSource.data;
  }
  
  // Saved Filters Management
  private loadSavedFilters(): void {
    const stored = localStorage.getItem('savedEndpointFilters');
    if (stored) {
      try {
        this.savedFilters = JSON.parse(stored);
        // Convert stored date strings back to Date objects
        this.savedFilters = this.savedFilters.map(filter => ({
          ...filter,
          createdAt: new Date(filter.createdAt)
        }));
      } catch (e) {
        console.error('Failed to load saved filters:', e);
        this.savedFilters = [];
      }
    }
  }
  
  saveCurrentFilter(): void {
    const filterName = prompt('Enter a name for this filter:');
    if (!filterName) return;
    
    const newFilter: SavedFilter = {
      name: filterName,
      searchTerm: this.searchTerm,
      filterMethod: this.filterMethod,
      filterTag: this.filterTag,
      filterExtension: this.filterExtension,
      createdAt: new Date()
    };
    
    // Check if filter with same name exists
    const existingIndex = this.savedFilters.findIndex(f => f.name === filterName);
    if (existingIndex > -1) {
      const overwrite = confirm(`Filter "${filterName}" already exists. Do you want to overwrite it?`);
      if (overwrite) {
        this.savedFilters[existingIndex] = newFilter;
      } else {
        return;
      }
    } else {
      this.savedFilters.push(newFilter);
    }
    
    // Save to localStorage
    localStorage.setItem('savedEndpointFilters', JSON.stringify(this.savedFilters));
    this.snackBar.open(`Filter "${filterName}" saved successfully`, 'Close', { duration: 2000 });
  }
  
  applySavedFilter(filter: SavedFilter): void {
    this.searchTerm = filter.searchTerm;
    this.filterMethod = filter.filterMethod;
    this.filterTag = filter.filterTag;
    this.filterExtension = filter.filterExtension;
    this.applyFilter();
    this.showSavedFilters = false;
    this.snackBar.open(`Filter "${filter.name}" applied`, 'Close', { duration: 2000 });
  }
  
  deleteSavedFilter(filter: SavedFilter): void {
    const confirmed = confirm(`Are you sure you want to delete the filter "${filter.name}"?`);
    if (!confirmed) return;
    
    const index = this.savedFilters.indexOf(filter);
    if (index > -1) {
      this.savedFilters.splice(index, 1);
      localStorage.setItem('savedEndpointFilters', JSON.stringify(this.savedFilters));
      this.snackBar.open(`Filter "${filter.name}" deleted`, 'Close', { duration: 2000 });
    }
  }
  
  toggleSavedFilters(): void {
    this.showSavedFilters = !this.showSavedFilters;
  }
  
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.filterMethod || this.filterTag || this.filterExtension);
  }
}