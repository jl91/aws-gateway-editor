import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatRadioModule } from '@angular/material/radio';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';
import { ApiService } from '../../core/services/api.service';
import { OpenApiService, Project, OpenAPIDocument } from '../../core/services/openapi.service';
import * as yaml from 'js-yaml';

interface SecurityScheme {
  type: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect';
  scheme?: string;
  bearerFormat?: string;
  name?: string;
  in?: 'header' | 'query' | 'cookie';
  flows?: any;
  openIdConnectUrl?: string;
  description?: string;
}

interface Server {
  url: string;
  description?: string;
  variables?: {
    [key: string]: {
      default: string;
      description?: string;
      enum?: string[];
    }
  };
}

interface Tag {
  name: string;
  description?: string;
  externalDocs?: {
    description?: string;
    url: string;
  };
}

@Component({
  selector: 'app-new-gateway',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatRadioModule,
    MatStepperModule,
    MatSnackBarModule,
    MatDialogModule,
    MonacoEditorComponent
  ],
  templateUrl: './new-gateway.component.html',
  styleUrls: ['./new-gateway.component.scss']
})
export class NewGatewayComponent implements OnInit {
  gatewayForm: FormGroup;
  contactForm: FormGroup;
  serverForm: FormGroup;
  
  // UI State
  isLinear = true;
  fileFormat: 'yaml' | 'json' = 'yaml';
  selectedSecurityType: 'http' | 'apiKey' | 'oauth2' | 'openIdConnect' = 'http';
  selectedTemplate: any = null;
  previewContent: string = '';
  templates: any[] = [
    {
      id: 'basic',
      name: 'Basic API',
      description: 'Simple REST API with basic operations',
      icon: 'api'
    },
    {
      id: 'microservice',
      name: 'Microservice',
      description: 'Microservice pattern with health checks',
      icon: 'cloud'
    },
    {
      id: 'crud',
      name: 'CRUD API',
      description: 'Complete CRUD operations for a resource',
      icon: 'storage'
    }
  ];
  
  // Collections
  servers: Server[] = [];
  securitySchemes: { [key: string]: SecurityScheme } = {};
  tags: Tag[] = [];
  
  // AWS API Gateway Extensions
  enableAWSExtensions = false;
  awsSettings = {
    enableCORS: false,
    enableRequestValidation: false,
    enableMetrics: false,
    enableTracing: false,
    enableCaching: false,
    defaultCacheTtl: 300,
    defaultThrottleRate: 10000,
    defaultThrottleBurst: 5000
  };
  
  // Schema Types
  schemaTypes = [
    { value: 'string', label: 'String' },
    { value: 'number', label: 'Number' },
    { value: 'integer', label: 'Integer' },
    { value: 'boolean', label: 'Boolean' },
    { value: 'array', label: 'Array' },
    { value: 'object', label: 'Object' }
  ];
  
  // Security Types
  securityTypes = [
    { value: 'http', label: 'HTTP' },
    { value: 'apiKey', label: 'API Key' },
    { value: 'oauth2', label: 'OAuth 2.0' },
    { value: 'openIdConnect', label: 'OpenID Connect' }
  ];
  
  // API Key Locations
  apiKeyLocations = [
    { value: 'header', label: 'Header' },
    { value: 'query', label: 'Query Parameter' },
    { value: 'cookie', label: 'Cookie' }
  ];
  
  // OAuth2 Flows
  oauth2Flows = [
    { value: 'implicit', label: 'Implicit' },
    { value: 'authorizationCode', label: 'Authorization Code' },
    { value: 'clientCredentials', label: 'Client Credentials' },
    { value: 'password', label: 'Resource Owner Password' }
  ];
  
