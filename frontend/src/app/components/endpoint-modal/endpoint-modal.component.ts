import { Component, Inject, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl, FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MonacoEditorComponent } from '../../shared/components/monaco-editor/monaco-editor.component';
import { RichTextEditorComponent } from '../../shared/components/rich-text-editor/rich-text-editor.component';
import { Endpoint } from '../../pages/editor/editor.component';
import { ValidationError } from '../../core/services/validation.service';
import { TestService, TestResult } from '../../core/services/test.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { Observable, startWith, map } from 'rxjs';
import { OpenApiService } from '../../core/services/openapi.service';

export interface EndpointModalData {
  endpoint?: Endpoint;
  mode: 'view' | 'edit' | 'create';
  validationError?: ValidationError;
  document?: any;
}

@Component({
  selector: 'app-endpoint-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatDialogModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatCheckboxModule,
    MatExpansionModule,
    MatRadioModule,
    MatTooltipModule,
    MatAutocompleteModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatBadgeModule,
    MatMenuModule,
    MatSlideToggleModule,
    MonacoEditorComponent,
    RichTextEditorComponent
  ],
  templateUrl: './endpoint-modal.component.html',
  styleUrls: ['./endpoint-modal.component.scss']
})
export class EndpointModalComponent implements OnInit {
  endpointForm!: FormGroup;
  mode: 'view' | 'edit' | 'create';
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  
  // Store original endpoint data for updates
  originalPath?: string;
  originalMethod?: string;
  
  methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];
  parameterTypes = ['string', 'number', 'integer', 'boolean', 'array', 'object'];
  parameterLocations = ['path', 'query', 'header', 'cookie'];
  responseCodes = ['200', '201', '204', '400', '401', '403', '404', '500', '502', '503'];
  contentTypes = ['application/json', 'application/xml', 'text/plain', 'text/html', 'multipart/form-data'];
  
  currentTags: string[] = [];
  schemaPreview = '';
  curlExample = '';
  
  // Tags autocomplete
  tagInput = new FormControl('');
  availableTags: string[] = [];
  filteredTags!: Observable<string[]>;
  
  // Security schemes
  availableSecuritySchemes: { name: string; type: string; description?: string }[] = [];
  selectedSecuritySchemes: string[] = [];
  
  // AWS Integration properties
  integrationType = '';
  httpHeaders: { name: string; value: string }[] = [];
  mockHeaders: { name: string; value: string }[] = [];
  mockResponseBody = '{\n  "message": "Success",\n  "data": {}\n}';
  errorMappings: { pattern: string; statusCode: number; response: string }[] = [];
  requestMappingTemplate = '';
  responseMappingTemplate = '';
  
  // Policies & Settings properties
  cacheKeyParams: string[] = [];
  customMetrics: string[] = [];
  
  // Advanced tab properties
  deployTags: string[] = [];
  stageVariables: { name: string; value: string; description?: string }[] = [];
  documentationParts: { location: string; name: string; content: string; type?: string; path?: string; method?: string; description?: string }[] = [];
  customRequestHeaders: { name: string; value: string; required: boolean; description?: string }[] = [];
  customResponseHeaders: { name: string; value: string; override: boolean; description?: string }[] = [];
  vendorExtensions: { name: string; value: string }[] = [];
  xExtensions: any = {};
  rawExtensions = '';
  rawExtensionsError = '';
  
  // Form state management
  formHistory: any[] = [];
  historyIndex = -1;
  maxHistorySize = 20;
  initialFormValue: any = null;
  hasUnsavedChanges = false;
  
  // Validation
  validationErrors: { [key: string]: string } = {};
  parameterErrors: { [index: number]: { [field: string]: string } } = {};
  existingOperationIds: string[] = [];
  detectedPathParams: string[] = [];
  
  // Test properties
  testBaseUrl = 'https://api.example.com';
  testAuthHeader = '';
  isTestRunning = false;
  testResult: TestResult | null = null;
  
  // Request Body properties
  availableContentTypes = [
    'application/json',
    'application/xml',
    'multipart/form-data',
    'application/x-www-form-urlencoded',
    'text/plain',
    'text/html',
    'application/pdf',
    'image/jpeg',
    'image/png'
  ];
  schemaValidationError = '';
  exampleValidationError = '';
  showSchemaPreview = false;
  schemaProperties: any[] = [];
  formFields: any[] = [];
  urlEncodedParams: any[] = [];
  requestBodyContent: { [contentType: string]: { schema?: string; example?: string } } = {};
  
  constructor(
    private fb: FormBuilder,
    private testService: TestService,
    private openApiService: OpenApiService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EndpointModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EndpointModalData
  ) {
    this.mode = data.mode;
  }

  ngOnInit(): void {
    this.initializeForm();
    if (this.data.endpoint && this.mode !== 'create') {
      this.loadEndpoint(this.data.endpoint);
    }
    this.generateCurlExample();
    this.setupFormTracking();
    this.setupValidation();
    this.loadExistingOperationIds();
    this.setupTagsAutocomplete();
    this.loadSecuritySchemes();
  }
  
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ctrl+Z or Cmd+Z for undo
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      this.undo();
    }
    
    // Ctrl+Shift+Z or Cmd+Shift+Z for redo
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') {
      event.preventDefault();
      this.redo();
    }
    
    // Ctrl+S or Cmd+S for save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (this.mode !== 'view' && this.endpointForm.valid) {
        this.save();
      }
    }
  }

  private initializeForm(): void {
    this.endpointForm = this.fb.group({
      // Basic Information
      id: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]],
      method: ['GET', Validators.required],
      path: ['', [Validators.required, Validators.pattern(/^\/.*$/)]],
      summary: ['', Validators.maxLength(120)],
      description: [''],
      deprecated: [false],
      tags: [[]],
      
      // Parameters
      parameters: this.fb.array([]),
      
      // Request Body
      requestBody: this.fb.group({
        enabled: [false],
        required: [false],
        description: [''],
        contentTypes: [['application/json']],
        content: this.fb.group({})
      }),
      
      // Responses
      responses: this.fb.array([
        this.createResponse('200', 'Success')
      ]),
      
      // Security
      security: this.fb.array([]),
      
      // AWS Integration
      integrationType: [''],
      lambdaArn: [''],
      lambdaTimeout: [29000],
      lambdaRetries: [0],
      lambdaProxy: [false],
      lambdaAsync: [false],
      httpUrl: [''],
      httpMethod: ['ANY'],
      httpProxy: [false],
      mockStatusCode: [200],
      stepFunctionArn: [''],
      stepFunctionType: ['STANDARD'],
      awsServiceName: [''],
      awsServiceAction: [''],
      
      // Policies & Settings
      throttlingEnabled: [false],
      rateLimit: [1000],
      burstLimit: [2000],
      usagePlan: [''],
      dailyQuota: [10000],
      weeklyQuota: [70000],
      monthlyQuota: [300000],
      
      cacheEnabled: [false],
      cacheTtl: [300],
      cacheUnauthorized: [false],
      cacheEncrypted: [false],
      
      corsEnabled: [false],
      corsOrigins: ['*'],
      corsMethods: [['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']],
      corsHeaders: ['Content-Type\nAuthorization\nX-Api-Key'],
      corsExposedHeaders: [''],
      corsMaxAge: [3600],
      corsCredentials: [false],
      
      apiKeyRequired: [false],
      authorizerType: [''],
      authorizerArn: [''],
      authorizerTokenSource: ['Authorization'],
      authorizerTtl: [300],
      cognitoUserPoolArn: [''],
      cognitoScopes: [''],
      
      validateRequestBody: [false],
      validateRequestParameters: [false],
      validateRequestHeaders: [false],
      validator: [''],
      allowedContentTypes: [['application/json']],
      
      logLevel: ['OFF'],
      logFullRequests: [false],
      detailedMetricsEnabled: [false],
      xrayTracingEnabled: [false],
      xraySamplingRate: [10],
      
      // Advanced tab fields
      externalDocsUrl: [''],
      externalDocsDescription: [''],
      sdkOperationName: [''],
      sdkServiceName: [''],
      sdkReturnType: [''],
      sdkExclude: [false]
    });

    if (this.mode === 'view') {
      this.endpointForm.disable();
    }
  }

  private loadEndpoint(endpoint: Endpoint): void {
    // Store original values for update tracking
    this.originalPath = endpoint.path;
    this.originalMethod = endpoint.method;
    
    // Load basic information
    this.endpointForm.patchValue({
      id: endpoint.id,
      method: endpoint.method,
      path: endpoint.path,
      summary: endpoint.summary || '',
      description: endpoint.description || '',
      deprecated: endpoint.deprecated || false
    });
    
    this.currentTags = endpoint.tags || [];
    
    // Load security
    if (endpoint.security) {
      this.selectedSecuritySchemes = [];
      endpoint.security.forEach((securityObj: any) => {
        const schemeName = Object.keys(securityObj)[0];
        if (schemeName) {
          this.selectedSecuritySchemes.push(schemeName);
        }
      });
    }
    
    // Load parameters
    if (endpoint.parameters) {
      const parametersArray = this.endpointForm.get('parameters') as FormArray;
      endpoint.parameters.forEach(param => {
        parametersArray.push(this.createParameter(param));
      });
    }
    
    // Load request body
    if (endpoint.requestBody) {
      const content = endpoint.requestBody.content;
      const contentType = content ? Object.keys(content)[0] : 'application/json';
      const schema = content?.[contentType]?.schema;
      
      this.endpointForm.get('requestBody')?.patchValue({
        required: endpoint.requestBody.required || false,
        description: endpoint.requestBody.description || '',
        contentType: contentType,
        schema: schema ? JSON.stringify(schema, null, 2) : '',
        example: content?.[contentType]?.example ? JSON.stringify(content[contentType].example, null, 2) : ''
      });
    }
    
    // Load responses
    if (endpoint.responses) {
      const responsesArray = this.endpointForm.get('responses') as FormArray;
      responsesArray.clear();
      
      Object.entries(endpoint.responses).forEach(([code, response]: [string, any]) => {
        responsesArray.push(this.createResponse(code, response.description || '', response));
      });
    }
  }

  get parameters(): FormArray {
    return this.endpointForm.get('parameters') as FormArray;
  }

  get responses(): FormArray {
    return this.endpointForm.get('responses') as FormArray;
  }

  addParameter(location: string = 'query'): void {
    const newParam = this.createParameter({ in: location });
    
    // Path parameters are always required
    if (location === 'path') {
      newParam.get('required')?.setValue(true);
      newParam.get('required')?.disable();
    }
    
    this.parameters.push(newParam);
  }

  removeParameter(index: number): void {
    this.parameters.removeAt(index);
    // Clear any validation errors for this parameter
    delete this.parameterErrors[index];
  }

  private createParameter(data?: any): FormGroup {
    // Determine appropriate defaults based on parameter location
    const location = data?.in || 'query';
    let defaultStyle = '';
    let defaultExplode = true;
    
    // Set correct defaults based on OpenAPI spec
    if (location === 'query') {
      defaultStyle = data?.style || 'form';
      defaultExplode = data?.explode !== undefined ? data.explode : true;
    } else if (location === 'path') {
      defaultStyle = data?.style || 'simple';
      defaultExplode = data?.explode !== undefined ? data.explode : false;
    } else if (location === 'header') {
      defaultStyle = data?.style || 'simple';
      defaultExplode = data?.explode !== undefined ? data.explode : false;
    } else if (location === 'cookie') {
      defaultStyle = data?.style || 'form';
      defaultExplode = data?.explode !== undefined ? data.explode : true;
    }

    return this.fb.group({
      name: [data?.name || '', Validators.required],
      in: [location, Validators.required],
      description: [data?.description || ''],
      required: [data?.required || false],
      deprecated: [data?.deprecated || false],
      allowEmptyValue: [data?.allowEmptyValue || false],
      style: [defaultStyle],
      explode: [defaultExplode],
      schema: this.fb.group({
        type: [data?.schema?.type || 'string'],
        format: [data?.schema?.format || ''],
        enum: [data?.schema?.enum || []],
        default: [data?.schema?.default !== undefined ? data.schema.default : ''],
        minimum: [data?.schema?.minimum !== undefined ? data.schema.minimum : null],
        maximum: [data?.schema?.maximum !== undefined ? data.schema.maximum : null],
        pattern: [data?.schema?.pattern || ''],
        items: [data?.schema?.items || null]
      }),
      example: [data?.example || ''],
      examples: [data?.examples || {}]
    });
  }
  
  getParametersByType(type: string): any[] {
    return this.parameters.controls.filter(param => param.get('in')?.value === type);
  }
  
  autoDetectPathParameters(): void {
    const path = this.endpointForm.get('path')?.value;
    if (!path) return;
    
    // Extract path parameters from the path
    const pathParams = (path.match(/{([^}]+)}/g) || []).map((p: string) => p.slice(1, -1));
    this.detectedPathParams = pathParams;
    
    // Get existing path parameter names
    const existingPathParams = this.parameters.controls
      .filter(p => p.get('in')?.value === 'path')
      .map(p => p.get('name')?.value);
    
    // Add new path parameters that don't exist yet
    pathParams.forEach((paramName: string) => {
      if (!existingPathParams.includes(paramName)) {
        const newParam = this.createParameter({
          name: paramName,
          in: 'path',
          required: true,
          description: `Path parameter: ${paramName}`,
          schema: { type: 'string' }
        });
        
        // Path parameters are always required
        newParam.get('required')?.setValue(true);
        newParam.get('required')?.disable();
        
        this.parameters.push(newParam);
      }
    });
    
    // Remove path parameters that are no longer in the path
    const paramsToRemove: number[] = [];
    this.parameters.controls.forEach((param, index) => {
      if (param.get('in')?.value === 'path') {
        const name = param.get('name')?.value;
        if (!pathParams.includes(name)) {
          paramsToRemove.push(index);
        }
      }
    });
    
    // Remove in reverse order to maintain indices
    paramsToRemove.reverse().forEach(index => {
      this.removeParameter(index);
    });
    
    if (pathParams.length > 0) {
      this.snackBar.open(`Detected ${pathParams.length} path parameter(s)`, 'Close', { duration: 2000 });
    }
  }
  
  validateParameterName(index: number): void {
    const param = this.parameters.at(index);
    const name = param.get('name')?.value;
    const location = param.get('in')?.value;
    
    if (!this.parameterErrors[index]) {
      this.parameterErrors[index] = {};
    }
    
    if (!name) {
      this.parameterErrors[index]['name'] = 'Parameter name is required';
      return;
    }
    
    // Check for duplicate parameter names in the same location
    const duplicates = this.parameters.controls.filter((p, i) => 
      i !== index && 
      p.get('name')?.value === name && 
      p.get('in')?.value === location
    );
    
    if (duplicates.length > 0) {
      this.parameterErrors[index]['name'] = `Duplicate ${location} parameter name`;
      return;
    }
    
    // For path parameters, check if they exist in the path
    if (location === 'path') {
      const path = this.endpointForm.get('path')?.value;
      if (path && !path.includes(`{${name}}`)) {
        this.parameterErrors[index]['name'] = `Path parameter '{${name}}' not found in path`;
        return;
      }
    }
    
    // Clear error if validation passes
    delete this.parameterErrors[index]['name'];
    if (Object.keys(this.parameterErrors[index]).length === 0) {
      delete this.parameterErrors[index];
    }
  }
  
  onParameterLocationChange(index: number): void {
    const param = this.parameters.at(index);
    const location = param.get('in')?.value;
    
    // Path parameters are always required
    if (location === 'path') {
      param.get('required')?.setValue(true);
      param.get('required')?.disable();
    } else {
      param.get('required')?.enable();
    }
    
    // Re-validate the parameter name
    this.validateParameterName(index);
  }
  
  updateParameterSchema(index: number, schemaJson: string): void {
    try {
      const schema = JSON.parse(schemaJson);
      const param = this.parameters.at(index);
      param.get('schema')?.patchValue(schema);
    } catch (error) {
      // Invalid JSON, ignore
    }
  }
  
  hasParameterError(index: number, field: string): boolean {
    return !!this.parameterErrors[index]?.[field];
  }
  
  getParameterError(index: number, field: string): string {
    return this.parameterErrors[index]?.[field] || '';
  }
  
  async importParametersFromSchema(): Promise<void> {
    // This would open a file dialog or modal to import parameters from a schema file
    // For now, we'll show a placeholder
    this.snackBar.open('Import from schema feature coming soon', 'Close', { duration: 2000 });
  }
  
  // Request Body Methods
  hasRequestBody(): boolean {
    return this.endpointForm.get('requestBody.enabled')?.value || false;
  }
  
  onRequestBodyToggle(event: any): void {
    if (!event.checked) {
      // Clear request body data when disabled
      this.endpointForm.get('requestBody')?.patchValue({
        required: false,
        description: '',
        contentTypes: [],
        content: {}
      });
      this.requestBodyContent = {};
    } else {
      // Set default content type when enabling
      this.endpointForm.get('requestBody.contentTypes')?.setValue(['application/json']);
    }
  }
  
  isContentTypeSelected(contentType: string): boolean {
    const selectedTypes = this.endpointForm.get('requestBody.contentTypes')?.value || [];
    return selectedTypes.includes(contentType);
  }
  
  addCustomContentType(contentType: string): void {
    if (!contentType) return;
    
    const currentTypes = this.endpointForm.get('requestBody.contentTypes')?.value || [];
    if (!currentTypes.includes(contentType)) {
      currentTypes.push(contentType);
      this.endpointForm.get('requestBody.contentTypes')?.setValue(currentTypes);
      
      if (!this.availableContentTypes.includes(contentType)) {
        this.availableContentTypes.push(contentType);
      }
    }
  }
  
  getContentSchema(contentType: string): string {
    return this.requestBodyContent[contentType]?.schema || '';
  }
  
  updateContentSchema(contentType: string, schema: string): void {
    if (!this.requestBodyContent[contentType]) {
      this.requestBodyContent[contentType] = {};
    }
    this.requestBodyContent[contentType].schema = schema;
    this.validateSchema();
  }
  
  getContentExample(contentType: string): string {
    return this.requestBodyContent[contentType]?.example || '';
  }
  
  updateContentExample(contentType: string, example: string): void {
    if (!this.requestBodyContent[contentType]) {
      this.requestBodyContent[contentType] = {};
    }
    this.requestBodyContent[contentType].example = example;
    this.validateExample();
  }
  
  validateSchema(): void {
    const schema = this.getContentSchema('application/json');
    if (!schema) {
      this.schemaValidationError = '';
      return;
    }
    
    try {
      JSON.parse(schema);
      this.schemaValidationError = '';
      this.updateSchemaPreview(schema);
    } catch (error: any) {
      this.schemaValidationError = `Invalid JSON: ${error.message}`;
    }
  }
  
  formatSchema(): void {
    const schema = this.getContentSchema('application/json');
    if (!schema) return;
    
    try {
      const parsed = JSON.parse(schema);
      const formatted = JSON.stringify(parsed, null, 2);
      this.updateContentSchema('application/json', formatted);
    } catch (error) {
      this.snackBar.open('Invalid JSON schema', 'Close', { duration: 2000 });
    }
  }
  
  generateSchemaFromExample(): void {
    const example = this.getContentExample('application/json');
    if (!example) {
      this.snackBar.open('Please provide an example first', 'Close', { duration: 2000 });
      return;
    }
    
    try {
      const exampleObj = JSON.parse(example);
      const schema = this.generateJsonSchema(exampleObj);
      this.updateContentSchema('application/json', JSON.stringify(schema, null, 2));
      this.snackBar.open('Schema generated from example', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Invalid JSON example', 'Close', { duration: 2000 });
    }
  }
  
  private generateJsonSchema(obj: any): any {
    const schema: any = {
      type: this.getJsonType(obj)
    };
    
    if (schema.type === 'object' && obj !== null) {
      schema.properties = {};
      schema.required = [];
      
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          schema.properties[key] = this.generateJsonSchema(obj[key]);
          schema.required.push(key);
        }
      }
    } else if (schema.type === 'array' && Array.isArray(obj) && obj.length > 0) {
      schema.items = this.generateJsonSchema(obj[0]);
    }
    
    return schema;
  }
  
  private getJsonType(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') {
      return Number.isInteger(value) ? 'integer' : 'number';
    }
    if (typeof value === 'boolean') return 'boolean';
    return 'string';
  }
  
  uploadSchema(): void {
    // This would open a file dialog
    // For now, we'll show a placeholder
    this.snackBar.open('Upload schema feature coming soon', 'Close', { duration: 2000 });
  }
  
  validateExample(): void {
    const example = this.getContentExample('application/json');
    const schema = this.getContentSchema('application/json');
    
    if (!example) {
      this.exampleValidationError = '';
      return;
    }
    
    try {
      const exampleObj = JSON.parse(example);
      
      if (schema) {
        // Here we would validate against the schema
        // For now, just check if it's valid JSON
        this.exampleValidationError = '';
      }
    } catch (error: any) {
      this.exampleValidationError = `Invalid JSON: ${error.message}`;
    }
  }
  
  formatExample(): void {
    const example = this.getContentExample('application/json');
    if (!example) return;
    
    try {
      const parsed = JSON.parse(example);
      const formatted = JSON.stringify(parsed, null, 2);
      this.updateContentExample('application/json', formatted);
    } catch (error) {
      this.snackBar.open('Invalid JSON example', 'Close', { duration: 2000 });
    }
  }
  
  generateExampleFromSchema(): void {
    const schema = this.getContentSchema('application/json');
    if (!schema) {
      this.snackBar.open('Please provide a schema first', 'Close', { duration: 2000 });
      return;
    }
    
    try {
      const schemaObj = JSON.parse(schema);
      const example = this.generateExampleFromSchemaObj(schemaObj);
      this.updateContentExample('application/json', JSON.stringify(example, null, 2));
      this.snackBar.open('Example generated from schema', 'Close', { duration: 2000 });
    } catch (error) {
      this.snackBar.open('Invalid JSON schema', 'Close', { duration: 2000 });
    }
  }
  
  private generateExampleFromSchemaObj(schema: any): any {
    if (!schema || !schema.type) {
      return null;
    }
    
    switch (schema.type) {
      case 'object':
        const obj: any = {};
        if (schema.properties) {
          for (const key in schema.properties) {
            obj[key] = this.generateExampleFromSchemaObj(schema.properties[key]);
          }
        }
        return obj;
        
      case 'array':
        if (schema.items) {
          return [this.generateExampleFromSchemaObj(schema.items)];
        }
        return [];
        
      case 'string':
        if (schema.enum) return schema.enum[0];
        if (schema.format === 'date-time') return new Date().toISOString();
        if (schema.format === 'date') return new Date().toISOString().split('T')[0];
        if (schema.format === 'email') return 'user@example.com';
        if (schema.format === 'uuid') return '123e4567-e89b-12d3-a456-426614174000';
        return schema.example || 'string';
        
      case 'number':
      case 'integer':
        if (schema.enum) return schema.enum[0];
        if (schema.minimum !== undefined) return schema.minimum;
        if (schema.maximum !== undefined) return schema.maximum;
        return schema.type === 'integer' ? 1 : 1.0;
        
      case 'boolean':
        return true;
        
      case 'null':
        return null;
        
      default:
        return null;
    }
  }
  
  toggleSchemaPreview(): void {
    this.showSchemaPreview = !this.showSchemaPreview;
    if (this.showSchemaPreview) {
      const schema = this.getContentSchema('application/json');
      this.updateSchemaPreview(schema);
    }
  }
  
  private updateSchemaPreview(schemaStr: string): void {
    if (!schemaStr) {
      this.schemaProperties = [];
      return;
    }
    
    try {
      const schema = JSON.parse(schemaStr);
      this.schemaProperties = this.extractSchemaProperties(schema);
    } catch (error) {
      this.schemaProperties = [];
    }
  }
  
  private extractSchemaProperties(schema: any, prefix = ''): any[] {
    const properties: any[] = [];
    
    if (schema.type === 'object' && schema.properties) {
      for (const key in schema.properties) {
        const prop = schema.properties[key];
        const fullName = prefix ? `${prefix}.${key}` : key;
        
        properties.push({
          name: fullName,
          type: prop.type || 'any',
          required: schema.required?.includes(key) || false,
          description: prop.description || ''
        });
        
        if (prop.type === 'object') {
          properties.push(...this.extractSchemaProperties(prop, fullName));
        }
      }
    }
    
    return properties;
  }
  
  applySchemaTemplate(template: string): void {
    const templates: { [key: string]: any } = {
      user: {
        type: 'object',
        required: ['id', 'email', 'name'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          email: { type: 'string', format: 'email' },
          name: { type: 'string' },
          age: { type: 'integer', minimum: 0, maximum: 150 },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              country: { type: 'string' },
              zipCode: { type: 'string' }
            }
          }
        }
      },
      product: {
        type: 'object',
        required: ['id', 'name', 'price'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          price: { type: 'number', minimum: 0 },
          category: { type: 'string' },
          inStock: { type: 'boolean' },
          tags: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      order: {
        type: 'object',
        required: ['orderId', 'items', 'total'],
        properties: {
          orderId: { type: 'string' },
          customerId: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 },
                price: { type: 'number' }
              }
            }
          },
          total: { type: 'number' },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
          }
        }
      },
      pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1 },
          pageSize: { type: 'integer', minimum: 1, maximum: 100 },
          totalItems: { type: 'integer' },
          totalPages: { type: 'integer' },
          items: {
            type: 'array',
            items: { type: 'object' }
          }
        }
      },
      error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string' },
          message: { type: 'string' },
          details: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          path: { type: 'string' }
        }
      }
    };
    
    if (templates[template]) {
      this.updateContentSchema('application/json', JSON.stringify(templates[template], null, 2));
      this.snackBar.open(`Applied ${template} template`, 'Close', { duration: 2000 });
    }
  }
  
  // Form Data Methods
  addFormField(): void {
    this.formFields.push({
      name: '',
      type: 'string',
      required: false,
      description: '',
      accept: '',
      maxSize: null
    });
  }
  
  removeFormField(index: number): void {
    this.formFields.splice(index, 1);
  }
  
  // URL Encoded Methods  
  addUrlEncodedParam(): void {
    this.urlEncodedParams.push({
      name: '',
      value: '',
      required: false
    });
  }
  
  removeUrlEncodedParam(index: number): void {
    this.urlEncodedParams.splice(index, 1);
  }

  addResponse(): void {
    this.responses.push(this.createResponse());
  }

  removeResponse(index: number): void {
    if (this.responses.length > 1) {
      this.responses.removeAt(index);
    }
  }

  private createResponse(code = '200', description = '', data?: any): FormGroup {
    return this.fb.group({
      code: [code, Validators.required],
      description: [description, Validators.required],
      contentType: [data?.content ? Object.keys(data.content)[0] : 'application/json'],
      schema: [data?.content?.[Object.keys(data.content)[0]]?.schema ? 
               JSON.stringify(data.content[Object.keys(data.content)[0]].schema, null, 2) : ''],
      example: [data?.content?.[Object.keys(data.content)[0]]?.example ? 
                JSON.stringify(data.content[Object.keys(data.content)[0]].example, null, 2) : '']
    });
  }

  // Enhanced Response Methods
  responseFilter = '';
  responseContent: { [key: string]: { schema?: string; example?: string } } = {};
  availableOperationIds: string[] = [];
  
  addResponseWithTemplate(code: string, description: string, template: string): void {
    const response = this.createEnhancedResponse(code, description);
    
    // Apply template based on type
    if (template === 'success') {
      response.patchValue({
        contentTypes: ['application/json'],
        content: {
          'application/json': {
            schema: JSON.stringify({
              type: 'object',
              properties: {
                data: { type: 'object' },
                message: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }, null, 2)
          }
        }
      });
    } else if (template === 'error') {
      response.patchValue({
        contentTypes: ['application/json'],
        content: {
          'application/json': {
            schema: JSON.stringify({
              type: 'object',
              properties: {
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string' },
                    message: { type: 'string' },
                    details: { type: 'array', items: { type: 'string' } }
                  }
                },
                timestamp: { type: 'string', format: 'date-time' }
              }
            }, null, 2)
          }
        }
      });
    } else if (template === 'validation') {
      response.patchValue({
        contentTypes: ['application/json'],
        content: {
          'application/json': {
            schema: JSON.stringify({
              type: 'object',
              properties: {
                errors: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: { type: 'string' },
                      message: { type: 'string' },
                      code: { type: 'string' }
                    }
                  }
                }
              }
            }, null, 2)
          }
        }
      });
    }
    
    this.responses.push(response);
    this.sortResponses();
  }
  
  private createEnhancedResponse(code = '200', description = ''): FormGroup {
    return this.fb.group({
      code: [code, [Validators.required, this.statusCodeValidator]],
      description: [description, Validators.required],
      contentTypes: [['application/json']],
      headers: this.fb.array([]),
      links: this.fb.array([]),
      content: this.fb.group({})
    });
  }
  
  statusCodeValidator(control: any): { [key: string]: any } | null {
    const code = control.value;
    if (!code) return null;
    
    const numCode = parseInt(code, 10);
    if (isNaN(numCode) || numCode < 100 || numCode > 599) {
      return { invalidStatusCode: true };
    }
    return null;
  }
  
  isValidStatusCode(code: string): boolean {
    const numCode = parseInt(code, 10);
    return !isNaN(numCode) && numCode >= 100 && numCode <= 599;
  }
  
  addCustomResponse(): void {
    // This would open a dialog for custom response code input
    const customCode = prompt('Enter custom response code (100-599):');
    if (customCode && this.isValidStatusCode(customCode)) {
      this.addResponseWithTemplate(customCode, '', 'custom');
    }
  }
  
  addBulkResponses(): void {
    // Add common set of responses
    const commonResponses = [
      { code: '200', description: 'Success', template: 'success' },
      { code: '400', description: 'Bad Request', template: 'error' },
      { code: '401', description: 'Unauthorized', template: 'unauthorized' },
      { code: '404', description: 'Not Found', template: 'notfound' },
      { code: '500', description: 'Internal Server Error', template: 'server-error' }
    ];
    
    commonResponses.forEach(r => {
      if (!this.responses.controls.find(resp => resp.get('code')?.value === r.code)) {
        this.addResponseWithTemplate(r.code, r.description, r.template);
      }
    });
  }
  
  sortResponses(): void {
    const sorted = this.responses.controls.sort((a, b) => {
      const codeA = parseInt(a.get('code')?.value, 10);
      const codeB = parseInt(b.get('code')?.value, 10);
      return codeA - codeB;
    });
    
    // Clear and rebuild array
    while (this.responses.length !== 0) {
      this.responses.removeAt(0);
    }
    sorted.forEach(control => this.responses.push(control));
  }
  
  getResponsesByCategory(category: string): any[] {
    return this.responses.controls.filter(response => {
      const code = response.get('code')?.value;
      if (category === '2xx') return code.startsWith('2');
      if (category === '3xx') return code.startsWith('3');
      if (category === '4xx') return code.startsWith('4');
      if (category === '5xx') return code.startsWith('5');
      if (category === 'other') {
        return !code.startsWith('2') && !code.startsWith('3') && 
               !code.startsWith('4') && !code.startsWith('5');
      }
      return false;
    });
  }
  
  getFilteredResponses(category: string): any[] {
    const categoryResponses = this.getResponsesByCategory(category);
    if (!this.responseFilter) return categoryResponses;
    
    const filter = this.responseFilter.toLowerCase();
    return categoryResponses.filter(response => {
      const code = response.get('code')?.value?.toLowerCase();
      const description = response.get('description')?.value?.toLowerCase();
      return code?.includes(filter) || description?.includes(filter);
    });
  }
  
  getResponseIndex(response: any): number {
    return this.responses.controls.indexOf(response);
  }
  
  // Response Headers Methods
  addResponseHeader(responseIndex: number): void {
    const response = this.responses.at(responseIndex) as FormGroup;
    const headers = response.get('headers') as FormArray;
    if (!headers) {
      response.addControl('headers', this.fb.array([]));
    }
    
    const newHeader = this.fb.group({
      name: ['', Validators.required],
      schema: ['string'],
      description: [''],
      required: [false]
    });
    
    (response.get('headers') as FormArray).push(newHeader);
  }
  
  removeResponseHeader(responseIndex: number, headerIndex: number): void {
    const headers = this.responses.at(responseIndex).get('headers') as FormArray;
    headers.removeAt(headerIndex);
  }
  
  getResponseHeaders(responseIndex: number): FormArray {
    const response = this.responses.at(responseIndex) as FormGroup;
    if (!response.get('headers')) {
      response.addControl('headers', this.fb.array([]));
    }
    return response.get('headers') as FormArray;
  }
  
  // Response Links Methods (HATEOAS)
  addResponseLink(responseIndex: number): void {
    const response = this.responses.at(responseIndex) as FormGroup;
    const links = response.get('links') as FormArray;
    if (!links) {
      response.addControl('links', this.fb.array([]));
    }
    
    const newLink = this.fb.group({
      rel: ['', Validators.required],
      operationId: [''],
      description: ['']
    });
    
    (response.get('links') as FormArray).push(newLink);
  }
  
  removeResponseLink(responseIndex: number, linkIndex: number): void {
    const links = this.responses.at(responseIndex).get('links') as FormArray;
    links.removeAt(linkIndex);
  }
  
  getResponseLinks(responseIndex: number): FormArray {
    const response = this.responses.at(responseIndex) as FormGroup;
    if (!response.get('links')) {
      response.addControl('links', this.fb.array([]));
    }
    return response.get('links') as FormArray;
  }
  
  // Response Content Methods
  getResponseSchema(responseIndex: number, contentType: string): string {
    const key = `${responseIndex}_${contentType}`;
    if (!this.responseContent[key]) {
      this.responseContent[key] = {};
    }
    return this.responseContent[key]?.schema || '';
  }
  
  updateResponseSchema(responseIndex: number, contentType: string, value: string): void {
    const key = `${responseIndex}_${contentType}`;
    if (!this.responseContent[key]) {
      this.responseContent[key] = {};
    }
    this.responseContent[key].schema = value;
  }
  
  getResponseExample(responseIndex: number, contentType: string): string {
    const key = `${responseIndex}_${contentType}`;
    if (!this.responseContent[key]) {
      this.responseContent[key] = {};
    }
    return this.responseContent[key]?.example || '';
  }
  
  updateResponseExample(responseIndex: number, contentType: string, value: string): void {
    const key = `${responseIndex}_${contentType}`;
    if (!this.responseContent[key]) {
      this.responseContent[key] = {};
    }
    this.responseContent[key].example = value;
  }
  
  // Schema and Example Operations
  validateResponseSchema(responseIndex: number, contentType: string): void {
    const schema = this.getResponseSchema(responseIndex, contentType);
    try {
      JSON.parse(schema);
      this.snackBar.open('Schema is valid', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Invalid JSON schema', 'Close', { duration: 3000 });
    }
  }
  
  formatResponseSchema(responseIndex: number, contentType: string): void {
    const schema = this.getResponseSchema(responseIndex, contentType);
    try {
      const parsed = JSON.parse(schema);
      this.updateResponseSchema(responseIndex, contentType, JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Schema is not valid JSON, skip formatting
    }
  }
  
  generateResponseExample(responseIndex: number, contentType: string): void {
    const schema = this.getResponseSchema(responseIndex, contentType);
    try {
      const schemaObj = JSON.parse(schema);
      const example = this.generateExampleFromSchemaObj(schemaObj);
      this.updateResponseExample(responseIndex, contentType, JSON.stringify(example, null, 2));
      this.snackBar.open('Example generated from schema', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Failed to generate example', 'Close', { duration: 3000 });
    }
  }
  
  validateResponseExample(responseIndex: number, contentType: string): void {
    const example = this.getResponseExample(responseIndex, contentType);
    try {
      JSON.parse(example);
      // Additional validation against schema could be done here
      this.snackBar.open('Example is valid', 'Close', { duration: 2000 });
    } catch (e) {
      this.snackBar.open('Invalid JSON example', 'Close', { duration: 3000 });
    }
  }
  
  formatResponseExample(responseIndex: number, contentType: string): void {
    const example = this.getResponseExample(responseIndex, contentType);
    try {
      const parsed = JSON.parse(example);
      this.updateResponseExample(responseIndex, contentType, JSON.stringify(parsed, null, 2));
    } catch (e) {
      // Example is not valid JSON, skip formatting
    }
  }
  
  applyResponseTemplate(responseIndex: number, contentType: string, template: string): void {
    let schema: any = {};
    
    switch (template) {
      case 'single':
        schema = {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            created: { type: 'string', format: 'date-time' },
            updated: { type: 'string', format: 'date-time' }
          }
        };
        break;
      case 'list':
        schema = {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' }
            }
          }
        };
        break;
      case 'paginated':
        schema = {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: { type: 'object' }
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'integer' },
                limit: { type: 'integer' },
                total: { type: 'integer' },
                pages: { type: 'integer' }
              }
            }
          }
        };
        break;
      case 'error':
        schema = {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'object' }
              }
            }
          }
        };
        break;
      case 'empty':
        schema = {
          type: 'object',
          properties: {}
        };
        break;
    }
    
    this.updateResponseSchema(responseIndex, contentType, JSON.stringify(schema, null, 2));
    this.generateResponseExample(responseIndex, contentType);
  }
  
  getResponseRecommendations(): string[] {
    const recommendations: string[] = [];
    const codes = this.responses.controls.map(r => r.get('code')?.value);
    
    if (!codes.includes('200') && !codes.includes('201') && !codes.includes('204')) {
      recommendations.push('Consider adding a success response (2xx)');
    }
    if (!codes.includes('400')) {
      recommendations.push('Consider adding a 400 Bad Request response');
    }
    if (!codes.includes('401') && !codes.includes('403')) {
      recommendations.push('Consider adding authentication/authorization responses');
    }
    if (!codes.includes('404')) {
      recommendations.push('Consider adding a 404 Not Found response');
    }
    if (!codes.includes('500')) {
      recommendations.push('Consider adding a 500 Internal Server Error response');
    }
    
    return recommendations;
  }

  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.currentTags.includes(value)) {
      this.currentTags.push(value);
      this.endpointForm.patchValue({ tags: this.currentTags });
    }
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.currentTags.indexOf(tag);
    if (index >= 0) {
      this.currentTags.splice(index, 1);
      this.endpointForm.patchValue({ tags: this.currentTags });
    }
  }
  
  private setupTagsAutocomplete(): void {
    // Load available tags from all endpoints in the document
    this.openApiService.currentDocument.subscribe(document => {
      if (document) {
        const endpoints = this.openApiService.getEndpoints(document);
        const tagsSet = new Set<string>();
        
        // Extract all unique tags from existing endpoints
        endpoints.forEach(endpoint => {
          if (endpoint.tags) {
            endpoint.tags.forEach((tag: string) => tagsSet.add(tag));
          }
        });
        
        // Also add tags from the OpenAPI document's tags section if exists
        if (document.tags) {
          document.tags.forEach((tag: any) => {
            tagsSet.add(tag.name);
          });
        }
        
        this.availableTags = Array.from(tagsSet).sort();
      }
    });
    
    // Setup filtered tags observable for autocomplete
    this.filteredTags = this.tagInput.valueChanges.pipe(
      startWith(''),
      map(value => this._filterTags(value || ''))
    );
  }
  
  private _filterTags(value: string): string[] {
    const filterValue = value.toLowerCase();
    return this.availableTags
      .filter(tag => tag.toLowerCase().includes(filterValue))
      .filter(tag => !this.currentTags.includes(tag)); // Don't show already added tags
  }
  
  addTagFromAutocomplete(tag: string): void {
    if (tag && !this.currentTags.includes(tag)) {
      this.currentTags.push(tag);
      this.endpointForm.patchValue({ tags: this.currentTags });
    }
    this.tagInput.setValue('');
  }
  
  private loadSecuritySchemes(): void {
    this.openApiService.currentDocument.subscribe(document => {
      if (document && document.components && document.components.securitySchemes) {
        this.availableSecuritySchemes = [];
        
        for (const [name, scheme] of Object.entries(document.components.securitySchemes)) {
          const schemeObj = scheme as any;
          this.availableSecuritySchemes.push({
            name,
            type: schemeObj.type,
            description: schemeObj.description
          });
        }
      } else {
        // Default security schemes if none defined
        this.availableSecuritySchemes = [
          { name: 'ApiKeyAuth', type: 'apiKey', description: 'API Key authentication' },
          { name: 'OAuth2', type: 'oauth2', description: 'OAuth 2.0 authentication' },
          { name: 'BearerAuth', type: 'http', description: 'Bearer token authentication' }
        ];
      }
    });
  }
  
  toggleSecurityScheme(schemeName: string): void {
    const index = this.selectedSecuritySchemes.indexOf(schemeName);
    if (index > -1) {
      this.selectedSecuritySchemes.splice(index, 1);
    } else {
      this.selectedSecuritySchemes.push(schemeName);
    }
    
    // Update form with security array format
    const security = this.selectedSecuritySchemes.map(name => ({ [name]: [] }));
    this.endpointForm.patchValue({ security });
  }
  
  isSecuritySchemeSelected(schemeName: string): boolean {
    return this.selectedSecuritySchemes.includes(schemeName);
  }
  
  getSecuritySchemeIcon(type: string): string {
    switch (type) {
      case 'apiKey': return 'vpn_key';
      case 'http': return 'lock';
      case 'oauth2': return 'security';
      case 'openIdConnect': return 'verified_user';
      default: return 'shield';
    }
  }
  
  // AWS Integration Methods
  onIntegrationTypeChange(event: any): void {
    this.integrationType = event.value;
    // Reset integration-specific fields when type changes
    this.resetIntegrationFields();
  }
  
  private resetIntegrationFields(): void {
    // Reset all integration fields to default values
    this.endpointForm.patchValue({
      lambdaArn: '',
      lambdaTimeout: 29000,
      lambdaRetries: 0,
      lambdaProxy: false,
      lambdaAsync: false,
      httpUrl: '',
      httpMethod: 'ANY',
      httpProxy: false,
      mockStatusCode: 200,
      stepFunctionArn: '',
      stepFunctionType: 'STANDARD',
      awsServiceName: '',
      awsServiceAction: ''
    });
    
    // Reset arrays
    this.httpHeaders = [];
    this.mockHeaders = [];
    this.errorMappings = [];
  }
  
  // HTTP Headers Management
  addHttpHeader(): void {
    this.httpHeaders.push({ name: '', value: '' });
  }
  
  removeHttpHeader(index: number): void {
    this.httpHeaders.splice(index, 1);
  }
  
  // Mock Headers Management
  addMockHeader(): void {
    this.mockHeaders.push({ name: '', value: '' });
  }
  
  removeMockHeader(index: number): void {
    this.mockHeaders.splice(index, 1);
  }
  
  // Mock Response Body
  updateMockResponseBody(value: string): void {
    this.mockResponseBody = value;
  }
  
  // Error Mappings Management
  addErrorMapping(): void {
    this.errorMappings.push({
      pattern: '.*Error.*',
      statusCode: 500,
      response: '{"error": "Internal Server Error"}'
    });
  }
  
  removeErrorMapping(index: number): void {
    this.errorMappings.splice(index, 1);
  }
  
  // Mapping Templates
  updateRequestMappingTemplate(value: string): void {
    this.requestMappingTemplate = value;
  }
  
  updateResponseMappingTemplate(value: string): void {
    this.responseMappingTemplate = value;
  }
  
  loadRequestTemplate(): void {
    // Load common VTL templates based on integration type
    const templates: { [key: string]: string } = {
      lambda: `{
  "body": $input.json('$'),
  "headers": {
    #foreach($header in $input.params().header.keySet())
    "$header": "$util.escapeJavaScript($input.params().header.get($header))"
    #if($foreach.hasNext),#end
    #end
  },
  "method": "$context.httpMethod",
  "params": {
    #foreach($param in $input.params().path.keySet())
    "$param": "$util.escapeJavaScript($input.params().path.get($param))"
    #if($foreach.hasNext),#end
    #end
  },
  "query": {
    #foreach($queryParam in $input.params().querystring.keySet())
    "$queryParam": "$util.escapeJavaScript($input.params().querystring.get($queryParam))"
    #if($foreach.hasNext),#end
    #end
  }
}`,
      http: `{
  "method": "$context.httpMethod",
  "body": $input.json('$'),
  "headers": {
    #foreach($header in $input.params().header.keySet())
    "$header": "$util.escapeJavaScript($input.params().header.get($header))"
    #if($foreach.hasNext),#end
    #end
  }
}`,
      stepfunction: `{
  "input": "$util.escapeJavaScript($input.json('$'))",
  "stateMachineArn": "$stageVariables.stateMachineArn"
}`
    };
    
    this.requestMappingTemplate = templates[this.integrationType] || '';
  }
  
  loadResponseTemplate(): void {
    // Load common response templates
    const templates: { [key: string]: string } = {
      lambda: `#set($inputRoot = $input.path('$'))
$inputRoot`,
      http: `#set($inputRoot = $input.path('$'))
{
  "statusCode": $inputRoot.statusCode,
  "body": $inputRoot.body
}`,
      stepfunction: `#set($inputRoot = $input.path('$'))
{
  "executionArn": "$inputRoot.executionArn",
  "status": "$inputRoot.status"
}`
    };
    
    this.responseMappingTemplate = templates[this.integrationType] || '';
  }
  
  // Cache Key Params Management
  addCacheKeyParam(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.cacheKeyParams.includes(value)) {
      this.cacheKeyParams.push(value);
    }
    event.chipInput!.clear();
  }
  
  removeCacheKeyParam(param: string): void {
    const index = this.cacheKeyParams.indexOf(param);
    if (index >= 0) {
      this.cacheKeyParams.splice(index, 1);
    }
  }
  
  // Custom Metrics Management
  addCustomMetric(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.customMetrics.includes(value)) {
      this.customMetrics.push(value);
    }
    event.chipInput!.clear();
  }
  
  removeCustomMetric(metric: string): void {
    const index = this.customMetrics.indexOf(metric);
    if (index >= 0) {
      this.customMetrics.splice(index, 1);
    }
  }
  
  // Advanced Tab Methods
  
  // Deploy Tags Management
  addDeployTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (value && !this.deployTags.includes(value)) {
      this.deployTags.push(value);
    }
    event.chipInput!.clear();
  }
  
  removeDeployTag(tag: string): void {
    const index = this.deployTags.indexOf(tag);
    if (index >= 0) {
      this.deployTags.splice(index, 1);
    }
  }
  
  // Stage Variables Management
  addStageVariable(): void {
    this.stageVariables.push({
      name: '',
      value: '',
      description: ''
    });
  }
  
  removeStageVariable(index: number): void {
    this.stageVariables.splice(index, 1);
  }
  
  // Documentation Parts Management
  addDocumentationPart(): void {
    this.documentationParts.push({
      location: 'METHOD',
      name: '',
      content: '',
      type: 'METHOD',
      path: this.endpointForm.get('path')?.value || '',
      method: this.endpointForm.get('method')?.value || 'GET',
      description: ''
    });
  }
  
  removeDocumentationPart(index: number): void {
    this.documentationParts.splice(index, 1);
  }
  
  // Custom Request Headers Management
  addCustomRequestHeader(): void {
    this.customRequestHeaders.push({
      name: '',
      value: '',
      required: false
    });
  }
  
  removeCustomRequestHeader(index: number): void {
    this.customRequestHeaders.splice(index, 1);
  }
  
  // Custom Response Headers Management
  addCustomResponseHeader(): void {
    this.customResponseHeaders.push({
      name: '',
      value: '',
      override: false
    });
  }
  
  removeCustomResponseHeader(index: number): void {
    this.customResponseHeaders.splice(index, 1);
  }
  
  // Vendor Extensions Management
  addVendorExtension(): void {
    this.vendorExtensions.push({
      name: 'x-',
      value: ''
    });
  }
  
  removeVendorExtension(index: number): void {
    this.vendorExtensions.splice(index, 1);
  }
  
  // Raw Extensions Validation
  validateRawExtensions(): void {
    if (!this.rawExtensions) {
      this.rawExtensionsError = '';
      return;
    }
    
    try {
      const parsed = JSON.parse(this.rawExtensions);
      
      // Check if all keys start with x-
      const invalidKeys = Object.keys(parsed).filter(key => !key.startsWith('x-'));
      if (invalidKeys.length > 0) {
        this.rawExtensionsError = `Invalid extension keys: ${invalidKeys.join(', ')}. Extensions must start with 'x-'`;
        return;
      }
      
      this.rawExtensionsError = '';
    } catch (error) {
      this.rawExtensionsError = 'Invalid JSON format';
    }
  }
  
  private buildAuthorizerObject(formValue: any): any {
    const authorizer: any = {
      type: formValue.authorizerType
    };
    
    switch (formValue.authorizerType) {
      case 'lambda':
        authorizer.authorizerUri = formValue.authorizerArn;
        authorizer.authorizerCredentials = '${AuthorizerRole}';
        authorizer.identitySource = `method.request.header.${formValue.authorizerTokenSource}`;
        authorizer.authorizerResultTtlInSeconds = formValue.authorizerTtl;
        break;
        
      case 'cognito':
        authorizer.providerARNs = [formValue.cognitoUserPoolArn];
        if (formValue.cognitoScopes) {
          authorizer.scopes = formValue.cognitoScopes.split(' ').filter((s: string) => s);
        }
        break;
        
      case 'iam':
        authorizer.type = 'AWS_IAM';
        break;
    }
    
    return authorizer;
  }
  
  private buildIntegrationObject(formValue: any): any {
    const integration: any = {
      type: formValue.integrationType.toUpperCase()
    };
    
    switch (formValue.integrationType) {
      case 'lambda':
        integration.type = formValue.lambdaProxy ? 'AWS_PROXY' : 'AWS';
        integration.uri = formValue.lambdaArn || `arn:aws:apigateway:\${AWS::Region}:lambda:path/2015-03-31/functions/${formValue.lambdaArn}/invocations`;
        integration.httpMethod = 'POST';
        integration.timeoutInMillis = formValue.lambdaTimeout;
        if (formValue.lambdaAsync) {
          integration.requestParameters = {
            'integration.request.header.X-Amz-Invocation-Type': "'Event'"
          };
        }
        break;
        
      case 'http':
        integration.type = formValue.httpProxy ? 'HTTP_PROXY' : 'HTTP';
        integration.uri = formValue.httpUrl;
        integration.httpMethod = formValue.httpMethod;
        if (this.httpHeaders.length > 0) {
          integration.requestParameters = {};
          this.httpHeaders.forEach(header => {
            if (header.name && header.value) {
              integration.requestParameters[`integration.request.header.${header.name}`] = `'${header.value}'`;
            }
          });
        }
        break;
        
      case 'mock':
        integration.type = 'MOCK';
        integration.requestTemplates = {
          'application/json': `{"statusCode": ${formValue.mockStatusCode}}`
        };
        integration.responses = {
          default: {
            statusCode: formValue.mockStatusCode.toString(),
            responseTemplates: {
              'application/json': this.mockResponseBody
            }
          }
        };
        if (this.mockHeaders.length > 0) {
          integration.responses.default.responseParameters = {};
          this.mockHeaders.forEach(header => {
            if (header.name && header.value) {
              integration.responses.default.responseParameters[`method.response.header.${header.name}`] = `'${header.value}'`;
            }
          });
        }
        break;
        
      case 'stepfunction':
        integration.type = 'AWS';
        integration.uri = `arn:aws:apigateway:\${AWS::Region}:states:action/${formValue.stepFunctionType === 'EXPRESS' ? 'StartSyncExecution' : 'StartExecution'}`;
        integration.httpMethod = 'POST';
        integration.credentials = '${StepFunctionRole}';
        break;
        
      case 'aws_service':
        integration.type = 'AWS';
        integration.uri = `arn:aws:apigateway:\${AWS::Region}:${formValue.awsServiceName}:action/${formValue.awsServiceAction}`;
        integration.httpMethod = 'POST';
        break;
    }
    
    // Add mapping templates if configured
    if (this.requestMappingTemplate) {
      integration.requestTemplates = {
        'application/json': this.requestMappingTemplate
      };
    }
    
    if (this.responseMappingTemplate) {
      integration.responses = integration.responses || {};
      integration.responses.default = integration.responses.default || {};
      integration.responses.default.responseTemplates = {
        'application/json': this.responseMappingTemplate
      };
    }
    
    // Add error mappings
    if (this.errorMappings.length > 0) {
      integration.responses = integration.responses || {};
      this.errorMappings.forEach(errorMap => {
        integration.responses[errorMap.pattern] = {
          statusCode: errorMap.statusCode.toString(),
          responseTemplates: {
            'application/json': errorMap.response
          }
        };
      });
    }
    
    return integration;
  }

  generateCurlExample(): void {
    const formValue = this.endpointForm.value;
    const baseUrl = 'https://api.example.com';
    const url = `${baseUrl}${formValue.path}`;
    
    let curl = `curl -X ${formValue.method} '${url}'`;
    
    // Add query parameters
    const queryParams = formValue.parameters?.filter((p: any) => p.in === 'query');
    if (queryParams?.length > 0) {
      const params = queryParams.map((p: any) => `${p.name}=<${p.type}>`).join('&');
      curl = `curl -X ${formValue.method} '${url}?${params}'`;
    }
    
    // Add headers
    const headerParams = formValue.parameters?.filter((p: any) => p.in === 'header');
    headerParams?.forEach((p: any) => {
      curl += ` \\\n  -H '${p.name}: <${p.type}>'`;
    });
    
    curl += ` \\\n  -H 'Accept: application/json'`;
    
    // Add request body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(formValue.method) && formValue.requestBody?.schema) {
      curl += ` \\\n  -H 'Content-Type: ${formValue.requestBody.contentType}'`;
      if (formValue.requestBody.example) {
        curl += ` \\\n  -d '${formValue.requestBody.example}'`;
      } else {
        curl += ` \\\n  -d '{}'`;
      }
    }
    
    this.curlExample = curl;
  }
  
  async testEndpoint(): Promise<void> {
    if (!this.testBaseUrl) {
      this.snackBar.open('Please enter a base URL', 'Close', { duration: 2000 });
      return;
    }
    
    this.isTestRunning = true;
    const formValue = this.endpointForm.value;
    
    // Prepare auth headers if provided
    const authHeaders: Record<string, string> = {};
    if (this.testAuthHeader) {
      authHeaders['Authorization'] = this.testAuthHeader;
    }
    
    try {
      // Create endpoint object for testing
      const endpoint = {
        method: formValue.method,
        path: formValue.path,
        parameters: formValue.parameters,
        requestBody: formValue.requestBody?.schema ? {
          content: {
            [formValue.requestBody.contentType]: {
              schema: JSON.parse(formValue.requestBody.schema || '{}'),
              example: formValue.requestBody.example ? 
                JSON.parse(formValue.requestBody.example) : undefined
            }
          }
        } : undefined
      };
      
      this.testResult = await this.testService.testEndpoint(
        endpoint,
        this.testBaseUrl,
        authHeaders
      );
      
      if (this.testResult.error) {
        this.snackBar.open(`Test failed: ${this.testResult.error}`, 'Close', { 
          duration: 5000,
          panelClass: 'error-snackbar'
        });
      } else {
        this.snackBar.open('Request sent successfully', 'Close', { duration: 2000 });
      }
    } catch (error: any) {
      this.snackBar.open(`Test error: ${error.message}`, 'Close', { 
        duration: 5000,
        panelClass: 'error-snackbar'
      });
    } finally {
      this.isTestRunning = false;
    }
  }
  
  copyCurl(): void {
    navigator.clipboard.writeText(this.curlExample).then(() => {
      this.snackBar.open('Copied to clipboard', 'Close', { duration: 2000 });
    });
  }
  
  async exportToPostman(): Promise<void> {
    const formValue = this.endpointForm.value;
    
    // Create a minimal OpenAPI document for this endpoint
    const doc = {
      info: {
        title: 'API Export',
        description: 'Single endpoint export'
      },
      paths: {
        [formValue.path]: {
          [formValue.method.toLowerCase()]: {
            summary: formValue.summary,
            description: formValue.description,
            tags: this.currentTags,
            parameters: formValue.parameters,
            requestBody: formValue.requestBody?.schema ? {
              content: {
                [formValue.requestBody.contentType]: {
                  schema: JSON.parse(formValue.requestBody.schema || '{}'),
                  example: formValue.requestBody.example ? 
                    JSON.parse(formValue.requestBody.example) : undefined
                }
              }
            } : undefined,
            responses: this.buildResponsesObject()
          }
        }
      }
    };
    
    const collection = await this.testService.exportToPostman(
      doc,
      this.testBaseUrl || 'https://api.example.com'
    );
    
    // Download the collection
    const blob = new Blob([collection], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${formValue.id || 'endpoint'}.postman_collection.json`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Postman collection exported', 'Close', { duration: 2000 });
  }
  
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
  
  formatResponseBody(body: any): string {
    if (typeof body === 'string') {
      try {
        // Try to parse and pretty-print JSON
        const parsed = JSON.parse(body);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return body;
      }
    }
    return JSON.stringify(body, null, 2);
  }
  
  getResponseHeadersForExport(headers: Record<string, string>): Array<{key: string, value: string}> {
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  }

  getResponseHeadersAsArray(headers?: Record<string, string>): Array<{key: string, value: string}> {
    if (!headers || typeof headers !== 'object') {
      return [];
    }
    return Object.entries(headers).map(([key, value]) => ({ key, value }));
  }
  
  private buildResponsesObject(): any {
    const responses: any = {};
    const formResponses = this.endpointForm.get('responses')?.value || [];
    
    formResponses.forEach((response: any) => {
      responses[response.code] = {
        description: response.description,
        content: {
          [response.contentType]: {
            schema: response.schema ? JSON.parse(response.schema) : undefined
          }
        }
      };
    });
    
    return responses;
  }

  updateVendorExtension(index: number, value?: string): void {
    const ext = this.vendorExtensions[index];
    if (ext) {
      if (value !== undefined) {
        ext.value = value;
      }
      if (ext.name && ext.value) {
        try {
          const parsedValue = JSON.parse(ext.value);
          this.xExtensions[ext.name] = parsedValue;
        } catch (e) {
          this.xExtensions[ext.name] = ext.value;
        }
      }
    }
  }

  formatRawExtensions(): string {
    try {
      const parsed = JSON.parse(this.rawExtensions);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return this.rawExtensions;
    }
  }

  updateRawExtensions(value?: string): void {
    if (value !== undefined) {
      this.rawExtensions = value;
    }
    try {
      const parsed = JSON.parse(this.rawExtensions);
      this.xExtensions = parsed;
      this.rawExtensionsError = '';
    } catch (e) {
      this.rawExtensionsError = 'Invalid JSON format';
    }
  }

  private processParametersForOpenAPI(parameters: any[]): any[] {
    if (!parameters || !Array.isArray(parameters)) {
      return [];
    }

    return parameters.map(param => {
      const processed: any = {
        name: param.name,
        in: param.in,
        description: param.description || undefined,
        required: param.required || false
      };

      // Path parameters are always required
      if (param.in === 'path') {
        processed.required = true;
      }

      // Only add deprecated if true
      if (param.deprecated === true) {
        processed.deprecated = true;
      }

      // Only query and header parameters can have style and explode
      if (param.in === 'query' || param.in === 'header') {
        // Only add style if it's not the default
        if (param.in === 'query' && param.style && param.style !== 'form') {
          processed.style = param.style;
        } else if (param.in === 'header' && param.style && param.style !== 'simple') {
          processed.style = param.style;
        }
        
        // Only add explode if it's not the default
        if (param.explode !== undefined) {
          // Default explode for form style is true, for others is false
          const defaultExplode = param.style === 'form' ? true : false;
          if (param.explode !== defaultExplode) {
            processed.explode = param.explode;
          }
        }

        // Only query parameters can have allowEmptyValue
        if (param.in === 'query' && param.allowEmptyValue === true) {
          processed.allowEmptyValue = true;
        }
      }

      // Path parameters can have style (but not form) and explode
      if (param.in === 'path' && param.style && param.style !== 'simple' && param.style !== 'form') {
        processed.style = param.style;
        if (param.explode !== undefined && param.explode !== false) {
          processed.explode = param.explode;
        }
      }

      // Process schema
      if (param.schema) {
        const schema: any = {
          type: param.schema.type || 'string'
        };

        // Add format if not empty
        if (param.schema.format && param.schema.format.trim() !== '') {
          schema.format = param.schema.format;
        }

        // Add enum only if it has items
        if (param.schema.enum && Array.isArray(param.schema.enum) && param.schema.enum.length > 0) {
          schema.enum = param.schema.enum;
        }

        // Add default if not empty
        if (param.schema.default !== undefined && param.schema.default !== '') {
          schema.default = param.schema.default;
        }

        // Add numeric constraints only if they are numbers
        if (typeof param.schema.minimum === 'number') {
          schema.minimum = param.schema.minimum;
        }
        if (typeof param.schema.maximum === 'number') {
          schema.maximum = param.schema.maximum;
        }

        // Add pattern if not empty
        if (param.schema.pattern && param.schema.pattern.trim() !== '') {
          schema.pattern = param.schema.pattern;
        }

        // Add items for array type
        if (param.schema.type === 'array' && param.schema.items) {
          schema.items = param.schema.items;
        }

        processed.schema = schema;
      } else {
        // Default schema
        processed.schema = { type: 'string' };
      }

      // Add example if provided
      if (param.example !== undefined && param.example !== '') {
        processed.example = param.example;
      }

      // Add examples if provided
      if (param.examples && Object.keys(param.examples).length > 0) {
        processed.examples = param.examples;
      }

      return processed;
    });
  }

  switchToEdit(): void {
    this.mode = 'edit';
    this.endpointForm.enable();
  }

  save(): void {
    if (this.endpointForm.valid) {
      const formValue = this.endpointForm.value;
      
      // Convert form data to OpenAPI format
      const endpoint: any = {
        id: formValue.id,
        method: formValue.method,
        path: formValue.path,
        summary: formValue.summary,
        description: formValue.description,
        tags: this.currentTags,
        deprecated: formValue.deprecated,
        parameters: this.processParametersForOpenAPI(formValue.parameters),
        responses: {}
      };
      
      // Include original path and method for update operations
      if (this.mode === 'edit' && (this.originalPath || this.originalMethod)) {
        endpoint.originalPath = this.originalPath;
        endpoint.originalMethod = this.originalMethod;
      }
      
      // Add AWS Integration x-extensions if configured
      if (formValue.integrationType) {
        endpoint['x-amazon-apigateway-integration'] = this.buildIntegrationObject(formValue);
      }
      
      // Add Policy x-extensions
      if (formValue.throttlingEnabled) {
        endpoint['x-throttling'] = {
          rateLimit: formValue.rateLimit,
          burstLimit: formValue.burstLimit
        };
      }
      
      if (formValue.usagePlan) {
        endpoint['x-usage-plan'] = {
          plan: formValue.usagePlan,
          quotas: {
            daily: formValue.dailyQuota,
            weekly: formValue.weeklyQuota,
            monthly: formValue.monthlyQuota
          }
        };
      }
      
      if (formValue.cacheEnabled) {
        endpoint['x-amazon-apigateway-cache'] = {
          enabled: true,
          ttl: formValue.cacheTtl,
          cacheKeyParameters: this.cacheKeyParams,
          cacheUnauthorized: formValue.cacheUnauthorized,
          encrypted: formValue.cacheEncrypted
        };
      }
      
      if (formValue.corsEnabled) {
        endpoint['x-amazon-apigateway-cors'] = {
          allowOrigins: formValue.corsOrigins.split('\n').filter((o: string) => o),
          allowMethods: formValue.corsMethods,
          allowHeaders: formValue.corsHeaders.split('\n').filter((h: string) => h),
          exposeHeaders: formValue.corsExposedHeaders.split('\n').filter((h: string) => h),
          maxAge: formValue.corsMaxAge,
          allowCredentials: formValue.corsCredentials
        };
      }
      
      if (formValue.apiKeyRequired) {
        endpoint['x-amazon-apigateway-api-key-source'] = 'HEADER';
        endpoint['x-amazon-apigateway-api-key-required'] = true;
      }
      
      if (formValue.authorizerType) {
        endpoint['x-amazon-apigateway-auth'] = this.buildAuthorizerObject(formValue);
      }
      
      if (formValue.validateRequestBody || formValue.validateRequestParameters || formValue.validateRequestHeaders) {
        endpoint['x-amazon-apigateway-request-validator'] = formValue.validator || 'validate-all';
        endpoint['x-amazon-apigateway-request-validators'] = {
          validateRequestBody: formValue.validateRequestBody,
          validateRequestParameters: formValue.validateRequestParameters,
          validateRequestHeaders: formValue.validateRequestHeaders
        };
      }
      
      // CloudWatch and X-Ray settings
      endpoint['x-amazon-apigateway-logging'] = {
        level: formValue.logLevel,
        dataTrace: formValue.logFullRequests,
        metricsEnabled: formValue.detailedMetricsEnabled,
        customMetrics: this.customMetrics
      };
      
      if (formValue.xrayTracingEnabled) {
        endpoint['x-amazon-apigateway-xray'] = {
          enabled: true,
          samplingRate: formValue.xraySamplingRate / 100
        };
      }
      
      // Add request body if present
      if (formValue.requestBody?.schema) {
        endpoint.requestBody = {
          required: formValue.requestBody.required,
          description: formValue.requestBody.description,
          content: {
            [formValue.requestBody.contentType]: {
              schema: JSON.parse(formValue.requestBody.schema || '{}'),
              example: formValue.requestBody.example ? JSON.parse(formValue.requestBody.example) : undefined
            }
          }
        };
      }
      
      // Add responses
      formValue.responses?.forEach((response: any) => {
        endpoint.responses[response.code] = {
          description: response.description,
          content: response.schema ? {
            [response.contentType]: {
              schema: JSON.parse(response.schema || '{}'),
              example: response.example ? JSON.parse(response.example) : undefined
            }
          } : undefined
        };
      });
      
      // Add logging configuration
      if (formValue.logLevel !== 'OFF') {
        endpoint['x-amazon-apigateway-logging'] = {
          level: formValue.logLevel,
          fullRequests: formValue.logFullRequests,
          detailedMetrics: formValue.detailedMetricsEnabled,
          customMetrics: this.customMetrics.length > 0 ? this.customMetrics : undefined
        };
      }
      
      // Add X-Ray tracing
      if (formValue.xrayTracingEnabled) {
        endpoint['x-amazon-apigateway-xray-tracing'] = {
          enabled: true,
          samplingRate: formValue.xraySamplingRate
        };
      }
      
      // Add Advanced tab extensions
      if (this.deployTags.length > 0) {
        endpoint['x-deploy-tags'] = this.deployTags;
      }
      
      if (this.stageVariables.length > 0) {
        endpoint['x-amazon-apigateway-stage-variables'] = this.stageVariables.reduce((acc, sv) => {
          if (sv.name) {
            acc[sv.name] = {
              value: sv.value,
              description: sv.description
            };
          }
          return acc;
        }, {} as any);
      }
      
      if (this.documentationParts.length > 0) {
        endpoint['x-amazon-apigateway-documentation'] = {
          parts: this.documentationParts
        };
      }
      
      if (formValue.externalDocsUrl) {
        endpoint.externalDocs = {
          url: formValue.externalDocsUrl,
          description: formValue.externalDocsDescription || undefined
        };
      }
      
      if (this.customRequestHeaders.length > 0) {
        endpoint['x-amazon-apigateway-request-headers'] = this.customRequestHeaders.reduce((acc, header) => {
          if (header.name) {
            acc[header.name] = {
              value: header.value,
              required: header.required
            };
          }
          return acc;
        }, {} as any);
      }
      
      if (this.customResponseHeaders.length > 0) {
        endpoint['x-amazon-apigateway-response-headers'] = this.customResponseHeaders.reduce((acc, header) => {
          if (header.name) {
            acc[header.name] = {
              value: header.value,
              override: header.override
            };
          }
          return acc;
        }, {} as any);
      }
      
      // Add SDK generation settings
      if (formValue.sdkOperationName || formValue.sdkServiceName || formValue.sdkReturnType || formValue.sdkExclude) {
        endpoint['x-amazon-apigateway-sdk'] = {
          operationName: formValue.sdkOperationName || undefined,
          serviceName: formValue.sdkServiceName || undefined,
          returnType: formValue.sdkReturnType || undefined,
          exclude: formValue.sdkExclude || undefined
        };
      }
      
      // Add vendor extensions
      if (this.vendorExtensions.length > 0) {
        this.vendorExtensions.forEach(ext => {
          if (ext.name && ext.name.startsWith('x-')) {
            try {
              endpoint[ext.name] = JSON.parse(ext.value);
            } catch {
              endpoint[ext.name] = ext.value;
            }
          }
        });
      }
      
      // Add raw extensions
      if (this.rawExtensions && !this.rawExtensionsError) {
        try {
          const rawExt = JSON.parse(this.rawExtensions);
          Object.keys(rawExt).forEach(key => {
            if (key.startsWith('x-')) {
              endpoint[key] = rawExt[key];
            }
          });
        } catch {
          // Ignore parsing errors
        }
      }
      
      this.dialogRef.close(endpoint);
    }
  }

  cancel(): void {
    if (this.hasUnsavedChanges && this.mode !== 'view') {
      const confirmExit = confirm('You have unsaved changes. Are you sure you want to exit?');
      if (!confirmExit) {
        return;
      }
    }
    this.dialogRef.close();
  }
  
  private setupFormTracking(): void {
    // Store initial form value
    this.initialFormValue = this.endpointForm.value;
    this.saveToHistory(this.initialFormValue);
    
    // Track form changes
    this.endpointForm.valueChanges.subscribe(value => {
      this.hasUnsavedChanges = JSON.stringify(value) !== JSON.stringify(this.initialFormValue);
      
      // Auto-save to history for undo/redo (debounced)
      if (this.hasUnsavedChanges) {
        this.saveToHistory(value);
      }
    });
  }
  
  private setupValidation(): void {
    // Real-time validation for operationId
    this.endpointForm.get('id')?.valueChanges.subscribe(value => {
      this.validateOperationId(value);
    });
    
    // Real-time validation for path
    this.endpointForm.get('path')?.valueChanges.subscribe(value => {
      this.validatePath(value);
      // Auto-detect path parameters when path changes
      if (this.mode !== 'view') {
        this.autoDetectPathParameters();
      }
    });
    
    // Real-time validation for summary length
    this.endpointForm.get('summary')?.valueChanges.subscribe(value => {
      if (value && value.length > 120) {
        this.validationErrors['summary'] = 'Summary must be 120 characters or less';
      } else {
        delete this.validationErrors['summary'];
      }
    });
  }
  
  private loadExistingOperationIds(): void {
    // In a real implementation, this would load from the OpenAPI document
    // For now, we'll use a mock list
    if (this.data && this.data.document) {
      const doc = this.data.document;
      if (doc.paths) {
        Object.values(doc.paths).forEach((pathItem: any) => {
          Object.values(pathItem).forEach((operation: any) => {
            if (operation.operationId) {
              this.existingOperationIds.push(operation.operationId);
            }
          });
        });
      }
    }
  }
  
  private validateOperationId(value: string): void {
    if (!value) {
      this.validationErrors['id'] = 'Operation ID is required';
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
      this.validationErrors['id'] = 'Operation ID can only contain letters, numbers, underscores, and hyphens';
      return;
    }
    
    // Check uniqueness (skip if editing same endpoint)
    if (this.mode === 'create' || (this.data.endpoint?.id !== value)) {
      if (this.existingOperationIds.includes(value)) {
        this.validationErrors['id'] = 'Operation ID already exists';
        return;
      }
    }
    
    delete this.validationErrors['id'];
  }
  
  private validatePath(value: string): void {
    if (!value) {
      this.validationErrors['path'] = 'Path is required';
      return;
    }
    
    if (!value.startsWith('/')) {
      this.validationErrors['path'] = 'Path must start with /';
      return;
    }
    
    // Check for valid path parameters
    const pathParams = value.match(/{([^}]+)}/g);
    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.slice(1, -1);
        if (!/^[a-zA-Z0-9_]+$/.test(paramName)) {
          this.validationErrors['path'] = `Invalid path parameter: ${param}`;
          return;
        }
      });
    }
    
    delete this.validationErrors['path'];
  }
  
  private saveToHistory(value: any): void {
    // Remove any history after current index
    if (this.historyIndex < this.formHistory.length - 1) {
      this.formHistory = this.formHistory.slice(0, this.historyIndex + 1);
    }
    
    // Add new value to history
    this.formHistory.push(JSON.parse(JSON.stringify(value)));
    this.historyIndex++;
    
    // Limit history size
    if (this.formHistory.length > this.maxHistorySize) {
      this.formHistory.shift();
      this.historyIndex--;
    }
  }
  
  undo(): void {
    if (this.canUndo()) {
      this.historyIndex--;
      const previousValue = this.formHistory[this.historyIndex];
      this.endpointForm.patchValue(previousValue, { emitEvent: false });
      this.loadFormArrays(previousValue);
      this.generateCurlExample();
    }
  }
  
  redo(): void {
    if (this.canRedo()) {
      this.historyIndex++;
      const nextValue = this.formHistory[this.historyIndex];
      this.endpointForm.patchValue(nextValue, { emitEvent: false });
      this.loadFormArrays(nextValue);
      this.generateCurlExample();
    }
  }
  
  canUndo(): boolean {
    return this.historyIndex > 0;
  }
  
  canRedo(): boolean {
    return this.historyIndex < this.formHistory.length - 1;
  }
  
  private loadFormArrays(value: any): void {
    // Clear and reload parameters
    const parametersArray = this.endpointForm.get('parameters') as FormArray;
    parametersArray.clear();
    value.parameters?.forEach((param: any) => {
      parametersArray.push(this.createParameter(param));
    });
    
    // Clear and reload responses
    const responsesArray = this.endpointForm.get('responses') as FormArray;
    responsesArray.clear();
    value.responses?.forEach((response: any) => {
      responsesArray.push(this.createResponse(response.code, response.description));
    });
    
    // Update tags
    this.currentTags = value.tags || [];
  }
  
  getValidationError(field: string): string {
    return this.validationErrors[field] || '';
  }
  
  hasValidationError(field: string): boolean {
    return !!this.validationErrors[field];
  }
  
  isFieldRequired(field: string): boolean {
    const control = this.endpointForm.get(field);
    if (!control) return false;
    
    const validators = control.validator ? control.validator({} as any) : null;
    return validators ? validators['required'] : false;
  }
}