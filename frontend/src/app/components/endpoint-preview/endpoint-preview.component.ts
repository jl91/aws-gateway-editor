import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';
import { Endpoint } from '../../pages/editor/editor.component';
import * as yaml from 'js-yaml';

export interface EndpointPreviewData {
  endpoint: Endpoint;
  document?: any; // Full OpenAPI document for context
  allEndpoints?: Endpoint[]; // For navigation
  currentIndex?: number;
}

@Component({
  selector: 'app-endpoint-preview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatButtonToggleModule,
    MatMenuModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatChipsModule,
    MonacoEditorComponent
  ],
  templateUrl: './endpoint-preview.component.html',
  styleUrls: ['./endpoint-preview.component.scss']
})
export class EndpointPreviewComponent implements OnInit {
  openApiSpec = '';
  curlExample = '';
  codeExamples: { [key: string]: string } = {};
  
  format: 'json' | 'yaml' = 'json';
  isFullscreen = false;
  
  // Language examples
  languages = [
    { id: 'curl', name: 'cURL' },
    { id: 'javascript', name: 'JavaScript (Fetch)' },
    { id: 'typescript', name: 'TypeScript (Axios)' },
    { id: 'python', name: 'Python (Requests)' },
    { id: 'java', name: 'Java (HttpClient)' },
    { id: 'csharp', name: 'C# (HttpClient)' },
    { id: 'go', name: 'Go' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'php', name: 'PHP' }
  ];
  
  selectedLanguage = 'curl';
  baseUrl = 'https://api.example.com';
  
  constructor(
    public dialogRef: MatDialogRef<EndpointPreviewComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EndpointPreviewData,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.generateOpenApiSpec();
    this.generateAllExamples();
  }
  
  private generateOpenApiSpec(): void {
    const endpoint = this.data.endpoint;
    
    // Build the OpenAPI spec for this endpoint
    const spec = {
      openapi: '3.0.0',
      info: {
        title: 'API Endpoint',
        version: '1.0.0'
      },
      paths: {
        [endpoint.path]: {
          [endpoint.method.toLowerCase()]: {
            operationId: endpoint.id,
            summary: endpoint.summary,
            description: endpoint.description,
            tags: endpoint.tags,
            deprecated: endpoint.deprecated,
            parameters: endpoint.parameters,
            requestBody: endpoint.requestBody,
            responses: endpoint.responses || {
              '200': {
                description: 'Successful response'
              }
            },
            security: endpoint.security
          }
        }
      }
    };
    
    // Add components if we have the full document
    if (this.data.document?.components) {
      (spec as any)['components'] = this.data.document.components;
    }
    
    this.updateSpecDisplay();
  }
  
  updateSpecDisplay(): void {
    const endpoint = this.data.endpoint;
    const spec = this.buildSpec();
    
    if (this.format === 'yaml') {
      this.openApiSpec = yaml.dump(spec, {
        indent: 2,
        lineWidth: 80,
        noRefs: false
      });
    } else {
      this.openApiSpec = JSON.stringify(spec, null, 2);
    }
  }
  
  private buildSpec(): any {
    const endpoint = this.data.endpoint;
    return {
      [endpoint.method.toLowerCase()]: {
        operationId: endpoint.id,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        deprecated: endpoint.deprecated,
        parameters: endpoint.parameters,
        requestBody: endpoint.requestBody,
        responses: endpoint.responses || {
          '200': {
            description: 'Successful response'
          }
        },
        security: endpoint.security
      }
    };
  }
  
  toggleFormat(): void {
    this.format = this.format === 'json' ? 'yaml' : 'json';
    this.updateSpecDisplay();
  }
  
  copyToClipboard(content?: string): void {
    const textToCopy = content || this.openApiSpec;
    navigator.clipboard.writeText(textToCopy).then(() => {
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    });
  }
  
