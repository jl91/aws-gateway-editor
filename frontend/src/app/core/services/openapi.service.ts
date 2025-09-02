import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
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
  name: string;
  path: string;
  type: 'local' | 'github';
  openApiPath?: string;
  lastModified: Date;
  isValid?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OpenApiService {
  private currentDocument$ = new BehaviorSubject<OpenAPIDocument | null>(null);
  private currentProject$ = new BehaviorSubject<Project | null>(null);
  private recentProjects$ = new BehaviorSubject<Project[]>([]);
  private isLoading$ = new BehaviorSubject<boolean>(false);
  private errors$ = new BehaviorSubject<string[]>([]);

  constructor() {
    this.loadRecentProjects();
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

  async loadOpenAPIFile(filePath: string): Promise<OpenAPIDocument | null> {
    try {
      this.isLoading$.next(true);
      this.errors$.next([]);

      // In Electron environment, this would read from file system
      // For now, we'll use a mock implementation
      const content = await this.readFile(filePath);
      
      if (!content) {
        throw new Error('File not found or empty');
      }

      const document = await this.parseOpenAPI(content, filePath);
      
      if (document) {
        this.currentDocument$.next(document);
        return document;
      }
      
      return null;
    } catch (error: any) {
      this.errors$.next([error.message || 'Failed to load OpenAPI file']);
      return null;
    } finally {
      this.isLoading$.next(false);
    }
  }

  async parseOpenAPI(content: string, filePath: string): Promise<OpenAPIDocument | null> {
    try {
      let document: any;
      
      // Determine if content is YAML or JSON
      if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        try {
          document = yaml.load(content);
        } catch (yamlError: any) {
          console.error('YAML parse error:', yamlError);
          this.errors$.next([`YAML parse error: ${yamlError.message}`]);
          return null;
        }
      } else if (filePath.endsWith('.json')) {
        try {
          document = JSON.parse(content);
        } catch (jsonError: any) {
          console.error('JSON parse error:', jsonError);
          this.errors$.next([`JSON parse error: ${jsonError.message}`]);
          return null;
        }
      } else {
        // Try to auto-detect format
        try {
          document = JSON.parse(content);
        } catch {
          try {
            document = yaml.load(content);
          } catch (error: any) {
            console.error('Failed to parse as JSON or YAML:', error);
            this.errors$.next([`Failed to parse file as JSON or YAML: ${error.message}`]);
            return null;
          }
        }
      }

      // Check if it's an OpenAPI document
      if (!document.openapi && !document.swagger) {
        this.errors$.next(['Not an OpenAPI document: missing "openapi" or "swagger" field']);
        return null;
      }

      // Validate with swagger-parser
      console.log('Validating OpenAPI document...');
      const validated = await SwaggerParser.validate(document as any) as OpenAPIDocument;
      console.log('OpenAPI document validated successfully');
      this.errors$.next([]); // Clear errors on success
      return validated;
    } catch (error: any) {
      console.error('OpenAPI validation error:', error);
      this.errors$.next([`OpenAPI validation error: ${error.message}`]);
      return null;
    }
  }

  async validateOpenAPI(document: any): Promise<{ valid: boolean; errors: string[] }> {
    try {
      await SwaggerParser.validate(document as any);
      return { valid: true, errors: [] };
    } catch (error: any) {
      const errors = error.message ? [error.message] : ['Unknown validation error'];
      return { valid: false, errors };
    }
  }

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

  async saveDocument(document: OpenAPIDocument, filePath: string): Promise<boolean> {
    try {
      const content = filePath.endsWith('.yaml') || filePath.endsWith('.yml')
        ? this.convertToYAML(document)
        : this.convertToJSON(document);
      
      // In Electron, this would write to file system
      await this.writeFile(filePath, content);
      
      this.currentDocument$.next(document);
      return true;
    } catch (error: any) {
      this.errors$.next([`Failed to save: ${error.message}`]);
      return false;
    }
  }

  setCurrentDocument(document: OpenAPIDocument): void {
    this.currentDocument$.next(document);
  }

  setCurrentProject(project: Project): void {
    this.currentProject$.next(project);
    this.addToRecentProjects(project);
  }

  private addToRecentProjects(project: Project): void {
    const recent = this.recentProjects$.value;
    const filtered = recent.filter(p => p.path !== project.path);
    const updated = [project, ...filtered].slice(0, 10); // Keep only 10 recent
    this.recentProjects$.next(updated);
    this.saveRecentProjects(updated);
  }

  private loadRecentProjects(): void {
    // In Electron, load from storage
    const stored = localStorage.getItem('recentProjects');
    if (stored) {
      try {
        const projects = JSON.parse(stored);
        this.recentProjects$.next(projects);
      } catch (error) {
        console.error('Failed to load recent projects:', error);
      }
    }
  }

  private saveRecentProjects(projects: Project[]): void {
    // In Electron, save to storage
    localStorage.setItem('recentProjects', JSON.stringify(projects));
  }

  private async readFile(filePath: string): Promise<string> {
    // Mock implementation - in real app, use Electron IPC
    return Promise.resolve('');
  }

  private async writeFile(filePath: string, content: string): Promise<void> {
    // Mock implementation - in real app, use Electron IPC
    return Promise.resolve();
  }

  getEndpoints(document: OpenAPIDocument): any[] {
    const endpoints: any[] = [];
    
    if (!document || !document.paths) {
      return endpoints;
    }

    for (const [path, pathItem] of Object.entries(document.paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
          // Extract x-extensions
          const extensions: { [key: string]: any } = {};
          for (const [key, value] of Object.entries(operation as any)) {
            if (key.startsWith('x-')) {
              extensions[key] = value;
            }
          }
          
          endpoints.push({
            id: (operation as any).operationId || `${method}_${path}`,
            method: method.toUpperCase(),
            path,
            summary: (operation as any).summary || '',
            description: (operation as any).description || '',
            tags: (operation as any).tags || [],
            parameters: (operation as any).parameters || [],
            requestBody: (operation as any).requestBody,
            responses: (operation as any).responses || {},
            security: (operation as any).security,
            extensions: Object.keys(extensions).length > 0 ? extensions : undefined,
            deprecated: (operation as any).deprecated || false
          });
        }
      }
    }

    return endpoints;
  }

  updateEndpoint(document: OpenAPIDocument, endpoint: any): OpenAPIDocument {
    const updatedDoc = { ...document };
    
    // If updating and path or method changed, remove the old endpoint
    if (endpoint.originalPath && endpoint.originalMethod) {
      const oldPath = endpoint.originalPath;
      const oldMethod = endpoint.originalMethod.toLowerCase();
      
      // Check if old endpoint exists and if path/method changed
      if (updatedDoc.paths[oldPath] && 
          updatedDoc.paths[oldPath][oldMethod] &&
          (oldPath !== endpoint.path || oldMethod !== endpoint.method.toLowerCase())) {
        
        // Remove the old endpoint
        delete updatedDoc.paths[oldPath][oldMethod];
        
        // If the old path has no more methods, remove it
        if (Object.keys(updatedDoc.paths[oldPath]).length === 0) {
          delete updatedDoc.paths[oldPath];
        }
      }
    }
    
    // Add/update the endpoint at the new location
    if (!updatedDoc.paths[endpoint.path]) {
      updatedDoc.paths[endpoint.path] = {};
    }
    
    updatedDoc.paths[endpoint.path][endpoint.method.toLowerCase()] = {
      operationId: endpoint.id,
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      security: endpoint.security,
      ...this.extractExtensions(endpoint)
    };

    return updatedDoc;
  }

  addEndpoint(document: OpenAPIDocument, endpoint: any): OpenAPIDocument {
    const updatedDoc = { ...document };
    
    // Ensure paths object exists
    if (!updatedDoc.paths) {
      updatedDoc.paths = {};
    }
    
    // Create path if it doesn't exist
    if (!updatedDoc.paths[endpoint.path]) {
      updatedDoc.paths[endpoint.path] = {};
    }
    
    // Check if method already exists for this path
    if (updatedDoc.paths[endpoint.path][endpoint.method.toLowerCase()]) {
      throw new Error(`Endpoint ${endpoint.method} ${endpoint.path} already exists`);
    }
    
    // Add the new endpoint
    updatedDoc.paths[endpoint.path][endpoint.method.toLowerCase()] = {
      operationId: endpoint.id,
      summary: endpoint.summary,
      description: endpoint.description,
      tags: endpoint.tags,
      deprecated: endpoint.deprecated,
      parameters: endpoint.parameters,
      requestBody: endpoint.requestBody,
      responses: endpoint.responses,
      security: endpoint.security,
      externalDocs: endpoint.externalDocs,
      ...this.extractExtensions(endpoint)
    };
    
    // Add tags to global tags if they don't exist
    if (endpoint.tags && endpoint.tags.length > 0) {
      if (!updatedDoc.tags) {
        updatedDoc.tags = [];
      }
      
      endpoint.tags.forEach((tag: string) => {
        if (!updatedDoc.tags?.find((t: any) => t.name === tag)) {
          updatedDoc.tags?.push({ name: tag, description: '' });
        }
      });
    }

    return updatedDoc;
  }

  private extractExtensions(endpoint: any): any {
    const extensions: any = {};
    
    // Extract all x- prefixed properties
    Object.keys(endpoint).forEach(key => {
      if (key.startsWith('x-')) {
        extensions[key] = endpoint[key];
      }
    });
    
    return extensions;
  }

  deleteEndpoint(document: OpenAPIDocument, path: string, method: string): OpenAPIDocument {
    const updatedDoc = { ...document };
    
    if (updatedDoc.paths[path]) {
      delete updatedDoc.paths[path][method.toLowerCase()];
      
      // Remove path if no methods remain
      if (Object.keys(updatedDoc.paths[path]).length === 0) {
        delete updatedDoc.paths[path];
      }
    }

    return updatedDoc;
  }

  generateCurlExample(endpoint: any, baseUrl = 'https://api.example.com'): string {
    const url = `${baseUrl}${endpoint.path}`;
    let curl = `curl -X ${endpoint.method} '${url}'`;
    
    // Add headers
    curl += ` \\\n  -H 'Accept: application/json'`;
    
    if (endpoint.security) {
      curl += ` \\\n  -H 'Authorization: Bearer <TOKEN>'`;
    }
    
    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody) {
      const contentType = Object.keys(endpoint.requestBody.content || {})[0] || 'application/json';
      curl += ` \\\n  -H 'Content-Type: ${contentType}'`;
      
      if (contentType === 'application/json') {
        curl += ` \\\n  -d '{"example": "data"}'`;
      }
    }
    
    return curl;
  }
}