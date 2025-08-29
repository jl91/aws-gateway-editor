import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import SwaggerParser from '@apidevtools/swagger-parser';
import { Spectral, Document } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import { OpenAPIDocument } from './openapi.service';

export interface ValidationError {
  severity: 'error' | 'warning' | 'info' | 'hint';
  message: string;
  path: string[];
  line?: number;
  column?: number;
  source?: string;
  code?: string;
  quickFix?: QuickFix;
}

export interface QuickFix {
  description: string;
  fix: () => void;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
  hints: ValidationError[];
  totalIssues: number;
}

export interface ValidationConfig {
  enableRealTime: boolean;
  blockSaveOnError: boolean;
  customRules?: any[];
  ignorePaths?: string[];
  severity?: {
    missingDescription?: 'error' | 'warning' | 'info' | 'hint' | 'off';
    missingExample?: 'error' | 'warning' | 'info' | 'hint' | 'off';
    unusedComponent?: 'error' | 'warning' | 'info' | 'hint' | 'off';
  };
}

@Injectable({
  providedIn: 'root'
})
export class ValidationService {
  private validationResult$ = new BehaviorSubject<ValidationResult>({
    valid: true,
    errors: [],
    warnings: [],
    info: [],
    hints: [],
    totalIssues: 0
  });

  private config$ = new BehaviorSubject<ValidationConfig>({
    enableRealTime: true,
    blockSaveOnError: false,
    severity: {
      missingDescription: 'warning',
      missingExample: 'info',
      unusedComponent: 'warning'
    }
  });

  private spectral: Spectral = new Spectral();
  private customRules: Map<string, any> = new Map();

  constructor() {
    this.initializeSpectral();
    this.setupCustomRules();
  }

  get validationResult(): Observable<ValidationResult> {
    return this.validationResult$.asObservable();
  }

  get config(): Observable<ValidationConfig> {
    return this.config$.asObservable();
  }

  private async initializeSpectral(): Promise<void> {
    this.spectral.setRuleset(oas as any);
    
    // Add custom rules
    await this.applyCustomRules();
  }

  private setupCustomRules(): void {
    // AWS API Gateway specific rules
    this.customRules.set('aws-integration-required', {
      description: 'AWS API Gateway integration is required',
      severity: 'warning',
      given: '$.paths[*][*]',
      then: {
        field: 'x-amazon-apigateway-integration',
        function: 'truthy'
      }
    });

    this.customRules.set('operation-id-format', {
      description: 'Operation ID should follow camelCase convention',
      severity: 'warning',
      given: '$.paths[*][*].operationId',
      then: {
        function: 'pattern',
        functionOptions: {
          match: '^[a-z][a-zA-Z0-9]*$'
        }
      }
    });

    this.customRules.set('path-parameter-validation', {
      description: 'Path parameters must be defined',
      severity: 'error',
      given: '$.paths',
      then: {
        function: this.validatePathParameters
      }
    });
  }

  private async applyCustomRules(): Promise<void> {
    const ruleset = {
      extends: [oas],
      rules: Object.fromEntries(this.customRules)
    };
    
    await this.spectral.setRuleset(ruleset);
  }

  async validateDocument(document: OpenAPIDocument): Promise<ValidationResult> {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
      hints: [],
      totalIssues: 0
    };

    try {
      // Swagger Parser validation
      await this.validateWithSwaggerParser(document, result);
      
      // Spectral linting
      if (this.config$.value.enableRealTime) {
        await this.lintWithSpectral(document, result);
      }
      
      // Custom validations
      await this.runCustomValidations(document, result);
      
      // Calculate totals
      result.totalIssues = result.errors.length + result.warnings.length + 
                          result.info.length + result.hints.length;
      result.valid = result.errors.length === 0;
      
    } catch (error: any) {
      result.errors.push({
        severity: 'error',
        message: `Validation failed: ${error.message}`,
        path: [],
        source: 'validator'
      });
      result.valid = false;
    }

