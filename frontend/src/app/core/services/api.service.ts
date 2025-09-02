import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// DTOs
export interface GatewayConfig {
  id: string;
  name: string;
  version: string;
  description?: string;
  fileHash?: string;
  openapiVersion: string;
  isActive: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
  endpoints?: GatewayEndpoint[];
}

export interface GatewayEndpoint {
  id: string;
  configId?: string;
  sequenceOrder: number;
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  targetUrl?: string;
  headers?: any;
  queryParams?: any;
  pathParams?: any;
  requestBody?: any;
  responses?: any;
  security?: any;
  authentication?: any;
  rateLimiting?: any;
  cacheConfig?: any;
  corsConfig?: any;
  integrationType?: string;
  integrationConfig?: any;
  xExtensions?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateGatewayDto {
  name: string;
  version: string;
  description?: string;
  openapiVersion?: string;
  isActive?: boolean;
  metadata?: any;
}

export interface UpdateGatewayDto extends Partial<CreateGatewayDto> {}

export interface CreateEndpointDto {
  method: string;
  path: string;
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  targetUrl?: string;
  headers?: any;
  queryParams?: any;
  pathParams?: any;
  requestBody?: any;
  responses?: any;
  security?: any;
  authentication?: any;
  rateLimiting?: any;
  cacheConfig?: any;
  corsConfig?: any;
  integrationType?: string;
  integrationConfig?: any;
  xExtensions?: any;
}

export interface UpdateEndpointDto extends Partial<CreateEndpointDto> {}

export interface ReorderEndpointsDto {
  endpointIds: string[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface ImportResponse {
  success: boolean;
  configId: string;
  endpointsCount: number;
  processingTimeMs: number;
}

export interface ExportStatus {
  cached: boolean;
  formats: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // Gateway Configuration APIs
  getGatewayConfigs(page = 1, limit = 10): Observable<PaginatedResponse<GatewayConfig>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());
    
    return this.http.get<PaginatedResponse<GatewayConfig>>(
      `${this.apiUrl}/api/gateway/configs`,
      { params }
    );
  }

  getGatewayConfig(id: string): Observable<GatewayConfig> {
    return this.http.get<GatewayConfig>(`${this.apiUrl}/api/gateway/configs/${id}`);
  }

  createGatewayConfig(config: CreateGatewayDto): Observable<GatewayConfig> {
    return this.http.post<GatewayConfig>(`${this.apiUrl}/api/gateway/configs`, config);
  }

  updateGatewayConfig(id: string, config: UpdateGatewayDto): Observable<GatewayConfig> {
    return this.http.put<GatewayConfig>(`${this.apiUrl}/api/gateway/configs/${id}`, config);
  }

  deleteGatewayConfig(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/api/gateway/configs/${id}`);
  }

  activateGatewayConfig(id: string): Observable<GatewayConfig> {
    return this.http.post<GatewayConfig>(`${this.apiUrl}/api/gateway/configs/${id}/activate`, {});
  }

  deactivateGatewayConfig(id: string): Observable<GatewayConfig> {
    return this.http.post<GatewayConfig>(`${this.apiUrl}/api/gateway/configs/${id}/deactivate`, {});
  }

  // Endpoints APIs
  getEndpoints(configId: string): Observable<GatewayEndpoint[]> {
    return this.http.get<GatewayEndpoint[]>(`${this.apiUrl}/api/gateway/${configId}/endpoints`);
  }

  getEndpoint(configId: string, endpointId: string): Observable<GatewayEndpoint> {
    return this.http.get<GatewayEndpoint>(
      `${this.apiUrl}/api/gateway/${configId}/endpoints/${endpointId}`
    );
  }

  createEndpoint(configId: string, endpoint: CreateEndpointDto): Observable<GatewayEndpoint> {
    return this.http.post<GatewayEndpoint>(
      `${this.apiUrl}/api/gateway/${configId}/endpoints`,
      endpoint
    );
  }

  updateEndpoint(
    configId: string,
    endpointId: string,
    endpoint: UpdateEndpointDto
  ): Observable<GatewayEndpoint> {
    return this.http.put<GatewayEndpoint>(
      `${this.apiUrl}/api/gateway/${configId}/endpoints/${endpointId}`,
      endpoint
    );
  }

  deleteEndpoint(configId: string, endpointId: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/api/gateway/${configId}/endpoints/${endpointId}`
    );
  }

  reorderEndpoints(configId: string, endpointIds: string[]): Observable<void> {
    return this.http.put<void>(
      `${this.apiUrl}/api/gateway/${configId}/endpoints/reorder`,
      { endpointIds }
    );
  }

  // Import API
  importFile(file: File): Observable<ImportResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportResponse>(
      `${this.apiUrl}/api/gateway/import`,
      formData
    );
  }

  // Export APIs
  exportConfig(configId: string, format: 'json' | 'yaml' = 'yaml'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    
    return this.http.get(
      `${this.apiUrl}/api/gateway/export/${configId}`,
      { 
        params,
        responseType: 'blob'
      }
    );
  }

  getExportStatus(configId: string): Observable<ExportStatus> {
    return this.http.get<ExportStatus>(
      `${this.apiUrl}/api/gateway/export/${configId}/status`
    );
  }

  // Upload with progress
  importFileWithProgress(file: File): Observable<HttpEvent<ImportResponse>> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<ImportResponse>(
      `${this.apiUrl}/api/gateway/import`,
      formData,
      {
        reportProgress: true,
        observe: 'events'
      }
    );
  }

  // Health check
  healthCheck(): Observable<any> {
    return this.http.get(`${this.apiUrl}/health`);
  }

  // Generate curl command (client-side for now, can be moved to backend)
  generateCurl(config: GatewayConfig, endpoint: GatewayEndpoint): string {
    const baseUrl = config.metadata?.servers?.[0]?.url || 'https://api.example.com';
    let curl = `curl -X ${endpoint.method} "${baseUrl}${endpoint.path}"`;

    // Add headers
    if (endpoint.headers) {
      Object.entries(endpoint.headers).forEach(([key, value]: [string, any]) => {
        if (value.example || value.default) {
          curl += ` \\\n  -H "${key}: ${value.example || value.default}"`;
        }
      });
    }

    // Add query parameters
    if (endpoint.queryParams) {
      const queryString = Object.entries(endpoint.queryParams)
        .map(([key, value]: [string, any]) => {
          if (value.example || value.default) {
            return `${key}=${value.example || value.default}`;
          }
          return null;
        })
        .filter(Boolean)
        .join('&');
      
      if (queryString) {
        curl = curl.replace('"', `?${queryString}"`);
      }
    }

    // Add request body for appropriate methods
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method) && endpoint.requestBody) {
      const content = endpoint.requestBody.content;
      if (content?.['application/json']) {
        curl += ` \\\n  -H "Content-Type: application/json"`;
        if (content['application/json'].example) {
          curl += ` \\\n  -d '${JSON.stringify(content['application/json'].example)}'`;
        }
      }
    }

    return curl;
  }
}