import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  GatewayConfig,
  GatewayEndpoint,
  ExportCache,
  ExportFormat,
} from '../../shared/entities';
import * as yaml from 'js-yaml';
import * as crypto from 'crypto';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(GatewayConfig)
    private readonly configRepo: Repository<GatewayConfig>,
    @InjectRepository(GatewayEndpoint)
    private readonly endpointRepo: Repository<GatewayEndpoint>,
    @InjectRepository(ExportCache)
    private readonly cacheRepo: Repository<ExportCache>,
    private readonly configService: ConfigService,
  ) {}

  async exportConfig(configId: string, format: ExportFormat = ExportFormat.YAML) {
    const config = await this.configRepo.findOne({
      where: { id: configId, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException(`Gateway configuration with ID ${configId} not found`);
    }

    // Check cache first
    const cached = await this.checkCache(configId, format);
    if (cached) {
      await this.updateCacheAccess(cached);
      return cached.fileContent;
    }

    // Generate new export
    const openApiSpec = await this.generateOpenApiSpec(config);
    const content = this.formatContent(openApiSpec, format);
    const fileHash = this.generateHash(content);

    // Save to cache
    await this.saveToCache(config, format, content, fileHash);

    return Buffer.from(content);
  }

  async getExportStatus(configId: string): Promise<{ cached: boolean; formats: ExportFormat[] }> {
    const cached = await this.cacheRepo.find({
      where: {
        config: { id: configId },
        expiresAt: null, // Or check if not expired
      },
    });

    return {
      cached: cached.length > 0,
      formats: cached.map((c) => c.fileFormat),
    };
  }

  private async generateOpenApiSpec(config: GatewayConfig): Promise<any> {
    const endpoints = await this.endpointRepo.find({
      where: { config: { id: config.id }, deletedAt: null },
      order: { sequenceOrder: 'ASC' },
    });

    const paths = {};

    for (const endpoint of endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const operation: any = {
        operationId: endpoint.operationId,
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
      };

      // Add parameters
      const parameters = [];
      if (endpoint.pathParams) {
        for (const [name, param] of Object.entries(endpoint.pathParams)) {
          parameters.push({
            name,
            in: 'path',
            ...param,
          });
        }
      }
      if (endpoint.queryParams) {
        for (const [name, param] of Object.entries(endpoint.queryParams)) {
          parameters.push({
            name,
            in: 'query',
            ...param,
          });
        }
      }
      if (endpoint.headers) {
        for (const [name, param] of Object.entries(endpoint.headers)) {
          parameters.push({
            name,
            in: 'header',
            ...param,
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
            description: 'Successful response',
          },
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

      paths[endpoint.path][endpoint.method.toLowerCase()] = operation;
    }

    const spec = {
      openapi: config.openapiVersion || '3.0.0',
      info: {
        title: config.name,
        version: config.version,
        description: config.description,
      },
      paths,
    };

    // Add metadata if available
    if (config.metadata) {
      if (config.metadata.servers) spec['servers'] = config.metadata.servers;
      if (config.metadata.security) spec['security'] = config.metadata.security;
      if (config.metadata.tags) spec['tags'] = config.metadata.tags;
      if (config.metadata.externalDocs) spec['externalDocs'] = config.metadata.externalDocs;
    }

    return spec;
  }

  private formatContent(spec: any, format: ExportFormat): string {
    if (format === ExportFormat.JSON) {
      return JSON.stringify(spec, null, 2);
    } else {
      return yaml.dump(spec, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        sortKeys: false,
      });
    }
  }

  private async checkCache(configId: string, format: ExportFormat): Promise<ExportCache | null> {
    const cached = await this.cacheRepo.findOne({
      where: {
        config: { id: configId },
        fileFormat: format,
      },
      order: { generatedAt: 'DESC' },
    });

    if (!cached) return null;

    // Check if cache is expired
    const cacheTTL = this.configService.get('CACHE_TTL', 3600) * 1000; // Convert to milliseconds
    const isExpired = Date.now() - cached.generatedAt.getTime() > cacheTTL;

    if (isExpired) {
      await this.cacheRepo.remove(cached);
      return null;
    }

    return cached;
  }

  private async saveToCache(
    config: GatewayConfig,
    format: ExportFormat,
    content: string,
    fileHash: string,
  ): Promise<void> {
    const cache = this.cacheRepo.create({
      config,
      fileFormat: format,
      fileContent: Buffer.from(content),
      fileSize: content.length,
      fileHash,
      expiresAt: new Date(Date.now() + this.configService.get('CACHE_TTL', 3600) * 1000),
    });

    await this.cacheRepo.save(cache);
  }

  private async updateCacheAccess(cache: ExportCache): Promise<void> {
    cache.accessedCount++;
    cache.lastAccessedAt = new Date();
    await this.cacheRepo.save(cache);
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}