  exportEndpoint(): void {
    const endpoint = this.data.endpoint;
    const filename = `${endpoint.id || 'endpoint'}.${this.format}`;
    const content = this.openApiSpec;
    
    const blob = new Blob([content], { 
      type: this.format === 'json' ? 'application/json' : 'text/yaml' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open(`Exported as ${filename}`, 'Close', { duration: 2000 });
  }
  
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;
    
    if (this.isFullscreen) {
      this.dialogRef.updateSize('100vw', '100vh');
    } else {
      this.dialogRef.updateSize('90%', 'auto');
    }
  }
  
  navigatePrevious(): void {
    if (!this.data.allEndpoints || this.data.currentIndex === undefined) return;
    
    const newIndex = this.data.currentIndex - 1;
    if (newIndex >= 0) {
      this.data.endpoint = this.data.allEndpoints[newIndex];
      this.data.currentIndex = newIndex;
      this.generateOpenApiSpec();
      this.generateAllExamples();
    }
  }
  
  navigateNext(): void {
    if (!this.data.allEndpoints || this.data.currentIndex === undefined) return;
    
    const newIndex = this.data.currentIndex + 1;
    if (newIndex < this.data.allEndpoints.length) {
      this.data.endpoint = this.data.allEndpoints[newIndex];
      this.data.currentIndex = newIndex;
      this.generateOpenApiSpec();
      this.generateAllExamples();
    }
  }
  
  get canNavigatePrevious(): boolean {
    return this.data.currentIndex !== undefined && this.data.currentIndex > 0;
  }
  
  get canNavigateNext(): boolean {
    return this.data.currentIndex !== undefined && 
           this.data.allEndpoints !== undefined &&
           this.data.currentIndex < this.data.allEndpoints.length - 1;
  }
  
  generateAllExamples(): void {
    const endpoint = this.data.endpoint;
    
    // Generate cURL
    this.codeExamples['curl'] = this.generateCurl(endpoint);
    
    // Generate JavaScript
    this.codeExamples['javascript'] = this.generateJavaScript(endpoint);
    
    // Generate TypeScript
    this.codeExamples['typescript'] = this.generateTypeScript(endpoint);
    
    // Generate Python
    this.codeExamples['python'] = this.generatePython(endpoint);
    
    // Generate Java
    this.codeExamples['java'] = this.generateJava(endpoint);
    
    // Generate C#
    this.codeExamples['csharp'] = this.generateCSharp(endpoint);
    
    // Generate Go
    this.codeExamples['go'] = this.generateGo(endpoint);
    
    // Generate Ruby
    this.codeExamples['ruby'] = this.generateRuby(endpoint);
    
    // Generate PHP
    this.codeExamples['php'] = this.generatePHP(endpoint);
  }
  
  private generateCurl(endpoint: Endpoint): string {
    let curl = `curl -X ${endpoint.method} '${this.baseUrl}${endpoint.path}'`;
    
    // Add headers
    curl += ` \\\n  -H 'Accept: application/json'`;
    
    if (endpoint.parameters) {
      const headers = endpoint.parameters.filter((p: any) => p.in === 'header');
      headers.forEach((h: any) => {
        curl += ` \\\n  -H '${h.name}: {${h.name}}'`;
      });
    }
    
    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      curl += ` \\\n  -H 'Content-Type: application/json'`;
      curl += ` \\\n  -d '${this.getExampleBody(endpoint)}'`;
    }
    
    return curl;
  }
  
  private generateJavaScript(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    const options: any = {
      method: endpoint.method,
      headers: {
        'Accept': 'application/json'
      }
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      options.headers['Content-Type'] = 'application/json';
      options.body = `JSON.stringify(${this.getExampleBody(endpoint)})`;
    }
    
    return `fetch('${url}', ${JSON.stringify(options, null, 2).replace('"body":', 'body:').replace(/"/g, "'")})
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`;
  }
  
  private generateTypeScript(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    const method = endpoint.method.toLowerCase();
    
    let code = `import axios from 'axios';

interface Response {
  // Define your response type here
}

`;
    
    if (['post', 'put', 'patch'].includes(method)) {
      code += `interface RequestBody {
  // Define your request body type here
}

const data: RequestBody = ${this.getExampleBody(endpoint)};

`;
    }
    
    code += `const response = await axios.${method}<Response>('${url}'`;
    
    if (['post', 'put', 'patch'].includes(method)) {
      code += `, data`;
    }
    
    code += `, {
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

console.log(response.data);`;
    
    return code;
  }
  
