import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Balance> {
    const transactions = await this.find();
    let income = 0;
    let outcome = 0;

    transactions.map(t => {
      if (t.type === 'income') {
        income += t.value;
      }
      if (t.type === 'outcome') {
        outcome += t.value;
      }
      return t;
    });
    return { income, outcome, total: income - outcome };
  }
}

export default TransactionsRepository;
