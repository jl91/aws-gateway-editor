import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { OpenApiService, OpenAPIDocument } from '../../core/services/openapi.service';
import { ElectronService } from '../../core/services/electron.service';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';

interface GatewayTemplate {
  name: string;
  description: string;
  template: Partial<OpenAPIDocument>;
}

@Component({
  selector: 'app-new-gateway',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatTabsModule,
    MatIconModule,
    MatChipsModule,
    MatRadioModule,
    MatSnackBarModule,
    MonacoEditorComponent
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './new-gateway.component.html',
  styleUrls: ['./new-gateway.component.scss']
})
export class NewGatewayComponent implements OnInit {
  gatewayForm: FormGroup;
  contactForm: FormGroup;
  serverForm: FormGroup;
  
  fileFormat: 'yaml' | 'json' = 'yaml';
  previewContent = '';
  showPreview = false;
  
  templates: GatewayTemplate[] = [
    {
      name: 'Basic REST API',
      description: 'Simple REST API with CRUD operations',
      template: {
        openapi: '3.0.3',
        info: {
          title: 'REST API',
          version: '1.0.0',
          description: 'A simple REST API'
        },
        paths: {}
      }
    },
    {
      name: 'Microservice API',
      description: 'Microservice with authentication and monitoring',
      template: {
        openapi: '3.0.3',
        info: {
          title: 'Microservice API',
          version: '1.0.0',
          description: 'Microservice API with authentication'
        },
        security: [{ bearerAuth: [] }],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT'
            }
          }
        },
        paths: {}
      }
    },
    {
      name: 'AWS API Gateway',
      description: 'AWS API Gateway with Lambda integration',
      template: {
        openapi: '3.0.3',
        info: {
          title: 'AWS API Gateway',
          version: '1.0.0',
          description: 'API Gateway with AWS integrations'
        },
        'x-amazon-apigateway-request-validators': {
          all: {
            validateRequestBody: true,
            validateRequestParameters: true
          }
        },
        paths: {}
      }
    }
  ];
  
  selectedTemplate: GatewayTemplate | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private openApiService: OpenApiService,
    private electronService: ElectronService
  ) {
    this.gatewayForm = this.fb.group({});
    this.contactForm = this.fb.group({});
    this.serverForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.initializeForms();
  }

  private initializeForms(): void {
    this.gatewayForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      version: ['1.0.0', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]],
      description: [''],
      termsOfService: [''],
      license: this.fb.group({
        name: [''],
        url: ['']
      })
    });

    this.contactForm = this.fb.group({
      name: [''],
      email: ['', [Validators.email]],
      url: ['']
    });

    this.serverForm = this.fb.group({
      url: ['https://api.example.com', [Validators.required]],
      description: ['Production server']
    });
  }

  selectTemplate(template: GatewayTemplate): void {
    this.selectedTemplate = template;
    
    if (template.template.info) {
      this.gatewayForm.patchValue({
        title: template.template.info.title,
        version: template.template.info.version || '1.0.0',
        description: template.template.info.description
      });
    }
    
    this.generatePreview();
  }

  generatePreview(): void {
    const document = this.generateOpenAPIDocument();
    
    if (this.fileFormat === 'yaml') {
      this.previewContent = this.openApiService.convertToYAML(document);
    } else {
      this.previewContent = this.openApiService.convertToJSON(document);
    }
    
    this.showPreview = true;
  }

  private generateOpenAPIDocument(): OpenAPIDocument {
    const formValue = this.gatewayForm.value;
    const contact = this.contactForm.value;
    const server = this.serverForm.value;
    
    const document: OpenAPIDocument = {
      openapi: '3.0.3',
      info: {
        title: formValue.title,
        version: formValue.version,
        description: formValue.description || undefined,
        termsOfService: formValue.termsOfService || undefined,
        contact: (contact.name || contact.email || contact.url) ? {
          name: contact.name || undefined,
          email: contact.email || undefined,
          url: contact.url || undefined
        } : undefined,
        license: (formValue.license.name || formValue.license.url) ? {
          name: formValue.license.name || undefined,
          url: formValue.license.url || undefined
        } : undefined
      },
      servers: server.url ? [{
        url: server.url,
        description: server.description || undefined
      }] : undefined,
      paths: {},
      components: this.selectedTemplate?.template.components || {
        schemas: {},
        responses: {},
        parameters: {},
        examples: {},
        requestBodies: {},
        headers: {},
        securitySchemes: {},
        links: {},
        callbacks: {}
      },
      security: this.selectedTemplate?.template.security || undefined,
      tags: [],
      externalDocs: undefined
    };

    // Add AWS-specific extensions if AWS template is selected
    if (this.selectedTemplate?.name === 'AWS API Gateway') {
      (document as any)['x-amazon-apigateway-request-validators'] = {
        all: {
          validateRequestBody: true,
          validateRequestParameters: true
        }
      };
    }

    return document;
  }

  async createGateway(): Promise<void> {
    if (this.gatewayForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000
      });
      return;
    }

    const document = this.generateOpenAPIDocument();
    
    // Validate the document
    const validation = await this.openApiService.validateOpenAPI(document);
    
    if (!validation.valid) {
      this.snackBar.open(`Invalid OpenAPI: ${validation.errors.join(', ')}`, 'Close', {
        duration: 5000
      });
      return;
    }

    // If in Electron, save to file system
    if (this.electronService.isElectronApp()) {
      const folderPath = await this.electronService.openFolder();
      
      if (folderPath) {
        const fileName = `openapi.${this.fileFormat}`;
        const filePath = `${folderPath}/${fileName}`;
        
        const content = this.fileFormat === 'yaml' 
          ? this.openApiService.convertToYAML(document)
          : this.openApiService.convertToJSON(document);
        
        const success = await this.electronService.writeFile(filePath, content);
        
        if (success) {
          // Create README.md
          await this.createReadme(folderPath, document);
          
          // Set as current project
          this.openApiService.setCurrentProject({
            name: document.info.title,
            path: folderPath,
            type: 'local',
            openApiPath: filePath,
            lastModified: new Date(),
            isValid: true
          });
          
          this.snackBar.open('Gateway created successfully!', 'Close', {
            duration: 3000
          });
          
          this.router.navigate(['/editor']);
        } else {
          this.snackBar.open('Failed to save gateway', 'Close', {
            duration: 3000
          });
        }
      }
    } else {
      // For web version, just navigate to editor with the document in memory
      this.router.navigate(['/editor']);
    }
  }

  private async createReadme(folderPath: string, document: OpenAPIDocument): Promise<void> {
    const readmeContent = `# ${document.info.title}

${document.info.description || 'API Gateway'}

## Version
${document.info.version}

## Servers
${document.servers?.map(s => `- ${s.url} - ${s.description || ''}`).join('\n') || '- No servers configured'}

## ENDPOINTS

<!-- This section will be automatically updated when endpoints are added -->

---

Generated with AWS API Gateway Editor
`;

    const readmePath = `${folderPath}/README.md`;
    await this.electronService.writeFile(readmePath, readmeContent);
  }

  cancel(): void {
    this.router.navigate(['/home']);
  }
}