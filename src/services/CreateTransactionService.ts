import { getCustomRepository, getRepository } from 'typeorm';
import AppError from '../errors/AppError';
import Category from '../models/Category';
import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

interface CreateTransactionServiceDTO {
  title: string;
  value: number;
  type: 'income' | 'outcome' | undefined;
  category: string;
}
class CreateTransactionService {
  public async execute({
    title,
    type,
    value,
    category,
  }: CreateTransactionServiceDTO): Promise<Transaction> {
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoryRepository = getRepository(Category);

    const { total } = await transactionRepository.getBalance();
    if (type === 'outcome' && total < value) {
      throw new AppError('not enough balance');
    }
    let categoryFound = await categoryRepository.findOne({
      where: { title: category },
    });
    if (!categoryFound) {
      categoryFound = categoryRepository.create({ title: category });
      await categoryRepository.save(categoryFound);
    }
    const newTransaction = transactionRepository.create({
      title,
      type,
      value,
      category: categoryFound,
    });
    await transactionRepository.save(newTransaction);
    return newTransaction;
  }
}

export default CreateTransactionService;
