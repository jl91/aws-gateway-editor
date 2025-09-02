import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GatewayConfig } from '../../shared/entities';
import { CreateGatewayDto, UpdateGatewayDto } from './dto';
import * as crypto from 'crypto';

@Injectable()
export class GatewayService {
  constructor(
    @InjectRepository(GatewayConfig)
    private readonly gatewayConfigRepo: Repository<GatewayConfig>,
  ) {}

  async findAll(page = 1, limit = 10) {
    const [configs, total] = await this.gatewayConfigRepo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: configs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<GatewayConfig> {
    const config = await this.gatewayConfigRepo.findOne({
      where: { id },
      relations: ['endpoints'],
    });

    if (!config) {
      throw new NotFoundException(`Gateway configuration with ID ${id} not found`);
    }

    // Sort endpoints by sequence order
    if (config.endpoints) {
      config.endpoints.sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    }

    return config;
  }

  async create(createGatewayDto: CreateGatewayDto): Promise<GatewayConfig> {
    const fileHash = this.generateHash(JSON.stringify(createGatewayDto));

    // Check if configuration with same hash already exists
    const existing = await this.gatewayConfigRepo.findOne({
      where: { fileHash },
    });

    if (existing) {
      throw new ConflictException('A configuration with the same content already exists');
    }

    const config = this.gatewayConfigRepo.create({
      ...createGatewayDto,
      fileHash,
    });

    return await this.gatewayConfigRepo.save(config);
  }

  async update(id: string, updateGatewayDto: UpdateGatewayDto): Promise<GatewayConfig> {
    const config = await this.findOne(id);

    // Update fields
    Object.assign(config, updateGatewayDto);

    // Recalculate hash if content changed
    if (updateGatewayDto.name || updateGatewayDto.version || updateGatewayDto.description) {
      config.fileHash = this.generateHash(JSON.stringify(config));
    }

    return await this.gatewayConfigRepo.save(config);
  }

  async remove(id: string): Promise<void> {
    const config = await this.findOne(id);
    config.deletedAt = new Date();
    await this.gatewayConfigRepo.save(config);
  }

  async activate(id: string): Promise<GatewayConfig> {
    // Deactivate all other configurations
    await this.gatewayConfigRepo.update(
      {},
      { isActive: false },
    );

    // Activate the selected configuration
    const config = await this.findOne(id);
    config.isActive = true;
    return await this.gatewayConfigRepo.save(config);
  }

  async deactivate(id: string): Promise<GatewayConfig> {
    const config = await this.findOne(id);
    config.isActive = false;
    return await this.gatewayConfigRepo.save(config);
  }

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}