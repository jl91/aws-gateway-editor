import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, style, animate, transition } from '@angular/animations';
import { ElectronService } from '../../core/services/electron.service';
import { OpenApiService, Project } from '../../core/services/openapi.service';
import { ErrorLogService } from '../../core/services/error-log.service';
import { ErrorLogModalComponent } from '../../components/error-log-modal/error-log-modal.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatBadgeModule,
    MatTooltipModule
  ],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('listAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms 200ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class HomeComponent implements OnInit {
  recentProjects: Project[] = [];
  isLoading = false;
  loadingMessage = '';
  errorCount = 0;

  constructor(
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private electronService: ElectronService,
    private openApiService: OpenApiService,
    private errorLogService: ErrorLogService
  ) {}

  ngOnInit(): void {
    this.openApiService.recentProjects.subscribe(projects => {
      this.recentProjects = projects;
    });

    // Subscribe to error count
    this.errorLogService.errorLogs.subscribe(logs => {
      this.errorCount = logs.filter(log => log.severity === 'error').length;
    });
  }

  async openLocalFolder(): Promise<void> {
    if (!this.electronService.isElectronApp()) {
      this.showMessage('This feature requires the desktop application');
      return;
    }

    this.isLoading = true;
    this.loadingMessage = 'Opening folder selection...';
    let folderPath: string | null = null;
    
    try {
      folderPath = await this.electronService.openFolder();
      
      if (folderPath) {
        await this.loadProjectFromFolder(folderPath);
      }
    } catch (error: any) {
      this.errorLogService.logError(
        'Failed to open folder',
        'file-open',
        error.message,
        { error },
        folderPath || undefined
      );
      this.showMessage(`Error: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }
  
  private async loadProjectFromFolder(folderPath: string): Promise<void> {
    this.loadingMessage = 'Searching for OpenAPI files...';
    
    try {
      // Search for OpenAPI files
      const openApiFiles = await this.electronService.listFiles(
        folderPath, 
        ['yaml', 'yml', 'json']
      );
      
      // First try to find files with common OpenAPI names
      let openApiFile = openApiFiles.find((file: string) => {
        const fileName = file.toLowerCase();
        return fileName.includes('openapi') || 
               fileName.includes('swagger') ||
               fileName.includes('api-spec') ||
               fileName.includes('api.yaml') ||
               fileName.includes('api.yml') ||
               fileName.includes('api.json');
      });
      
      // If not found, look for any .yaml, .yml or .json file that might be an OpenAPI spec
      if (!openApiFile && openApiFiles.length > 0) {
        // Try to find the first valid OpenAPI file by checking its content
        for (const file of openApiFiles) {
          try {
            const content = await this.electronService.readFile(file);
            // Check if it's likely an OpenAPI file by looking for key fields
            if (content.includes('openapi:') || content.includes('"openapi"') || 
                content.includes('swagger:') || content.includes('"swagger"')) {
              openApiFile = file;
              break;
            }
          } catch (e) {
            // Skip files that can't be read
            continue;
          }
        }
        
        // If still not found, use the first YAML/JSON file
        if (!openApiFile) {
          openApiFile = openApiFiles[0];
        }
      }
      
      if (openApiFile) {
        console.log('Found OpenAPI file:', openApiFile);
        this.loadingMessage = 'Loading OpenAPI document...';
        
        const content = await this.electronService.readFile(openApiFile);
        console.log('File content loaded, parsing OpenAPI...');
        
        const document = await this.openApiService.parseOpenAPI(content, openApiFile);
        
        if (document) {
          console.log('OpenAPI document parsed successfully:', document.info.title);
          const project: Project = {
            name: document.info.title || 'Untitled API',
            path: folderPath,
            type: 'local',
            openApiPath: openApiFile,
            lastModified: new Date(),
            isValid: true
          };
          
          // Set both document and project in the service
          this.openApiService.setCurrentDocument(document);
          this.openApiService.setCurrentProject(project);
          this.router.navigate(['/editor']);
        } else {
          console.error('Failed to parse OpenAPI document');
          // Get the error message from the service
          this.openApiService.errors.subscribe(errors => {
            const errorMessage = errors.length > 0 ? errors[0] : 'Unknown parsing error';
            this.errorLogService.logError(
              'Invalid OpenAPI document',
              'validation',
              errorMessage,
              { filePath: openApiFile, errors },
              openApiFile
            );
            if (errors.length > 0) {
              this.showMessage(`Invalid OpenAPI document: ${errors[0]}`);
            } else {
              this.showMessage('Invalid OpenAPI document');
            }
          });
        }
      } else {
        console.log('No OpenAPI file found. Files searched:', openApiFiles);
        this.errorLogService.logWarning(
          'No OpenAPI file found in the selected folder',
          'file-open',
          `Searched ${openApiFiles.length} files but none were valid OpenAPI documents`,
          { folderPath, filesFound: openApiFiles }
        );
        this.showMessage('No OpenAPI file found in the selected folder');
      }
    } catch (error: any) {
      this.errorLogService.logError(
        'Failed to load project from folder',
        'file-open',
        error.message,
        { error, folderPath },
        folderPath
      );
      this.showMessage(`Failed to load project: ${error.message}`);
    }
  }

  connectGitHub(): void {
    this.isLoading = true;
    this.loadingMessage = 'Connecting to GitHub...';
    
    setTimeout(() => {
      this.isLoading = false;
      this.showMessage('GitHub integration coming soon');
    }, 1000);
  }

  createNewGateway(): void {
    this.router.navigate(['/new-gateway']);
  }

  async openRecentProject(project: Project): Promise<void> {
    this.isLoading = true;
    this.loadingMessage = `Opening ${project.name}...`;
    
    try {
      if (project.type === 'local' && project.openApiPath) {
        const content = await this.electronService.readFile(project.openApiPath);
        const document = await this.openApiService.parseOpenAPI(content, project.openApiPath);
        
        if (document) {
          // Set both document and project in the service
          this.openApiService.setCurrentDocument(document);
          this.openApiService.setCurrentProject(project);
          this.router.navigate(['/editor']);
        } else {
          this.showMessage('Failed to load OpenAPI document');
        }
      } else {
        // GitHub project
        this.router.navigate(['/editor']);
      }
    } catch (error: any) {
      this.showMessage(`Failed to open project: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }
  
  openErrorLogs(): void {
    this.dialog.open(ErrorLogModalComponent, {
      width: '90%',
      maxWidth: '1200px',
      height: '80vh'
    });
  }

  private showMessage(message: string): void {
    this.snackBar.open(message, 'Close', {
      duration: 3000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom'
    });
  }
}