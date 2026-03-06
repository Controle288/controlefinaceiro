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
