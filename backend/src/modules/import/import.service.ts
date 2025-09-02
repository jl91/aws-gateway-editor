import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayConfig, GatewayEndpoint, ImportHistory, ImportStatus } from '../../shared/entities';
import { GatewayService } from '../gateway/gateway.service';
import AdmZip from 'adm-zip';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import SwaggerParser from '@apidevtools/swagger-parser';

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectRepository(GatewayConfig)
    private readonly gatewayConfigRepo: Repository<GatewayConfig>,
    @InjectRepository(GatewayEndpoint)
    private readonly gatewayEndpointRepo: Repository<GatewayEndpoint>,
    @InjectRepository(ImportHistory)
    private readonly importHistoryRepo: Repository<ImportHistory>,
    private readonly gatewayService: GatewayService,
  ) {}

  async importFile(file: Express.Multer.File, userId?: string) {
    const startTime = Date.now();
    const importHistory = await this.createImportHistory(file, userId);

    try {
      let openApiContent: any;

      // Determine file type and process accordingly
      if (file.mimetype === 'application/zip' || file.originalname.endsWith('.zip')) {
        openApiContent = await this.processZipFile(file.path);
      } else if (file.originalname.endsWith('.yaml') || file.originalname.endsWith('.yml')) {
        const content = await fs.readFile(file.path, 'utf-8');
        openApiContent = yaml.load(content);
      } else if (file.originalname.endsWith('.json')) {
        const content = await fs.readFile(file.path, 'utf-8');
        openApiContent = JSON.parse(content);
      } else {
        throw new BadRequestException('Unsupported file format');
      }

      // Validate OpenAPI specification
      const validated = await this.validateOpenApi(openApiContent);

      // Create gateway configuration
      const gatewayConfig = await this.createGatewayConfig(validated);

      // Process and save endpoints
      const endpoints = await this.processEndpoints(validated, gatewayConfig);

      // Update import history
      const processingTime = Date.now() - startTime;
      await this.updateImportHistory(importHistory, {
        config: gatewayConfig,
        importStatus: ImportStatus.SUCCESS,
        endpointsCount: endpoints.length,
        processingTimeMs: processingTime,
      });

      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});

      return {
        success: true,
        configId: gatewayConfig.id,
        endpointsCount: endpoints.length,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      this.logger.error('Import failed', error);

      // Update import history with error
      await this.updateImportHistory(importHistory, {
        importStatus: ImportStatus.FAILED,
        errorDetails: error.message,
        processingTimeMs: Date.now() - startTime,
      });

      // Clean up uploaded file
      await fs.unlink(file.path).catch(() => {});

      throw new BadRequestException(`Import failed: ${error.message}`);
    }
  }

  private async processZipFile(filePath: string): Promise<any> {
    const zip = new AdmZip(filePath);
    const zipEntries = zip.getEntries();

    // Look for OpenAPI files in the ZIP
    for (const entry of zipEntries) {
      const fileName = entry.entryName.toLowerCase();
      if (
        fileName.endsWith('.yaml') ||
        fileName.endsWith('.yml') ||
        fileName.endsWith('.json') ||
        fileName.includes('openapi') ||
        fileName.includes('swagger')
      ) {
        const content = entry.getData().toString('utf8');

        if (fileName.endsWith('.yaml') || fileName.endsWith('.yml')) {
          return yaml.load(content);
        } else if (fileName.endsWith('.json')) {
          return JSON.parse(content);
        }
      }
    }

    throw new BadRequestException('No OpenAPI specification found in ZIP file');
  }

  private async validateOpenApi(spec: any): Promise<any> {
    try {
      const api = await SwaggerParser.validate(spec);
      return api;
    } catch (error) {
      throw new BadRequestException(`Invalid OpenAPI specification: ${error.message}`);
    }
  }

  private async createGatewayConfig(spec: any): Promise<GatewayConfig> {
    const fileHash = this.generateHash(JSON.stringify(spec));

    // Check if configuration already exists
    const existing = await this.gatewayConfigRepo.findOne({
      where: { fileHash },
    });

    if (existing) {
      return existing;
    }

    const config = this.gatewayConfigRepo.create({
      name: spec.info?.title || 'Imported API',
      version: spec.info?.version || '1.0.0',
      description: spec.info?.description,
      openapiVersion: spec.openapi || '3.0.0',
      fileHash,
      metadata: {
        servers: spec.servers,
        security: spec.security,
        tags: spec.tags,
        externalDocs: spec.externalDocs,
      },
    });

    return await this.gatewayConfigRepo.save(config);
  }

  private async processEndpoints(spec: any, config: GatewayConfig): Promise<GatewayEndpoint[]> {
    const endpoints: GatewayEndpoint[] = [];
    let sequenceOrder = 10;

    // Process all paths
    for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
          const op = operation as any;
          const endpoint = this.gatewayEndpointRepo.create({
            config,
            sequenceOrder,
            method: method.toUpperCase(),
            path: pathStr,
            operationId: op.operationId,
            summary: op.summary,
            description: op.description,
            tags: op.tags,
            requestBody: op.requestBody,
            responses: op.responses,
            security: op.security,
            pathParams: this.extractParameters(op.parameters, 'path'),
            queryParams: this.extractParameters(op.parameters, 'query'),
            headers: this.extractParameters(op.parameters, 'header'),
            xExtensions: this.extractExtensions(op),
          });

          endpoints.push(endpoint);
          sequenceOrder += 10;
        }
      }
    }

    // Save all endpoints
    return await this.gatewayEndpointRepo.save(endpoints);
  }

  private extractParameters(parameters: any[], type: string): any {
    if (!parameters) return null;

    const filtered = parameters.filter((p) => p.in === type);
    if (filtered.length === 0) return null;

    return filtered.reduce((acc, param) => {
      acc[param.name] = {
        description: param.description,
        required: param.required,
        schema: param.schema,
        example: param.example,
      };
      return acc;
    }, {});
  }

  private extractExtensions(operation: any): any {
    const extensions = {};
    for (const [key, value] of Object.entries(operation)) {
      if (key.startsWith('x-')) {
        extensions[key] = value;
      }
    }
    return Object.keys(extensions).length > 0 ? extensions : null;
  }

  private async createImportHistory(file: Express.Multer.File, userId?: string): Promise<ImportHistory> {
    const history = this.importHistoryRepo.create({
      fileName: file.originalname,
      fileSize: file.size,
      fileType: file.mimetype,
      importStatus: ImportStatus.PROCESSING,
      importedBy: userId,
    });

    return await this.importHistoryRepo.save(history);
  }

  private async updateImportHistory(history: ImportHistory, updates: Partial<ImportHistory>): Promise<void> {
    Object.assign(history, updates);
    await this.importHistoryRepo.save(history);
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}