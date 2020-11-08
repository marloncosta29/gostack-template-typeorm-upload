/* eslint-disable no-useless-return */
import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransaction {
  title: string;
  type: string;
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    const readCSVStream = fs.createReadStream(filePath);
    const transactionRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });
    const parseCSV = readCSVStream.pipe(parseStream);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );
      if (!title || !type || !value || !category) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });
    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    const categoriesFound = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });
    const existentCategoriesTitles = categoriesFound.map(
      (category: Category) => category.title,
    );
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);
    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );
    console.log(newCategories, categoriesFound, transactions);
    await categoriesRepository.save(newCategories);
    const finalCategories = [...newCategories, ...categoriesFound];
    const createTransactions = transactionRepository.create(
      transactions.map(t => {
        console.log(
          finalCategories.find(c => {
            console.log({ c, t });
            return c.title === t.title;
          }),
        );
        return {
          title: t.title,
          type: t.type,
          value: t.value,
          category: finalCategories.find(c => c.title === t.category),
        };
      }),
    );
    await transactionRepository.save(createTransactions);
    await fs.promises.unlink(filePath);
    return createTransactions;
  }
}

export default ImportTransactionsService;
