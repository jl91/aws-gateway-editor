import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ElectronService } from './electron.service';

export interface TestRequest {
  id: string;
  timestamp: Date;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: any;
  queryParams?: Record<string, string>;
}

export interface TestResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  time: number; // Response time in ms
  size: number; // Response size in bytes
}

export interface TestResult {
  request: TestRequest;
  response?: TestResponse;
  error?: string;
  curl: string;
}

export interface TestHistory {
  results: TestResult[];
  maxSize: number;
}

@Injectable({
  providedIn: 'root'
})
export class TestService {
  private testHistory$ = new BehaviorSubject<TestHistory>({
    results: [],
    maxSize: 100
  });
  
  private isTestingEnabled$ = new BehaviorSubject<boolean>(false);
  private currentTest$ = new BehaviorSubject<TestResult | null>(null);
  
  constructor(private electronService: ElectronService) {
    this.loadHistory();
  }
  
  get testHistory(): Observable<TestHistory> {
    return this.testHistory$.asObservable();
  }
  
  get isTestingEnabled(): Observable<boolean> {
    return this.isTestingEnabled$.asObservable();
  }
  
  get currentTest(): Observable<TestResult | null> {
    return this.currentTest$.asObservable();
  }
  
  async testEndpoint(
    endpoint: any,
    baseUrl: string,
    authHeaders?: Record<string, string>
  ): Promise<TestResult> {
    const request: TestRequest = {
      id: `test-${Date.now()}`,
      timestamp: new Date(),
      method: endpoint.method.toUpperCase(),
      url: this.buildUrl(baseUrl, endpoint.path, endpoint.parameters),
      headers: this.buildHeaders(endpoint, authHeaders),
      body: this.buildRequestBody(endpoint),
      queryParams: this.extractQueryParams(endpoint.parameters)
    };
    
    const curl = this.generateCurl(request);
    
    try {
      const startTime = Date.now();
      const response = await this.executeRequest(request);
      const endTime = Date.now();
      
      const testResponse: TestResponse = {
        ...response,
        time: endTime - startTime,
        size: this.calculateResponseSize(response)
      };
      
      const result: TestResult = {
        request,
        response: testResponse,
        curl
      };
      
      this.addToHistory(result);
      this.currentTest$.next(result);
      return result;
      
    } catch (error: any) {
      const result: TestResult = {
        request,
        error: error.message || 'Unknown error occurred',
        curl
      };
      
      this.addToHistory(result);
      this.currentTest$.next(result);
      return result;
    }
  }
  
  private buildUrl(
    baseUrl: string,
    path: string,
    parameters?: any[]
  ): string {
    let url = baseUrl.replace(/\/$/, '') + path;
    
    // Replace path parameters
    if (parameters) {
      const pathParams = parameters.filter((p: any) => p.in === 'path');
      pathParams.forEach((param: any) => {
        const value = param.example || param.schema?.example || 'value';
        url = url.replace(`{${param.name}}`, value);
      });
    }
    
    return url;
  }
  
