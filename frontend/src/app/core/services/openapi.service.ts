import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, from } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { ApiService, GatewayConfig, GatewayEndpoint } from './api.service';
import { StorageService } from './storage.service';
import SwaggerParser from '@apidevtools/swagger-parser';
import * as yaml from 'js-yaml';

export interface OpenAPIDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
    termsOfService?: string;
    contact?: any;
    license?: any;
  };
  servers?: any[];
  paths: any;
  components?: any;
  security?: any[];
  tags?: any[];
  externalDocs?: any;
  [key: string]: any;
}

export interface Project {
  id?: string;
  name: string;
  path?: string;
  type: 'local' | 'github' | 'remote';
  configId?: string;
  lastModified: Date;
  isValid?: boolean;
  openApiPath?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OpenApiService {
  private currentConfig$ = new BehaviorSubject<GatewayConfig | null>(null);
  private currentEndpoints$ = new BehaviorSubject<GatewayEndpoint[]>([]);
  private currentDocument$ = new BehaviorSubject<OpenAPIDocument | null>(null);
  private currentProject$ = new BehaviorSubject<Project | null>(null);
  private recentProjects$ = new BehaviorSubject<Project[]>([]);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private errors$ = new BehaviorSubject<string[]>([]);

  constructor(
    private apiService: ApiService,
    private storageService: StorageService
  ) {
    this.loadRecentProjects();
  }

  get currentConfig(): Observable<GatewayConfig | null> {
    return this.currentConfig$.asObservable();
  }

  get currentEndpoints(): Observable<GatewayEndpoint[]> {
    return this.currentEndpoints$.asObservable();
  }

  get currentDocument(): Observable<OpenAPIDocument | null> {
    return this.currentDocument$.asObservable();
  }

  get currentProject(): Observable<Project | null> {
    return this.currentProject$.asObservable();
  }

  get recentProjects(): Observable<Project[]> {
    return this.recentProjects$.asObservable();
  }

  get isLoading(): Observable<boolean> {
    return this.isLoading$.asObservable();
  }

  get errors(): Observable<string[]> {
    return this.errors$.asObservable();
  }

  // Load configuration from backend
  async loadGatewayConfig(configId: string): Promise<void> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const config = await this.apiService.getGatewayConfig(configId).toPromise();
      if (config) {
        this.currentConfig$.next(config);
        
        // Load endpoints
        const endpoints = await this.apiService.getEndpoints(configId).toPromise();
        if (endpoints) {
          this.currentEndpoints$.next(endpoints);
          
          // Generate OpenAPI document
          this.endpointsToDocument(config, endpoints);
        }

        // Update current project
        const project: Project = {
          id: config.id,
          name: config.name,
          type: 'remote',
          configId: config.id,
          lastModified: new Date(config.updatedAt),
          isValid: true
        };
        this.setCurrentProject(project);
      }
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to load gateway configuration']);
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Import file to backend
  async importFile(file: File): Promise<string | null> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const result = await this.apiService.importFile(file).toPromise();
      if (result && result.success) {
        await this.loadGatewayConfig(result.configId);
        return result.configId;
      }
      return null;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to import file']);
      return null;
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Export configuration from backend
  async exportConfig(configId: string, format: 'json' | 'yaml' = 'yaml'): Promise<void> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const blob = await this.apiService.exportConfig(configId, format).toPromise();
      if (blob) {
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `openapi-${configId}.${format}`;
        link.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to export configuration']);
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Create new gateway configuration
  async createGatewayConfig(config: {
    name: string;
    version: string;
    description?: string;
    openapiVersion?: string;
  }): Promise<string | null> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const result = await this.apiService.createGatewayConfig(config).toPromise();
      if (result) {
        await this.loadGatewayConfig(result.id);
        return result.id;
      }
      return null;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to create gateway configuration']);
      return null;
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Update current configuration
  async updateGatewayConfig(updates: any): Promise<boolean> {
    const config = this.currentConfig$.value;
    if (!config) {
      this.errors$.next(['No configuration loaded']);
      return false;
    }

    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const updated = await this.apiService.updateGatewayConfig(config.id, updates).toPromise();
      if (updated) {
        this.currentConfig$.next(updated);
        return true;
      }
      return false;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to update configuration']);
      return false;
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Endpoint management
  async addEndpoint(endpoint: any): Promise<boolean> {
    const config = this.currentConfig$.value;
    if (!config) {
      this.errors$.next(['No configuration loaded']);
      return false;
    }

    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const created = await this.apiService.createEndpoint(config.id, endpoint).toPromise();
      if (created) {
        const endpoints = [...this.currentEndpoints$.value, created];
        this.currentEndpoints$.next(endpoints);
        this.updateDocument();
        return true;
      }
      return false;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to add endpoint']);
      return false;
    } finally {
      this.isLoading$.next(false);
    }
  }

  async updateEndpoint(endpointId: string, updates: any): Promise<boolean> {
    const config = this.currentConfig$.value;
    if (!config) {
      this.errors$.next(['No configuration loaded']);
      return false;
    }

    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const updated = await this.apiService.updateEndpoint(config.id, endpointId, updates).toPromise();
      if (updated) {
        const endpoints = this.currentEndpoints$.value.map(e => 
          e.id === endpointId ? updated : e
        );
        this.currentEndpoints$.next(endpoints);
        this.updateDocument();
        return true;
      }
      return false;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to update endpoint']);
      return false;
    } finally {
      this.isLoading$.next(false);
    }
  }

  async deleteEndpoint(endpointId: string): Promise<boolean> {
    const config = this.currentConfig$.value;
    if (!config) {
      this.errors$.next(['No configuration loaded']);
      return false;
    }

    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      await this.apiService.deleteEndpoint(config.id, endpointId).toPromise();
      const endpoints = this.currentEndpoints$.value.filter(e => e.id !== endpointId);
      this.currentEndpoints$.next(endpoints);
      this.updateDocument();
      return true;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to delete endpoint']);
      return false;
    } finally {
      this.isLoading$.next(false);
    }
  }

