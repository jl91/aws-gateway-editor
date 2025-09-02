import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayEndpoint, GatewayConfig } from '../../shared/entities';
import { CreateEndpointDto, UpdateEndpointDto, ReorderEndpointsDto } from './dto';

@Injectable()
export class EndpointsService {
  constructor(
    @InjectRepository(GatewayEndpoint)
    private readonly endpointRepo: Repository<GatewayEndpoint>,
    @InjectRepository(GatewayConfig)
    private readonly configRepo: Repository<GatewayConfig>,
  ) {}

  async findAll(configId: string) {
    const config = await this.configRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException(`Gateway configuration with ID ${configId} not found`);
    }

    const endpoints = await this.endpointRepo.find({
      where: { config: { id: configId } },
      order: { sequenceOrder: 'ASC' },
    });

    return endpoints;
  }

  async findOne(configId: string, endpointId: string): Promise<GatewayEndpoint> {
    const endpoint = await this.endpointRepo.findOne({
      where: {
        id: endpointId,
        config: { id: configId },
      },
      relations: ['config'],
    });

    if (!endpoint) {
      throw new NotFoundException(`Endpoint with ID ${endpointId} not found`);
    }

    return endpoint;
  }

  async create(configId: string, createEndpointDto: CreateEndpointDto): Promise<GatewayEndpoint> {
    const config = await this.configRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException(`Gateway configuration with ID ${configId} not found`);
    }

    // Check for duplicate path + method
    const existing = await this.endpointRepo.findOne({
      where: {
        config: { id: configId },
        method: createEndpointDto.method,
        path: createEndpointDto.path,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Endpoint ${createEndpointDto.method} ${createEndpointDto.path} already exists`,
      );
    }

    // Get next sequence order
    const maxOrder = await this.endpointRepo
      .createQueryBuilder('endpoint')
      .where('endpoint.config = :configId', { configId })
      .select('MAX(endpoint.sequenceOrder)', 'max')
      .getRawOne();

    const sequenceOrder = (maxOrder?.max || 0) + 10;

    const endpoint = this.endpointRepo.create({
      ...createEndpointDto,
      config,
      sequenceOrder,
    });

    return await this.endpointRepo.save(endpoint);
  }

  async update(
    configId: string,
    endpointId: string,
    updateEndpointDto: UpdateEndpointDto,
  ): Promise<GatewayEndpoint> {
    const endpoint = await this.findOne(configId, endpointId);

    // Check for duplicate path + method if they're being changed
    if (updateEndpointDto.method || updateEndpointDto.path) {
      const method = updateEndpointDto.method || endpoint.method;
      const path = updateEndpointDto.path || endpoint.path;

      const existing = await this.endpointRepo.findOne({
        where: {
          config: { id: configId },
          method,
          path,
        },
      });

      if (existing && existing.id !== endpointId) {
        throw new BadRequestException(`Endpoint ${method} ${path} already exists`);
      }
    }

    Object.assign(endpoint, updateEndpointDto);
    return await this.endpointRepo.save(endpoint);
  }

  async remove(configId: string, endpointId: string): Promise<void> {
    const endpoint = await this.findOne(configId, endpointId);
    endpoint.deletedAt = new Date();
    await this.endpointRepo.save(endpoint);
  }

  async reorder(configId: string, reorderDto: ReorderEndpointsDto): Promise<void> {
    const config = await this.configRepo.findOne({
      where: { id: configId },
    });

    if (!config) {
      throw new NotFoundException(`Gateway configuration with ID ${configId} not found`);
    }

    // Validate all endpoint IDs belong to this config
    const endpoints = await this.endpointRepo.find({
      where: { config: { id: configId } },
    });

    const endpointIds = new Set(endpoints.map((e) => e.id));
    const invalidIds = reorderDto.endpointIds.filter((id) => !endpointIds.has(id));

    if (invalidIds.length > 0) {
      throw new BadRequestException(`Invalid endpoint IDs: ${invalidIds.join(', ')}`);
    }

    // Update sequence orders
    for (let i = 0; i < reorderDto.endpointIds.length; i++) {
      await this.endpointRepo.update(
        { id: reorderDto.endpointIds[i] },
        { sequenceOrder: (i + 1) * 10 },
      );
    }
  }
}