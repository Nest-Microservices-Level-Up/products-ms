import {
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from 'generated/prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PaginationDto } from 'src/common';
import { RpcException } from '@nestjs/microservices';
import { envs } from 'src/config';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  constructor() {
    const adapter = new PrismaBetterSqlite3({ url: envs.databaseUrl });
    super({ adapter });
  }

  private readonly logger = new Logger(`productService`);

  onModuleInit() {
    this.$connect();
    this.logger.log(`Database connected`);
  }

  create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;

    const totalPages = await this.product.count({ where: { available: true} });
    const lastPage = Math.ceil(totalPages / limit);

    const skip = (page - 1) * limit;
    const take = limit;

    return {
      data: await this.product.findMany({
        skip,
        take,
        where: {
          available: true
        }
      }),
      meta: {
        total: totalPages,
        page: page,
        lastPage: lastPage,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.product.findFirst({
      where: { id: id, available: true },
    });

    if (!product) {
      throw new RpcException({
        status: HttpStatus.NOT_FOUND,
        message: `User with id # ${id} not found`
      });
    }

    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {

    const { id: __, ...data } = updateProductDto;

    await this.findOne(id);

    return this.product.update({
      where: { id: id },
      data: data,
    });
  }

  async remove(id: number) {

    await this.findOne(id);

    const product = this.product.update({
      where: { id: id },
      data: {
        available: false
      }
    });

    return product
  }

  async validateProducts(ids: number[]){

    ids = Array.from( new Set(ids)  );

    const products = await this.product.findMany({
      where: { id: { in: ids } }
    });

    if( products.length !== ids.length ){
        throw new RpcException({
          message: "Some products were not found",
          status: HttpStatus.BAD_REQUEST
        })
    }

    return products;
    
  }
}
