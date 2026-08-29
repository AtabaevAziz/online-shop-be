import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    // Nest transforms request JSON into a validated DTO before the service handles it.
    return this.productsService.create(dto);
  }

  @Get()
  findAll(): Promise<ProductResponseDto[]> {
    return this.productsService.findAll();
  }

  @Get('demo/timeout')
  demoTimeout(): Promise<{ status: 'completed'; waitedMs: number }> {
    return this.productsService.demoTimeout();
  }

  @Get('slug/:slug')
  findOneBySlug(@Param('slug') slug: string): Promise<ProductResponseDto> {
    return this.productsService.findOneBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string): Promise<ProductResponseDto> {
    return this.productsService.remove(id);
  }
}