  // HTTP Authentication Schemes
  httpSchemes = [
    { value: 'basic', label: 'Basic' },
    { value: 'bearer', label: 'Bearer' },
    { value: 'digest', label: 'Digest' },
    { value: 'hoba', label: 'HOBA' },
    { value: 'mutual', label: 'Mutual' },
    { value: 'negotiate', label: 'Negotiate' },
    { value: 'oauth', label: 'OAuth' },
    { value: 'scram-sha-1', label: 'SCRAM-SHA-1' },
    { value: 'scram-sha-256', label: 'SCRAM-SHA-256' },
    { value: 'vapid', label: 'VAPID' }
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private snackBar: MatSnackBar,
    private openApiService: OpenApiService,
    private apiService: ApiService
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
      url: ['', [Validators.pattern(/^https?:\/\/.+/)]]
    });

    this.serverForm = this.fb.group({
      url: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      description: ['']
    });
  }

  // Server Management
  addServer(): void {
    if (this.serverForm.valid) {
      this.servers.push(this.serverForm.value);
      this.serverForm.reset();
    }
  }

  removeServer(index: number): void {
    this.servers.splice(index, 1);
  }

  dropServer(event: CdkDragDrop<Server[]>): void {
    moveItemInArray(this.servers, event.previousIndex, event.currentIndex);
  }

  // Tag Management
  addTag(name: string, description?: string): void {
    if (name && !this.tags.find(t => t.name === name)) {
      this.tags.push({ name, description });
    }
  }

  removeTag(index: number): void {
    this.tags.splice(index, 1);
  }

  dropTag(event: CdkDragDrop<Tag[]>): void {
    moveItemInArray(this.tags, event.previousIndex, event.currentIndex);
  }

  // Security Scheme Management
  addSecurityScheme(name: string, scheme: SecurityScheme): void {
    if (name && !this.securitySchemes[name]) {
      this.securitySchemes[name] = scheme;
    }
  }

  removeSecurityScheme(name: string): void {
    delete this.securitySchemes[name];
  }

  getSecuritySchemeKeys(): string[] {
    return Object.keys(this.securitySchemes);
  }

  // Generate OpenAPI Document
  private generateOpenAPIDocument(): OpenAPIDocument {
    const formValue = this.gatewayForm.value;
    const contactValue = this.contactForm.value;
    
    const document: OpenAPIDocument = {
      openapi: '3.0.0',
      info: {
        title: formValue.title,
        version: formValue.version,
        description: formValue.description,
        termsOfService: formValue.termsOfService,
        contact: contactValue.email || contactValue.name || contactValue.url ? {
          name: contactValue.name,
          email: contactValue.email,
          url: contactValue.url
        } : undefined,
        license: formValue.license?.name ? {
          name: formValue.license.name,
          url: formValue.license.url
        } : undefined
      },
      servers: this.servers.length > 0 ? this.servers : undefined,
      paths: {},
      components: Object.keys(this.securitySchemes).length > 0 ? {
        securitySchemes: this.securitySchemes
      } : undefined,
      tags: this.tags.length > 0 ? this.tags : undefined
    };

    // Add AWS API Gateway Extensions if enabled
    if (this.enableAWSExtensions) {
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
    
    try {
      // Create gateway configuration in backend
      const config = await this.apiService.createGatewayConfig({
        name: document.info.title,
        version: document.info.version,
        description: document.info.description,
        openapiVersion: document.openapi,
        metadata: {
          servers: document.servers,
          security: document.security,
          tags: document.tags,
          externalDocs: document.externalDocs,
          components: document.components
        }
      }).toPromise();

      if (config) {
        // Load the created configuration
        await this.openApiService.loadGatewayConfig(config.id);
        
        this.snackBar.open('Gateway created successfully!', 'Close', {
          duration: 3000
        });
        
        this.router.navigate(['/editor']);
      }
    } catch (error: any) {
      this.snackBar.open(`Failed to create gateway: ${error.message}`, 'Close', {
        duration: 5000
      });
    }
  }

  selectTemplate(template: any): void {
    this.selectedTemplate = template;
    // You can add logic here to populate forms based on the selected template
  }

  generatePreview(): void {
    const document = this.generateOpenAPIDocument();
    
    if (this.fileFormat === 'yaml') {
      this.previewContent = yaml.dump(document, { indent: 2 });
    } else {
      this.previewContent = JSON.stringify(document, null, 2);
    }
  }

  // Navigation
  goBack(stepper: MatStepper): void {
    stepper.previous();
  }

  goForward(stepper: MatStepper): void {
    stepper.next();
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}