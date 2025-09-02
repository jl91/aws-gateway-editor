import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiProduces,
} from '@nestjs/swagger';
import { ExportService } from './export.service';
import { ExportFormat } from '../../shared/entities';

@ApiTags('Export')
@Controller('api/gateway/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get(':configId')
  @ApiOperation({ summary: 'Export gateway configuration as OpenAPI file' })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ExportFormat,
    description: 'Export format (json or yaml)',
  })
  @ApiProduces('application/json', 'application/x-yaml')
  @ApiResponse({ status: 200, description: 'File exported successfully' })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async exportConfig(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Query('format') format: ExportFormat = ExportFormat.YAML,
    @Res() res: Response,
  ) {
    const content = await this.exportService.exportConfig(configId, format);

    const contentType = format === ExportFormat.JSON ? 'application/json' : 'application/x-yaml';
    const extension = format === ExportFormat.JSON ? 'json' : 'yaml';

    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="openapi-${configId}.${extension}"`,
    });

    res.send(content);
  }

  @Get(':configId/status')
  @ApiOperation({ summary: 'Check export cache status' })
  @ApiResponse({
    status: 200,
    description: 'Cache status',
    schema: {
      type: 'object',
      properties: {
        cached: { type: 'boolean' },
        formats: {
          type: 'array',
          items: { type: 'string', enum: ['json', 'yaml'] },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Gateway configuration not found' })
  async getExportStatus(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.exportService.getExportStatus(configId);
  }
}