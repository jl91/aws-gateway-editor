import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval, Subject } from 'rxjs';
import { debounceTime, filter, takeUntil } from 'rxjs/operators';
import { ElectronService } from './electron.service';
import { OpenApiService, OpenAPIDocument, Project } from './openapi.service';
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
    private electronService: ElectronService,
    private openApiService: OpenApiService
  ) {
    this.setupAutoSave();
    this.setupCrashRecovery();
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

  async saveDocument(project: Project): Promise<boolean> {
    if (!this.currentDocument || !project.openApiPath) {
      return false;
    }

    try {
      // Create backup first
      await this.createBackup(project.openApiPath);
      
      // Serialize document
      const content = await this.serializeDocument(
        this.currentDocument,
        project.openApiPath
      );
      
      // Save to file
      const success = await this.electronService.writeFile(
        project.openApiPath,
        content
      );
      
      if (success) {
        // Update README.md
        await this.updateReadme(project.path, this.currentDocument);
        
        // Update state
        this.originalDocument = JSON.parse(JSON.stringify(this.currentDocument));
        this.saveState$.next({
          ...this.saveState$.value,
          hasUnsavedChanges: false,
          lastSaved: new Date()
        });
        
        // Store in crash recovery
        await this.storeCrashRecovery(project, this.currentDocument);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save document:', error);
      return false;
    }
  }

  async saveAs(project: Project): Promise<string | null> {
    if (!this.currentDocument) {
      return null;
    }

    const folderPath = await this.electronService.openFolder();
    if (!folderPath) {
      return null;
    }

    const fileName = 'openapi.yaml';
    const newPath = `${folderPath}/${fileName}`;
    
    const content = await this.serializeDocument(this.currentDocument, newPath);
    const success = await this.electronService.writeFile(newPath, content);
    
    if (success) {
      // Create new README if doesn't exist
      const readmePath = `${folderPath}/README.md`;
      const readmeExists = await this.electronService.fileExists(readmePath);
      
      if (!readmeExists) {
        await this.createReadme(folderPath, this.currentDocument);
      } else {
        await this.updateReadme(folderPath, this.currentDocument);
      }
      
      return newPath;
    }
    
    return null;
  }

  private async serializeDocument(
    document: OpenAPIDocument,
    filePath: string
  ): Promise<string> {
    const isYaml = filePath.endsWith('.yaml') || filePath.endsWith('.yml');
    
    if (isYaml) {
      // Preserve comments if possible (basic implementation)
      return yaml.dump(document, {
        indent: 2,
        lineWidth: -1,
        noRefs: false,
        sortKeys: false,
        quotingType: '"',
        forceQuotes: false
      });
    } else {
      return JSON.stringify(document, null, 2);
    }
  }

  private async createBackup(filePath: string): Promise<void> {
    try {
      const exists = await this.electronService.fileExists(filePath);
      if (exists) {
        const content = await this.electronService.readFile(filePath);
        const backupPath = `${filePath}.backup`;
        await this.electronService.writeFile(backupPath, content);
      }
    } catch (error) {
      console.error('Failed to create backup:', error);
    }
  }

  async updateReadme(projectPath: string, document: OpenAPIDocument): Promise<void> {
    const readmePath = `${projectPath}/README.md`;
    let readmeContent = '';
    
    try {
      const exists = await this.electronService.fileExists(readmePath);
      if (exists) {
        readmeContent = await this.electronService.readFile(readmePath);
      } else {
        readmeContent = await this.createReadme(projectPath, document);
        return;
      }
    } catch (error) {
      console.error('Failed to read README:', error);
      readmeContent = await this.createReadme(projectPath, document);
      return;
    }

    // Parse endpoints from document
    const endpoints = this.openApiService.getEndpoints(document);
    const endpointDocs: EndpointDocumentation[] = endpoints.map(endpoint => ({
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      summary: endpoint.summary,
      modified: new Date().toISOString(),
      curl: this.openApiService.generateCurlExample(endpoint)
    }));

    // Update ENDPOINTS section
    const updatedReadme = this.updateEndpointsSection(readmeContent, endpointDocs);
    
    await this.electronService.writeFile(readmePath, updatedReadme);
  }

  private updateEndpointsSection(
    readmeContent: string,
    endpoints: EndpointDocumentation[]
  ): string {
    const endpointsStart = readmeContent.indexOf('## ENDPOINTS');
    
    if (endpointsStart === -1) {
      // Add ENDPOINTS section if it doesn't exist
      return readmeContent + '\n\n## ENDPOINTS\n\n' + this.generateEndpointsMarkdown(endpoints);
    }

    // Find the next section after ENDPOINTS
    const nextSectionRegex = /\n## (?!ENDPOINTS)/g;
    nextSectionRegex.lastIndex = endpointsStart + 12;
    const nextSectionMatch = nextSectionRegex.exec(readmeContent);
    
    const endpointsEnd = nextSectionMatch ? nextSectionMatch.index : readmeContent.length;
    
    // Replace ENDPOINTS section content
    const beforeEndpoints = readmeContent.substring(0, endpointsStart);
    const afterEndpoints = readmeContent.substring(endpointsEnd);
    
    return beforeEndpoints + 
           '## ENDPOINTS\n\n' + 
           this.generateEndpointsMarkdown(endpoints) +
           afterEndpoints;
  }

  private generateEndpointsMarkdown(endpoints: EndpointDocumentation[]): string {
    if (endpoints.length === 0) {
      return '<!-- No endpoints defined yet -->\n';
    }

    return endpoints.map(endpoint => {
      return `### ${endpoint.method} ${endpoint.path}

- **ID:** ${endpoint.id}
- **Summary:** ${endpoint.summary || 'No summary provided'}
- **Modified:** ${endpoint.modified}

\`\`\`bash
${endpoint.curl}
\`\`\`

---
`;
    }).join('\n');
  }

  private async createReadme(projectPath: string, document: OpenAPIDocument): Promise<string> {
    const readmeContent = `# ${document.info.title}

${document.info.description || 'API Gateway'}

## Version
${document.info.version}

## Servers
${document.servers?.map(s => `- ${s.url}${s.description ? ' - ' + s.description : ''}`).join('\n') || '- No servers configured'}

## Contact
${document.info.contact ? `
- **Name:** ${document.info.contact.name || 'N/A'}
- **Email:** ${document.info.contact.email || 'N/A'}
- **URL:** ${document.info.contact.url || 'N/A'}
` : 'No contact information provided'}

## License
${document.info.license ? `${document.info.license.name}${document.info.license.url ? ' - ' + document.info.license.url : ''}` : 'No license specified'}

## ENDPOINTS

<!-- This section will be automatically updated when endpoints are added -->

---

Generated with AWS API Gateway Editor
`;

    const readmePath = `${projectPath}/README.md`;
    await this.electronService.writeFile(readmePath, readmeContent);
    return readmeContent;
  }

  // Auto-save functionality
  enableAutoSave(interval: number = 60): void {
    const state = this.saveState$.value;
    this.saveState$.next({
      ...state,
      isAutoSaveEnabled: true,
      autoSaveInterval: interval
    });
    
    this.setupAutoSave();
  }

  disableAutoSave(): void {
    const state = this.saveState$.value;
    this.saveState$.next({
      ...state,
      isAutoSaveEnabled: false
    });
    
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
  }

  private setupAutoSave(): void {
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }

    this.saveState$
      .pipe(
        filter(state => state.isAutoSaveEnabled && state.hasUnsavedChanges),
        debounceTime(this.saveState$.value.autoSaveInterval * 1000),
        takeUntil(this.destroy$)
      )
      .subscribe(async () => {
        const project = await this.openApiService.currentProject.toPromise();
        if (project) {
          await this.saveDocument(project);
        }
      });
  }

  // Crash recovery
  private async setupCrashRecovery(): Promise<void> {
    // Check for crash recovery on startup
    const recoveryData = await this.electronService.getStorageItem('crash-recovery');
    if (recoveryData) {
      // Will be handled by the application on startup
      console.log('Crash recovery data found');
    }
  }

  private async storeCrashRecovery(
    project: Project,
    document: OpenAPIDocument
  ): Promise<void> {
    const recoveryData = {
      project,
      document,
      timestamp: new Date().toISOString()
    };
    
    await this.electronService.setStorageItem('crash-recovery', recoveryData);
  }

  async clearCrashRecovery(): Promise<void> {
    await this.electronService.removeStorageItem('crash-recovery');
  }

  async checkCrashRecovery(): Promise<{ project: Project; document: OpenAPIDocument } | null> {
    const recoveryData = await this.electronService.getStorageItem('crash-recovery');
    return recoveryData || null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.autoSaveSubscription) {
      this.autoSaveSubscription.unsubscribe();
    }
  }
}