  private generatePython(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    const method = endpoint.method.toLowerCase();
    
    let code = `import requests

url = "${url}"
headers = {
    "Accept": "application/json"`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `,
    "Content-Type": "application/json"`;
    }
    
    code += `
}
`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `
data = ${this.getExampleBody(endpoint)}
`;
    }
    
    code += `
response = requests.${method}(url, headers=headers`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `, json=data`;
    }
    
    code += `)

print(response.json())`;
    
    return code;
  }
  
  private generateJava(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    
    let code = `import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;

HttpClient client = HttpClient.newHttpClient();
`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `String requestBody = ${JSON.stringify(this.getExampleBody(endpoint))};

`;
    }
    
    code += `HttpRequest request = HttpRequest.newBuilder()
    .uri(URI.create("${url}"))
    .header("Accept", "application/json")`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `
    .header("Content-Type", "application/json")
    .${endpoint.method}(HttpRequest.BodyPublishers.ofString(requestBody))`;
    } else {
      code += `
    .${endpoint.method}()`;
    }
    
    code += `
    .build();

HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`;
    
    return code;
  }
  
  private generateCSharp(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    const method = endpoint.method.charAt(0) + endpoint.method.slice(1).toLowerCase();
    
    let code = `using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `var data = new
{
    // Add your request body properties here
};

var json = JsonSerializer.Serialize(data);
var content = new StringContent(json, Encoding.UTF8, "application/json");

`;
    }
    
    code += `var response = await client.${method}Async("${url}"`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `, content`;
    }
    
    code += `);

var responseContent = await response.Content.ReadAsStringAsync();
Console.WriteLine(responseContent);`;
    
    return code;
  }
  
  private generateGo(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    
    let code = `package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io/ioutil"
    "net/http"
)

func main() {
`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `    data := map[string]interface{}{
        // Add your request body here
    }
    
    jsonData, _ := json.Marshal(data)
    req, _ := http.NewRequest("${endpoint.method}", "${url}", bytes.NewBuffer(jsonData))
    req.Header.Set("Content-Type", "application/json")`;
    } else {
      code += `    req, _ := http.NewRequest("${endpoint.method}", "${url}", nil)`;
    }
    
    code += `
    req.Header.Set("Accept", "application/json")
    
    client := &http.Client{}
    resp, _ := client.Do(req)
    defer resp.Body.Close()
    
    body, _ := ioutil.ReadAll(resp.Body)
    fmt.Println(string(body))
}`;
    
    return code;
  }
  
  private generateRuby(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    const method = endpoint.method.toLowerCase();
    
    let code = `require 'net/http'
require 'json'
require 'uri'

uri = URI('${url}')
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true

`;
    
    if (['post', 'put', 'patch'].includes(method)) {
      code += `request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1)}.new(uri)
request['Accept'] = 'application/json'
request['Content-Type'] = 'application/json'
request.body = ${JSON.stringify(this.getExampleBody(endpoint))}
`;
    } else {
      code += `request = Net::HTTP::${method.charAt(0).toUpperCase() + method.slice(1)}.new(uri)
request['Accept'] = 'application/json'
`;
    }
    
    code += `
response = http.request(request)
puts response.body`;
    
    return code;
  }
  
  private generatePHP(endpoint: Endpoint): string {
    const url = `${this.baseUrl}${endpoint.path}`;
    
    let code = `<?php
$curl = curl_init();

curl_setopt_array($curl, [
    CURLOPT_URL => "${url}",
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_CUSTOMREQUEST => "${endpoint.method}",
    CURLOPT_HTTPHEADER => [
        "Accept: application/json"`;
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      code += `,
        "Content-Type: application/json"
    ],
    CURLOPT_POSTFIELDS => json_encode([
        // Add your request body here
    ])`;
    } else {
      code += `
    ]`;
    }
    
    code += `
]);

$response = curl_exec($curl);
$err = curl_error($curl);
curl_close($curl);

