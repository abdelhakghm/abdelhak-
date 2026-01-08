
export interface CashRecord {
  id: string;
  user_id: string;
  amount: number;
  updated_at: string;
}

export interface Income {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  source: string;
  date: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  created_at: string;
}

export interface Person {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  person_id: string;
  amount: number;
  type: 'owe_me' | 'i_owe';
  date: string;
  person?: Person;
}

export interface SavingsGoal {
  id: string;
  user_id: string;
  name: string;
  target_amount: number;
  monthly_amount: number;
  saved_amount: number;
  start_date: string;
  last_deduction_date: string | null;
  status: 'active' | 'completed';
}

export interface DashboardStats {
  totalCash: number;
  totalIncome: number;
  totalExpenses: number;
  totalOwedToMe: number;
  totalIOwe: number;
  netBalance: number;
  totalSavings: number;
}