    this.validationResult$.next(result);
    return result;
  }

  private async validateWithSwaggerParser(
    document: OpenAPIDocument, 
    result: ValidationResult
  ): Promise<void> {
    try {
      await SwaggerParser.validate(document as any);
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown validation error';
      const path = this.extractPathFromError(errorMessage);
      
      result.errors.push({
        severity: 'error',
        message: errorMessage,
        path: path,
        source: 'swagger-parser',
        quickFix: this.generateQuickFix(errorMessage, path)
      });
    }
  }

  private async lintWithSpectral(
    document: OpenAPIDocument,
    result: ValidationResult
  ): Promise<void> {
    try {
      const documentString = JSON.stringify(document, null, 2);
      const spectralDocument = new Document(documentString, undefined as any, 'openapi.json');
      const diagnostics = await this.spectral.run(spectralDocument);
      
      diagnostics.forEach(diagnostic => {
        const error: ValidationError = {
          severity: this.mapSeverity(diagnostic.severity),
          message: diagnostic.message,
          path: (diagnostic.path as string[]) || [],
          line: diagnostic.range?.start.line,
          column: diagnostic.range?.start.character,
          source: 'spectral',
          code: diagnostic.code as string
        };
        
        switch (error.severity) {
          case 'error':
            result.errors.push(error);
            break;
          case 'warning':
            result.warnings.push(error);
            break;
          case 'info':
            result.info.push(error);
            break;
          case 'hint':
            result.hints.push(error);
            break;
        }
      });
    } catch (error: any) {
      console.error('Spectral linting failed:', error);
    }
  }

  private async runCustomValidations(
    document: OpenAPIDocument,
    result: ValidationResult
  ): Promise<void> {
    // Check for missing descriptions
    if (this.config$.value.severity?.missingDescription !== 'off') {
      this.checkMissingDescriptions(document, result);
    }
    
    // Check for missing examples
    if (this.config$.value.severity?.missingExample !== 'off') {
      this.checkMissingExamples(document, result);
    }
    
    // Check for unused components
    if (this.config$.value.severity?.unusedComponent !== 'off') {
      this.checkUnusedComponents(document, result);
    }
    
    // Validate references
    this.validateReferences(document, result);
    
    // Check for breaking changes (if we have a previous version)
    // this.checkBreakingChanges(document, result);
  }

  private checkMissingDescriptions(
    document: OpenAPIDocument,
    result: ValidationResult
  ): void {
    const severity = this.config$.value.severity?.missingDescription || 'warning';
    
    // Check API description
    if (!document.info.description) {
      this.addValidationError(result, severity, 'API description is missing', ['info', 'description']);
    }
    
    // Check endpoint descriptions
    if (document.paths) {
      Object.entries(document.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem as any).forEach(([method, operation]: [string, any]) => {
          if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
            if (!operation.description && !operation.summary) {
              this.addValidationError(
                result, 
                severity, 
                `Missing description for ${method.toUpperCase()} ${path}`,
                ['paths', path, method, 'description']
              );
            }
          }
        });
      });
    }
  }

  private checkMissingExamples(
    document: OpenAPIDocument,
    result: ValidationResult
  ): void {
    const severity = this.config$.value.severity?.missingExample || 'info';
    
    if (document.paths) {
      Object.entries(document.paths).forEach(([path, pathItem]) => {
        Object.entries(pathItem as any).forEach(([method, operation]: [string, any]) => {
          if (['post', 'put', 'patch'].includes(method)) {
            if (operation.requestBody?.content) {
              Object.entries(operation.requestBody.content).forEach(([contentType, media]: [string, any]) => {
                if (!media.example && !media.examples) {
                  this.addValidationError(
                    result,
                    severity,
                    `Missing request example for ${method.toUpperCase()} ${path}`,
                    ['paths', path, method, 'requestBody', 'content', contentType, 'example']
                  );
                }
              });
            }
          }
        });
      });
    }
  }

  private checkUnusedComponents(
    document: OpenAPIDocument,
    result: ValidationResult
  ): void {
    const severity = this.config$.value.severity?.unusedComponent || 'warning';
    
    if (!document.components) return;
    
    const usedRefs = new Set<string>();
    const documentString = JSON.stringify(document);
    
    // Find all $ref occurrences
    const refPattern = /"\$ref":\s*"#\/components\/([^"]+)"/g;
    let match;
    while ((match = refPattern.exec(documentString)) !== null) {
      usedRefs.add(match[1]);
    }
    
    // Check each component type
    ['schemas', 'responses', 'parameters', 'examples', 'requestBodies', 'headers'].forEach(componentType => {
      const components = document.components[componentType];
      if (components) {
        Object.keys(components).forEach(name => {
          const refPath = `${componentType}/${name}`;
          if (!usedRefs.has(refPath)) {
            this.addValidationError(
              result,
              severity,
              `Unused component: ${name}`,
              ['components', componentType, name]
            );
          }
        });
      }
    });
  }

  private validateReferences(
    document: OpenAPIDocument,
    result: ValidationResult
  ): void {
    const documentString = JSON.stringify(document);
    const refPattern = /"\$ref":\s*"#\/([^"]+)"/g;
    let match;
    
    while ((match = refPattern.exec(documentString)) !== null) {
      const refPath = match[1].split('/');
      let current: any = document;
      
      for (const segment of refPath) {
        if (!current[segment]) {
          result.errors.push({
            severity: 'error',
            message: `Invalid reference: #/${match[1]}`,
            path: refPath,
            source: 'validator'
          });
          break;
        }
        current = current[segment];
      }
    }
  }

  private validatePathParameters(path: string, operation: any): ValidationError[] {
    const errors: ValidationError[] = [];
    const pathParams = (path.match(/{([^}]+)}/g) || []).map(p => p.slice(1, -1));
    const definedParams = (operation.parameters || [])
      .filter((p: any) => p.in === 'path')
      .map((p: any) => p.name);
    
    pathParams.forEach(param => {
      if (!definedParams.includes(param)) {
        errors.push({
          severity: 'error',
          message: `Path parameter '{${param}}' is not defined`,
          path: ['paths', path, 'parameters'],
          source: 'validator'
        });
      }
    });
    
    return errors;
  }

  private extractPathFromError(errorMessage: string): string[] {
    // Try to extract path from error message
    const pathMatch = errorMessage.match(/at\s+"([^"]+)"/);
    if (pathMatch) {
      return pathMatch[1].split('/').filter(Boolean);
    }
    return [];
  }

  private generateQuickFix(errorMessage: string, path: string[]): QuickFix | undefined {
    // Generate quick fixes based on error type
    if (errorMessage.includes('missing required property')) {
      const propertyMatch = errorMessage.match(/'([^']+)'/);
      if (propertyMatch) {
        return {
          description: `Add missing property '${propertyMatch[1]}'`,
          fix: () => {
            console.log(`Adding property ${propertyMatch[1]} at`, path);
            // Implementation would modify the document
          }
        };
      }
    }
    
    return undefined;
  }

  private mapSeverity(spectralSeverity: number): ValidationError['severity'] {
    switch (spectralSeverity) {
      case 0: return 'error';
      case 1: return 'warning';
      case 2: return 'info';
      case 3: return 'hint';
      default: return 'info';
    }
  }

  private addValidationError(
    result: ValidationResult,
    severity: string,
    message: string,
    path: string[]
  ): void {
    const error: ValidationError = {
      severity: severity as ValidationError['severity'],
      message,
      path,
      source: 'custom'
    };
    
    switch (severity) {
      case 'error':
        result.errors.push(error);
        break;
      case 'warning':
        result.warnings.push(error);
        break;
      case 'info':
        result.info.push(error);
        break;
      case 'hint':
        result.hints.push(error);
        break;
    }
  }

  updateConfig(config: Partial<ValidationConfig>): void {
    this.config$.next({
      ...this.config$.value,
      ...config
    });
  }

  async exportValidationReport(document: OpenAPIDocument): Promise<string> {
    const result = await this.validateDocument(document);
    
    const report = `# OpenAPI Validation Report
Generated: ${new Date().toISOString()}

## Summary
- Total Issues: ${result.totalIssues}
- Errors: ${result.errors.length}
- Warnings: ${result.warnings.length}
- Info: ${result.info.length}
- Hints: ${result.hints.length}

## Errors
${result.errors.map(e => `- **${e.path.join('/')}**: ${e.message}`).join('\n') || 'No errors found'}

## Warnings
${result.warnings.map(w => `- **${w.path.join('/')}**: ${w.message}`).join('\n') || 'No warnings found'}

## Info
${result.info.map(i => `- **${i.path.join('/')}**: ${i.message}`).join('\n') || 'No info messages'}

## Hints
${result.hints.map(h => `- **${h.path.join('/')}**: ${h.message}`).join('\n') || 'No hints'}
`;
    
    return report;
  }

  clearValidation(): void {
    this.validationResult$.next({
      valid: true,
      errors: [],
      warnings: [],
      info: [],
      hints: [],
      totalIssues: 0
    });
  }
}