if ($err) {
    echo "cURL Error: " . $err;
} else {
    echo $response;
}
?>`;
    
    return code;
  }
  
  private getExampleBody(endpoint: Endpoint): string {
    if (endpoint.requestBody?.content) {
      const contentTypes = Object.keys(endpoint.requestBody.content);
      if (contentTypes.length > 0) {
        const content = endpoint.requestBody.content[contentTypes[0]];
        if (content.example) {
          return JSON.stringify(content.example, null, 2);
        }
      }
    }
    return '{\n  // Add your request body here\n}';
  }
  
  onLanguageChange(language: string): void {
    this.selectedLanguage = language;
  }
  
  exportAsPostman(): void {
    const endpoint = this.data.endpoint;
    
    const postmanRequest = {
      name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
      request: {
        method: endpoint.method,
        header: [
          {
            key: 'Accept',
            value: 'application/json'
          }
        ],
        url: {
          raw: `${this.baseUrl}${endpoint.path}`,
          host: [this.baseUrl.replace(/https?:\/\//, '')],
          path: endpoint.path.split('/').filter(Boolean)
        }
      }
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      postmanRequest.request.header.push({
        key: 'Content-Type',
        value: 'application/json'
      });
      (postmanRequest.request as any)['body'] = {
        mode: 'raw',
        raw: this.getExampleBody(endpoint)
      };
    }
    
    const collection = {
      info: {
        name: `${endpoint.id} Collection`,
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [postmanRequest]
    };
    
    const blob = new Blob([JSON.stringify(collection, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${endpoint.id}.postman_collection.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Postman collection exported', 'Close', { duration: 2000 });
  }
  
  getResponses(): any[] {
    if (!this.data.endpoint.responses) return [];
    
    return Object.entries(this.data.endpoint.responses).map(([code, response]) => ({
      code,
      description: (response as any).description || 'Response',
      content: (response as any).content
    }));
  }
  
  formatResponse(response: any): string {
    if (!response.content) return '// No response body defined';
    
    const contentTypes = Object.keys(response.content);
    if (contentTypes.length === 0) return '// No response body defined';
    
    const content = response.content[contentTypes[0]];
    
    if (content.example) {
      return JSON.stringify(content.example, null, 2);
    }
    
    if (content.examples) {
      const exampleKeys = Object.keys(content.examples);
      if (exampleKeys.length > 0) {
        return JSON.stringify(content.examples[exampleKeys[0]].value, null, 2);
      }
    }
    
    if (content.schema) {
      return JSON.stringify(this.generateExampleFromSchema(content.schema), null, 2);
    }
    
    return '// No example available';
  }
  
  private generateExampleFromSchema(schema: any): any {
    if (schema.example) return schema.example;
    
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
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return new Date().toISOString();
      if (schema.format === 'date') return new Date().toISOString().split('T')[0];
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
      return 'string';
    }
    
    if (schema.type === 'number' || schema.type === 'integer') {
      if (schema.minimum !== undefined) return schema.minimum;
      if (schema.maximum !== undefined) return schema.maximum;
      return schema.type === 'integer' ? 1 : 1.0;
    }
    
    if (schema.type === 'boolean') return true;
    
    return null;
  }
  
  formatSecurity(security: any): string {
    if (!security || security.length === 0) return 'None';
    
    return security.map((s: any) => {
      const keys = Object.keys(s);
      if (keys.length === 0) return 'None';
      return keys.join(', ');
    }).join('; ');
  }
  
  exportAsInsomnia(): void {
    const endpoint = this.data.endpoint;
    
    const insomniaRequest = {
      _type: 'request',
      _id: `req_${Date.now()}`,
      name: endpoint.summary || `${endpoint.method} ${endpoint.path}`,
      method: endpoint.method,
      url: `${this.baseUrl}${endpoint.path}`,
      headers: [
        {
          name: 'Accept',
          value: 'application/json'
        }
      ]
    };
    
    if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      insomniaRequest.headers.push({
        name: 'Content-Type',
        value: 'application/json'
      });
      (insomniaRequest as any)['body'] = {
        mimeType: 'application/json',
        text: this.getExampleBody(endpoint)
      };
    }
    
    const exportData = {
      _type: 'export',
      __export_format: 4,
      __export_date: new Date().toISOString(),
      resources: [insomniaRequest]
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
      type: 'application/json' 
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${endpoint.id}.insomnia.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Insomnia collection exported', 'Close', { duration: 2000 });
  }
}