  private buildHeaders(
    endpoint: any,
    authHeaders?: Record<string, string>
  ): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...authHeaders
    };
    
    // Add content-type for request body
    if (endpoint.requestBody?.content) {
      const contentTypes = Object.keys(endpoint.requestBody.content);
      if (contentTypes.length > 0) {
        headers['Content-Type'] = contentTypes[0];
      }
    }
    
    // Add header parameters
    if (endpoint.parameters) {
      const headerParams = endpoint.parameters.filter((p: any) => p.in === 'header');
      headerParams.forEach((param: any) => {
        const value = param.example || param.schema?.example || 'value';
        headers[param.name] = value;
      });
    }
    
    return headers;
  }
  
  private buildRequestBody(endpoint: any): any {
    if (!endpoint.requestBody?.content) {
      return undefined;
    }
    
    const contentTypes = Object.keys(endpoint.requestBody.content);
    if (contentTypes.length === 0) {
      return undefined;
    }
    
    const content = endpoint.requestBody.content[contentTypes[0]];
    
    // Use example if available
    if (content.example) {
      return content.example;
    }
    
    // Use examples if available
    if (content.examples) {
      const exampleKeys = Object.keys(content.examples);
      if (exampleKeys.length > 0) {
        return content.examples[exampleKeys[0]].value;
      }
    }
    
    // Generate from schema
    if (content.schema) {
      return this.generateExampleFromSchema(content.schema);
    }
    
    return undefined;
  }
  
  private extractQueryParams(parameters?: any[]): Record<string, string> {
    if (!parameters) {
      return {};
    }
    
    const queryParams: Record<string, string> = {};
    const queryParameters = parameters.filter((p: any) => p.in === 'query');
    
    queryParameters.forEach((param: any) => {
      const value = param.example || param.schema?.example || 'value';
      queryParams[param.name] = value;
    });
    
    return queryParams;
  }
  
  private generateExampleFromSchema(schema: any): any {
    if (schema.example) {
      return schema.example;
    }
    
    if (schema.type === 'object') {
      const obj: any = {};
      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
          obj[key] = this.generateExampleFromSchema(prop);
        });
      }
      return obj;
    }
    
    if (schema.type === 'array') {
      if (schema.items) {
        return [this.generateExampleFromSchema(schema.items)];
      }
      return [];
    }
    
    if (schema.type === 'string') {
      if (schema.enum) {
        return schema.enum[0];
      }
      if (schema.format === 'date-time') {
        return new Date().toISOString();
      }
      if (schema.format === 'date') {
        return new Date().toISOString().split('T')[0];
      }
      if (schema.format === 'email') {
        return 'user@example.com';
      }
      if (schema.format === 'uuid') {
        return '123e4567-e89b-12d3-a456-426614174000';
      }
      return 'string';
    }
    
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.minimum !== undefined) {
        return schema.minimum;
      }
      if (schema.maximum !== undefined) {
        return schema.maximum;
      }
      return schema.type === 'integer' ? 1 : 1.0;
    }
    
    if (schema.type === 'boolean') {
      return true;
    }
    
    return null;
  }
  
  private async executeRequest(request: TestRequest): Promise<any> {
    // Build fetch options
    const options: RequestInit = {
      method: request.method,
      headers: request.headers
    };
    
    // Add body if present
    if (request.body) {
      if (request.headers['Content-Type']?.includes('application/json')) {
        options.body = JSON.stringify(request.body);
      } else {
        options.body = request.body;
      }
    }
    
    // Add query params
    const url = new URL(request.url);
    Object.entries(request.queryParams || {}).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    
    // Execute request
    const response = await fetch(url.toString(), options);
    
    // Parse response
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    let responseBody: any;
    const contentType = response.headers.get('content-type');
    
    if (contentType?.includes('application/json')) {
      responseBody = await response.json();
    } else if (contentType?.includes('text/')) {
      responseBody = await response.text();
    } else {
      responseBody = await response.blob();
    }
    
    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body: responseBody
    };
  }
  
  private calculateResponseSize(response: any): number {
    if (typeof response.body === 'string') {
      return new Blob([response.body]).size;
    }
    if (response.body instanceof Blob) {
      return response.body.size;
    }
    if (response.body) {
      return new Blob([JSON.stringify(response.body)]).size;
    }
    return 0;
  }
  
  private generateCurl(request: TestRequest): string {
    let curl = `curl -X ${request.method}`;
    
    // Add URL with query params
    const url = new URL(request.url);
    Object.entries(request.queryParams || {}).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
    curl += ` '${url.toString()}'`;
    
    // Add headers
    Object.entries(request.headers).forEach(([key, value]) => {
      curl += ` \\\n  -H '${key}: ${value}'`;
    });
    
    // Add body
    if (request.body) {
      if (request.headers['Content-Type']?.includes('application/json')) {
        curl += ` \\\n  -d '${JSON.stringify(request.body)}'`;
      } else {
        curl += ` \\\n  -d '${request.body}'`;
      }
    }
    
    return curl;
  }
  
  private addToHistory(result: TestResult): void {
    const history = this.testHistory$.value;
    history.results.unshift(result);
    
    // Limit history size
    if (history.results.length > history.maxSize) {
      history.results = history.results.slice(0, history.maxSize);
    }
    
    this.testHistory$.next(history);
    this.saveHistory();
  }
  
  clearHistory(): void {
    this.testHistory$.next({
      results: [],
      maxSize: this.testHistory$.value.maxSize
    });
    this.saveHistory();
  }
  
  async exportToPostman(
    document: any,
    baseUrl: string
  ): Promise<string> {
    const collection = {
      info: {
        name: document.info.title,
        description: document.info.description,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [] as any[]
    };
    
    // Group endpoints by tags
    const tagGroups: Record<string, any[]> = {};
    
    if (document.paths) {
      Object.entries(document.paths).forEach(([path, pathItem]: [string, any]) => {
        Object.entries(pathItem).forEach(([method, operation]: [string, any]) => {
          if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
            const tag = operation.tags?.[0] || 'Default';
            
            if (!tagGroups[tag]) {
              tagGroups[tag] = [];
            }
            
            tagGroups[tag].push({
              name: operation.summary || `${method.toUpperCase()} ${path}`,
              request: this.convertToPostmanRequest(
                method,
                path,
                operation,
                baseUrl
              )
            });
          }
        });
      });
    }
    
    // Create folder structure
    Object.entries(tagGroups).forEach(([tag, items]) => {
      collection.item.push({
        name: tag,
        item: items
      });
    });
    
    return JSON.stringify(collection, null, 2);
  }
  
  private convertToPostmanRequest(
    method: string,
    path: string,
    operation: any,
    baseUrl: string
  ): any {
    const request: any = {
      method: method.toUpperCase(),
      header: [],
      url: {
        raw: baseUrl + path,
        host: [baseUrl.replace(/https?:\/\//, '').replace(/\/$/, '')],
        path: path.split('/').filter(Boolean),
        query: [],
        variable: []
      }
    };
    
    // Add parameters
    if (operation.parameters) {
      operation.parameters.forEach((param: any) => {
        if (param.in === 'query') {
          request.url.query.push({
            key: param.name,
            value: param.example || '',
            description: param.description
          });
        } else if (param.in === 'header') {
          request.header.push({
            key: param.name,
            value: param.example || '',
            description: param.description
          });
        } else if (param.in === 'path') {
          request.url.variable.push({
            key: param.name,
            value: param.example || '',
            description: param.description
          });
        }
      });
    }
    
    // Add request body
    if (operation.requestBody?.content) {
      const contentTypes = Object.keys(operation.requestBody.content);
      if (contentTypes.length > 0) {
        const contentType = contentTypes[0];
        const content = operation.requestBody.content[contentType];
        
        request.header.push({
          key: 'Content-Type',
          value: contentType
        });
        
        if (contentType.includes('json')) {
          request.body = {
            mode: 'raw',
            raw: JSON.stringify(
              content.example || 
              content.examples?.[Object.keys(content.examples)[0]]?.value ||
              this.generateExampleFromSchema(content.schema),
              null,
              2
            ),
            options: {
              raw: {
                language: 'json'
              }
            }
          };
        }
      }
    }
    
    return request;
  }
  
  private async loadHistory(): Promise<void> {
    try {
      const data = await this.electronService.invoke('read-file', {
        path: '.api-test-history.json'
      });
      
      if (data) {
        const history = JSON.parse(data);
        // Convert date strings back to Date objects
        history.results.forEach((result: TestResult) => {
          result.request.timestamp = new Date(result.request.timestamp);
        });
        this.testHistory$.next(history);
      }
    } catch (error) {
      // History file doesn't exist yet
    }
  }
  
  private async saveHistory(): Promise<void> {
    try {
      await this.electronService.invoke('write-file', {
        path: '.api-test-history.json',
        content: JSON.stringify(this.testHistory$.value)
      });
    } catch (error) {
      console.error('Failed to save test history:', error);
    }
  }
  
  enableTesting(): void {
    this.isTestingEnabled$.next(true);
  }
  
  disableTesting(): void {
    this.isTestingEnabled$.next(false);
  }
}