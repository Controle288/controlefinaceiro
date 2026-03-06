export interface User {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
  theme?: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: 'income' | 'expense';
}
export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  amount: number | null;
  is_purchased: boolean;
  category: string | null;
  created_at: string;
  financial_type?: 'income' | 'expense' | null;
}

export type RecurrencePeriod = 'Mensal' | 'Bimestral' | 'Trimestral' | 'Semestral' | 'Anual';

export interface RecurringCharge {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  start_date: string;
  due_date: string;
  recurrence_period: RecurrencePeriod;
  reminder_days: number[];
  last_processed_date: string | null;
  created_at: string;
}