  async reorderEndpoints(endpointIds: string[]): Promise<boolean> {
    const config = this.currentConfig$.value;
    if (!config) {
      this.errors$.next(['No configuration loaded']);
      return false;
    }

    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      await this.apiService.reorderEndpoints(config.id, endpointIds).toPromise();
      
      // Reorder local endpoints
      const endpointsMap = new Map(this.currentEndpoints$.value.map(e => [e.id, e]));
      const reordered = endpointIds.map(id => endpointsMap.get(id)).filter(Boolean) as GatewayEndpoint[];
      this.currentEndpoints$.next(reordered);
      return true;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to reorder endpoints']);
      return false;
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Validate OpenAPI document
  async validateOpenAPI(document: any | OpenAPIDocument): Promise<{ valid: boolean; errors: string[] }> {
    try {
      await SwaggerParser.validate(document as any);
      return { valid: true, errors: [] };
    } catch (error: any) {
      const errors = error.message ? [error.message] : ['Unknown validation error'];
      return { valid: false, errors };
    }
  }

  // Convert formats
  convertToYAML(document: OpenAPIDocument): string {
    return yaml.dump(document, {
      indent: 2,
      lineWidth: -1,
      noRefs: false,
      sortKeys: false
    });
  }

  convertToJSON(document: OpenAPIDocument): string {
    return JSON.stringify(document, null, 2);
  }

  // Generate curl example
  generateCurlExample(endpoint: GatewayEndpoint, baseUrl = 'https://api.example.com'): string {
    return this.apiService.generateCurl(
      this.currentConfig$.value || {} as GatewayConfig,
      endpoint
    );
  }

  // Project management
  setCurrentProject(project: Project): void {
    this.currentProject$.next(project);
    
    // Add to recent projects if not already there
    const recentProjects = this.recentProjects$.value;
    const existingIndex = recentProjects.findIndex(p => 
      p.path === project.path && p.type === project.type
    );
    
    if (existingIndex >= 0) {
      // Move to top and update
      recentProjects.splice(existingIndex, 1);
    }
    
    // Add to top of list
    recentProjects.unshift({ ...project, lastModified: new Date() });
    
    // Keep only last 10 projects
    if (recentProjects.length > 10) {
      recentProjects.splice(10);
    }
    
    this.recentProjects$.next(recentProjects);
    this.saveRecentProjects();
  }

  private addToRecentProjects(project: Project): void {
    // This method is now integrated into setCurrentProject
  }

  private loadRecentProjects(): void {
    const stored = this.storageService.getItem('recentProjects');
    if (stored) {
      try {
        const projects = JSON.parse(stored);
        // Convert lastModified strings back to Date objects
        projects.forEach((p: any) => {
          if (p.lastModified) {
            p.lastModified = new Date(p.lastModified);
          }
        });
        this.recentProjects$.next(projects);
      } catch (error) {
        console.error('Failed to load recent projects:', error);
        this.recentProjects$.next([]);
      }
    }
  }

  // Save recent projects to storage
  private saveRecentProjects(): void {
    const projects = this.recentProjects$.value;
    this.storageService.setItem('recentProjects', JSON.stringify(projects));
  }

  // List all configurations
  async loadAllConfigurations(page = 1, limit = 10): Promise<void> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      const response = await this.apiService.getGatewayConfigs(page, limit).toPromise();
      if (response) {
        // Convert to projects
        const projects: Project[] = response.data.map(config => ({
          id: config.id,
          name: config.name,
          type: 'remote' as const,
          configId: config.id,
          lastModified: new Date(config.updatedAt),
          isValid: true
        }));
        this.recentProjects$.next(projects);
      }
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to load configurations']);
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Get endpoints from document
  getEndpoints(document: OpenAPIDocument): any[] {
    const endpoints: any[] = [];
    if (!document || !document.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            ...(operation as any)
          });
        }
      }
    }
    return endpoints;
  }

  // Convert endpoints to OpenAPI document
  endpointsToDocument(config: GatewayConfig, endpoints: GatewayEndpoint[]): OpenAPIDocument {
    const document: OpenAPIDocument = {
      openapi: config.openapiVersion || '3.0.0',
      info: {
        title: config.name,
        version: config.version,
        description: config.description
      },
      paths: {}
    };

    // Add metadata
    if (config.metadata) {
      if (config.metadata.servers) document.servers = config.metadata.servers;
      if (config.metadata.security) document.security = config.metadata.security;
      if (config.metadata.tags) document.tags = config.metadata.tags;
      if (config.metadata.externalDocs) document.externalDocs = config.metadata.externalDocs;
    }

    // Convert endpoints to paths
    for (const endpoint of endpoints) {
      if (!document.paths[endpoint.path]) {
        document.paths[endpoint.path] = {};
      }

      const operation: any = {
        operationId: endpoint.operationId,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags
      };

      // Add parameters
      const parameters: any[] = [];
      if (endpoint.pathParams) {
        for (const [name, param] of Object.entries(endpoint.pathParams)) {
          parameters.push({
            name,
            in: 'path',
            ...(param as any)
          });
        }
      }
      if (endpoint.queryParams) {
        for (const [name, param] of Object.entries(endpoint.queryParams)) {
          parameters.push({
            name,
            in: 'query',
            ...(param as any)
          });
        }
      }
      if (endpoint.headers) {
        for (const [name, param] of Object.entries(endpoint.headers)) {
          parameters.push({
            name,
            in: 'header',
            ...(param as any)
          });
        }
      }

      if (parameters.length > 0) {
        operation.parameters = parameters;
      }

      // Add request body
      if (endpoint.requestBody) {
        operation.requestBody = endpoint.requestBody;
      }

      // Add responses
      if (endpoint.responses) {
        operation.responses = endpoint.responses;
      } else {
        operation.responses = {
          '200': {
            description: 'Successful response'
          }
        };
      }

      // Add security
      if (endpoint.security) {
        operation.security = endpoint.security;
      }

      // Add extensions
      if (endpoint.xExtensions) {
        Object.assign(operation, endpoint.xExtensions);
      }

      document.paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    }

    this.currentDocument$.next(document);
    return document;
  }

  // Update current document when endpoints change
  private updateDocument(): void {
    const config = this.currentConfig$.value;
    const endpoints = this.currentEndpoints$.value;
    if (config && endpoints) {
      this.endpointsToDocument(config, endpoints);
    }
  }

  // Parse OpenAPI document from content
  async parseOpenAPI(content: string, filePath?: string): Promise<OpenAPIDocument | null> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      let parsedContent: any;

      // Try to parse as YAML first, then JSON
      try {
        parsedContent = yaml.load(content) as any;
      } catch (yamlError) {
        try {
          parsedContent = JSON.parse(content);
        } catch (jsonError) {
          throw new Error('Invalid YAML or JSON format');
        }
      }

      // Validate that it's an OpenAPI document
      if (!parsedContent.openapi && !parsedContent.swagger) {
        throw new Error('Not a valid OpenAPI or Swagger document');
      }

      // Convert Swagger 2.0 to OpenAPI 3.0 if needed
      if (parsedContent.swagger) {
        // Basic conversion from Swagger 2.0 to OpenAPI 3.0
        const openApiDoc: OpenAPIDocument = {
          openapi: '3.0.0',
          info: parsedContent.info || { title: 'API', version: '1.0.0' },
          paths: parsedContent.paths || {},
          components: {
            schemas: parsedContent.definitions || {},
            securitySchemes: parsedContent.securityDefinitions || {}
          }
        };

        if (parsedContent.host || parsedContent.basePath) {
          const protocol = parsedContent.schemes && parsedContent.schemes.includes('https') ? 'https' : 'http';
          const host = parsedContent.host || 'localhost';
          const basePath = parsedContent.basePath || '';
          openApiDoc.servers = [{
            url: `${protocol}://${host}${basePath}`
          }];
        }

        parsedContent = openApiDoc;
      }

      // Use SwaggerParser to validate and dereference
      const api = await SwaggerParser.validate(parsedContent);
      
      this.currentDocument$.next(api as OpenAPIDocument);
      return api as OpenAPIDocument;

    } catch (error: any) {
      const errorMessage = error.message || 'Failed to parse OpenAPI document';
      this.errors$.next([errorMessage]);
      console.error('OpenAPI parsing error:', error);
      return null;
    } finally {
      this.isLoading$.next(false);
    }
  }

  // Set current document
  setCurrentDocument(document: OpenAPIDocument): void {
    this.currentDocument$.next(document);
  }

  // Clear current state
  clearCurrent(): void {
    this.currentConfig$.next(null);
    this.currentEndpoints$.next([]);
    this.currentDocument$.next(null);
    this.currentProject$.next(null);
    this.errors$.next([]);
  }
}