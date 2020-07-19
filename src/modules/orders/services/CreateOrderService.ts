import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Invalid customer.');
    }

    const findProducts = await this.productsRepository.findAllById(products);

    if (!findProducts) {
      throw new AppError('Invalid products.');
    }

    if (findProducts.length !== products.length) {
      throw new AppError('Invalid products.');
    }

    const productsList = findProducts.map(findProduct => {
      const productList = products.find(
        product => product.id === findProduct.id,
      );

      if (!productList) {
        throw new AppError('Invalid product.');
      }

      if (findProduct.quantity < productList.quantity) {
        throw new AppError('Product with insufficient quantity.');
      }

      return {
        product_id: findProduct.id,
        price: findProduct.price,
        quantity: productList.quantity,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: productsList,
    });

    await this.productsRepository.updateQuantity(products);

    return order;
  }
}

export default CreateOrderService;
