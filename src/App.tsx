import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  PlusCircle, 
  MinusCircle, 
  LogOut, 
  TrendingUp, 
  TrendingDown, 
  Trash2, 
  User as UserIcon,
  CheckCircle,
  Lock,
  Mail,
  ArrowRight,
  PieChart as PieChartIcon,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Edit2,
  X,
  Plus,
  Loader2,
  ShoppingBag,
  Check,
  Square,
  RefreshCw
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { User, Transaction, Category, ShoppingItem } from './types';
import { supabase } from './lib/supabase';

const DEFAULT_EXPENSE_CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Lazer', 'Saúde', 'Educação', 'Outros'];
const DEFAULT_INCOME_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Outros'];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'signup' | 'forgot-password' | 'reset-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCharts, setShowCharts] = useState(true);

  // Dashboard State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Alimentação');
  
  // Edit State
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Category State
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'transactions' | 'shopping'>('transactions');

  // Shopping List State
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [newShoppingName, setNewShoppingName] = useState('');
  const [newShoppingAmount, setNewShoppingAmount] = useState('');
  const [isAddingShopping, setIsAddingShopping] = useState(false);
  const [editingShoppingItem, setEditingShoppingItem] = useState<ShoppingItem | null>(null);

  // Profile Edit State
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [profileTheme, setProfileTheme] = useState<'light' | 'dark'>('light');
  const [profileError, setProfileError] = useState<string | null>(null);

  // Filter State
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsArray = [];
    for (let i = currentYear - 5; i <= currentYear + 5; i++) {
      yearsArray.push(i);
    }
    return yearsArray;
  }, []);

  const allExpenseCategories = useMemo(() => categories.filter(c => c.type === 'expense').map(c => c.name), [categories]);
  const allIncomeCategories = useMemo(() => categories.filter(c => c.type === 'income').map(c => c.name), [categories]);

  // ── Auth: Verificar sessão existente ──────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthView('reset-password');
      } else if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setTransactions([]);
        setCategories([]);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      const loadedUser: User = {
        id: data.id,
        email: data.email,
        name: data.name,
        photoURL: data.photo_url || '',
        theme: data.theme || 'light',
      };
      setUser(loadedUser);
      setProfileName(data.name);
      setProfilePhoto(data.photo_url || '');
      setProfileTheme((data.theme as 'light' | 'dark') || 'light');
    } else if (error) {
      console.error('Erro ao carregar perfil:', error);
    }
    setAuthLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTransactions();
      fetchCategories();
      fetchShoppingItems();
    }
  }, [user]);

  useEffect(() => {
    if (type === 'expense') {
      setCategory(allExpenseCategories[0] || '');
    } else {
      setCategory(allIncomeCategories[0] || '');
    }
  }, [type, allExpenseCategories, allIncomeCategories]);

  // ── Transações ────────────────────────────────────────────────────────────
  const fetchTransactions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (data) setTransactions(data as Transaction[]);
    if (error) console.error('Erro ao buscar transações:', error);
  };

  const addTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !amount || !description) return;

    const now = new Date();
    let transactionDate: string;
    if (selectedMonth === now.getMonth() && selectedYear === now.getFullYear()) {
      transactionDate = now.toISOString().split('T')[0];
    } else {
      transactionDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description,
        amount: parseFloat(amount),
        type,
        category,
        date: transactionDate,
      })
      .select()
      .single();

    if (data) {
      setTransactions([data as Transaction, ...transactions]);
      setDescription('');
      setAmount('');
      showSuccess('Transação adicionada!');
    }
    if (error) console.error('Erro ao adicionar transação:', error);
  };

  const updateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    const { data, error } = await supabase
      .from('transactions')
      .update({
        description: editingTransaction.description,
        amount: editingTransaction.amount,
        category: editingTransaction.category,
        type: editingTransaction.type,
      })
      .eq('id', editingTransaction.id)
      .select()
      .single();

    if (data) {
      setTransactions(transactions.map(t => t.id === data.id ? data as Transaction : t));
      setEditingTransaction(null);
      showSuccess('Transação atualizada!');
    }
    if (error) console.error('Erro ao atualizar transação:', error);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (!error) {
      setTransactions(transactions.filter(t => t.id !== id));
    } else {
      console.error('Erro ao deletar transação:', error);
    }
  };

  // ── Categorias ────────────────────────────────────────────────────────────
  const fetchCategories = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setCategories(data as Category[]);
    } else if (!error) {
      // Inserir categorias padrão
      const defaults = [
        ...DEFAULT_EXPENSE_CATEGORIES.map(n => ({ user_id: user.id, name: n, type: 'expense' as const })),
        ...DEFAULT_INCOME_CATEGORIES.map(n => ({ user_id: user.id, name: n, type: 'income' as const })),
      ];
      const { data: inserted } = await supabase.from('categories').insert(defaults).select();
      if (inserted) setCategories(inserted as Category[]);
    }
    if (error) console.error('Erro ao buscar categorias:', error);
  };

  const addCategory = async () => {
    if (!user || !newCategoryName.trim()) return;
    const { data, error } = await supabase
      .from('categories')
      .insert({ user_id: user.id, name: newCategoryName.trim(), type })
      .select()
      .single();

    if (data) {
      setCategories([...categories, data as Category]);
      setNewCategoryName('');
    }
    if (error) console.error('Erro ao adicionar categoria:', error);
  };

  const updateCategory = async () => {
    if (!editingCategory) return;
    const { data, error } = await supabase
      .from('categories')
      .update({ name: editingCategory.name, type: editingCategory.type })
      .eq('id', editingCategory.id)
      .select()
      .single();

    if (data) {
      setCategories(categories.map(c => c.id === data.id ? data as Category : c));
      setEditingCategory(null);
    }
    if (error) console.error('Erro ao atualizar categoria:', error);
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (!error) setCategories(categories.filter(c => c.id !== id));
    else console.error('Erro ao deletar categoria:', error);
  };

  // ── Shopping List Actions ─────────────────────────────────────────────────
  const fetchShoppingItems = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setShoppingItems(data);
    else if (error) console.error('Erro ao buscar lista de compras:', error);
  };

  const addShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newShoppingName.trim()) return;

    const { error } = await supabase.from('shopping_items').insert({
      user_id: user.id,
      name: newShoppingName.trim(),
      amount: newShoppingAmount ? parseFloat(newShoppingAmount) : null,
      is_purchased: false
    });

    if (!error) {
      setNewShoppingName('');
      setNewShoppingAmount('');
      setIsAddingShopping(false);
      fetchShoppingItems();
      showSuccess('Item adicionado à lista!');
    }
  };

  const updateShoppingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShoppingItem || !editingShoppingItem.name.trim()) return;

    const { error } = await supabase
      .from('shopping_items')
      .update({ 
        name: editingShoppingItem.name.trim(),
        amount: editingShoppingItem.amount 
      })
      .eq('id', editingShoppingItem.id);

    if (!error) {
      setEditingShoppingItem(null);
      fetchShoppingItems();
      showSuccess('Item atualizado!');
    } else {
      console.error('Erro ao atualizar item:', error);
    }
  };

  const toggleShoppingItem = async (item: ShoppingItem) => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ is_purchased: !item.is_purchased })
      .eq('id', item.id);

    if (!error) fetchShoppingItems();
    else console.error('Erro ao atualizar item:', error);
  };

  const convertToTransaction = async (item: ShoppingItem) => {
    if (!user) return;
    
    // 1. Criar a transação
    const now = new Date();
    const transactionDate = now.toISOString().split('T')[0];
    
    const { error: transError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        description: `Compra: ${item.name}`,
        amount: item.amount || 0,
        type: 'expense',
        category: 'Outros', // Categoria padrão para conversões
        date: transactionDate,
      });

    if (transError) {
      console.error('Erro ao converter para transação:', transError);
      return;
    }

    // 2. Marcar item como comprado
    const { error: shopError } = await supabase
      .from('shopping_items')
      .update({ is_purchased: true })
      .eq('id', item.id);

    if (!shopError) {
      fetchShoppingItems();
      fetchTransactions();
      showSuccess('Convertido em despesa com sucesso!');
    } else {
      console.error('Erro ao marcar item como comprado:', shopError);
    }
  };

  const toggleFinancialType = async (item: ShoppingItem, financialType: 'income' | 'expense' | null) => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ financial_type: financialType })
      .eq('id', item.id);

    if (!error) {
      fetchShoppingItems();
      showSuccess(financialType ? `Item marcado como ${financialType === 'income' ? 'receita' : 'despesa'}!` : 'Marcação financeira removida!');
    } else {
      console.error('Erro ao atualizar marcação financeira:', error);
    }
  };

  const deleteShoppingItem = async (id: string) => {
    const { error } = await supabase.from('shopping_items').delete().eq('id', id);
    if (!error) fetchShoppingItems();
    else console.error('Erro ao deletar item:', error);
  };

  // ── Perfil ────────────────────────────────────────────────────────────────
  const updateProfileName = async () => {
    if (!user || !profileName.trim()) return;
    const { error } = await supabase
      .from('profiles')
      .update({ name: profileName.trim() })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, name: profileName.trim() });
      showSuccess('Nome atualizado com sucesso!');
    }
  };

  const updateProfilePhoto = async (photo: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ photo_url: photo })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, photoURL: photo });
      setProfilePhoto(photo);
      showSuccess(photo ? 'Foto de perfil atualizada!' : 'Foto de perfil removida!');
    }
  };

  const updateProfileTheme = async (theme: 'light' | 'dark') => {
    if (!user) return;
    const { error } = await supabase
      .from('profiles')
      .update({ theme })
      .eq('id', user.id);

    if (!error) {
      setUser({ ...user, theme });
      setProfileTheme(theme);
      showSuccess(`Tema ${theme === 'light' ? 'claro' : 'escuro'} aplicado!`);
    }
  };

  // ── Auth ──────────────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (authView === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError('E-mail ou senha incorretos');
    } else if (authView === 'signup') {
      if (!name.trim()) {
        setError('Por favor, insira seu nome');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message.includes('already') ? 'Este e-mail já está cadastrado' : error.message);
      } else if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          email,
          name: name.trim(),
          theme: 'light',
        });
        if (profileError) console.error('Erro ao criar perfil:', profileError);
      }
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      setError(error.message);
    } else {
      showSuccess('E-mail de recuperação enviado!');
      setAuthView('login');
    }
    setLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      showSuccess('Senha atualizada com sucesso!');
      setAuthView('login');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const [year, month] = t.date.split('-').map(Number);
      return (month - 1) === selectedMonth && year === selectedYear;
    });
  }, [transactions, selectedMonth, selectedYear]);

  const pieData = useMemo(() => {
    const expensesByCategory: Record<string, number> = {};
    filteredTransactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
      });
    const data = Object.entries(expensesByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return data.length > 0 ? data : [{ name: 'Sem despesas', value: 0 }];
  }, [filteredTransactions]);

  const annualData = useMemo(() => {
    const monthsAbbr = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const data = monthsAbbr.map((month) => ({ name: month, entradas: 0, saidas: 0 }));
    transactions.forEach(t => {
      const [year, month] = t.date.split('-').map(Number);
      if (year === selectedYear) {
        if (t.type === 'income') data[month - 1].entradas += t.amount;
        else data[month - 1].saidas += t.amount;
      }
    });
    return data;
  }, [transactions, selectedYear]);

  const annualTotals = useMemo(() => {
    return annualData.reduce((acc, curr) => ({
      entradas: acc.entradas + curr.entradas,
      saidas: acc.saidas + curr.saidas
    }), { entradas: 0, saidas: 0 });
  }, [annualData]);

  const totalIncome = useMemo(() => {
    const transactionIncome = filteredTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const shoppingIncome = shoppingItems.filter(i => i.financial_type === 'income').reduce((acc, i) => acc + (i.amount || 0), 0);
    return transactionIncome + shoppingIncome;
  }, [filteredTransactions, shoppingItems]);

  const totalExpense = useMemo(() => {
    const transactionExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
    const shoppingExpense = shoppingItems.filter(i => i.financial_type === 'expense').reduce((acc, i) => acc + (i.amount || 0), 0);
    return transactionExpense + shoppingExpense;
  }, [filteredTransactions, shoppingItems]);

  const balance = totalIncome - totalExpense;

  const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#10b981'];

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  // ── Login / Cadastro / Recuperação ────────────────────────────────────────
  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-4 font-sans dark:bg-zinc-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl w-full max-w-md border border-black/5 dark:bg-zinc-900 dark:border-zinc-800"
        >
          <div className="flex flex-col items-center mb-6 sm:mb-8 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-200 dark:shadow-none">
              <Wallet className="text-white w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white px-2">Controle Financeiro Waplay</h1>
            <p className="text-zinc-500 text-sm">
              {authView === 'login' && 'Bem-vindo de volta!'}
              {authView === 'signup' && 'Comece sua jornada financeira'}
              {authView === 'forgot-password' && 'Recupere seu acesso'}
              {authView === 'reset-password' && 'Defina sua nova senha'}
            </p>
          </div>

          <form 
            onSubmit={
              authView === 'forgot-password' ? handleForgotPassword : 
              authView === 'reset-password' ? handleUpdatePassword : 
              handleAuth
            } 
            className="space-y-4"
          >
            {authView === 'signup' && (
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 text-zinc-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Seu Nome"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            
            {(authView !== 'reset-password') && (
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-zinc-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="E-mail"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {(authView !== 'forgot-password') && (
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-zinc-400 w-5 h-5" />
                <input
                  type="password"
                  placeholder={authView === 'reset-password' ? "Nova Senha" : "Senha"}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {error && (
              <p className={`text-sm text-center ${error.includes('sucesso') || error.includes('enviado') ? 'text-emerald-600' : 'text-red-500'}`}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-zinc-900 text-white py-3 rounded-xl font-semibold hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 group disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {authView === 'login' && 'Entrar'}
                  {authView === 'signup' && 'Cadastrar'}
                  {authView === 'forgot-password' && 'Enviar E-mail'}
                  {authView === 'reset-password' && 'Salvar Nova Senha'}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            {authView === 'login' && (
              <>
                <button
                  onClick={() => { setAuthView('forgot-password'); setError(''); }}
                  className="block w-full text-sm text-zinc-500 hover:text-emerald-600 transition-colors"
                >
                  Esqueci minha senha
                </button>
                <button
                  onClick={() => { setAuthView('signup'); setError(''); }}
                  className="text-sm text-zinc-600 hover:text-emerald-600 font-medium transition-colors"
                >
                  Não tem uma conta? Cadastre-se
                </button>
              </>
            )}

            {authView === 'signup' && (
              <button
                onClick={() => { setAuthView('login'); setError(''); }}
                className="text-sm text-zinc-600 hover:text-emerald-600 font-medium transition-colors"
              >
                Já tem uma conta? Faça login
              </button>
            )}

            {(authView === 'forgot-password' || authView === 'reset-password') && (
              <button
                onClick={() => { setAuthView('login'); setError(''); }}
                className="text-sm text-zinc-600 hover:text-emerald-600 font-medium transition-colors"
              >
                Voltar para o login
              </button>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen font-sans pb-20 transition-colors duration-300 ${profileTheme === 'dark' ? 'bg-zinc-950 text-zinc-100' : 'bg-[#F5F5F4] text-zinc-900'}`}>
      {/* Header */}
      <header className={`${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'} border-b sticky top-0 z-20`}>
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Wallet className="text-white w-5 h-5" />
              </div>
              <span className={`font-bold hidden lg:inline truncate ${profileTheme === 'dark' ? 'text-white' : 'text-zinc-900'}`}>Controle Financeiro Waplay</span>
            </div>
            
            <nav className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'transactions' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Finanças
              </button>
              <button
                onClick={() => setActiveTab('shopping')}
                className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'shopping' ? 'bg-white dark:bg-zinc-700 shadow-sm text-emerald-600' : 'text-zinc-500 hover:text-zinc-700'}`}
              >
                Lista
              </button>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => {
                setProfileName(user.name);
                setProfilePhoto(user.photoURL || '');
                setProfileTheme((user.theme as 'light' | 'dark') || 'light');
                setProfileError(null);
                setShowProfile(true);
              }}
              className="flex items-center gap-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 p-1 pr-3 rounded-full transition-colors"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-black/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center justify-center">
                  <UserIcon className="w-4 h-4 text-zinc-500" />
                </div>
              )}
              <span className="text-sm font-medium hidden sm:inline">{user.name}</span>
            </button>
            <button 
              onClick={handleLogout}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-lg font-bold flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Profile Modal */}
        <AnimatePresence>
          {showProfile && (
            <div 
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowProfile(false);
              }}
            >
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                className={`${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-black/5 text-zinc-900'} p-6 sm:p-8 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-lg border relative max-h-[90vh] overflow-y-auto`}
              >
                <button 
                  onClick={() => setShowProfile(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <UserIcon className="w-6 h-6 text-emerald-500" />
                  Seu Perfil
                </h2>

                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative group">
                      {profilePhoto ? (
                        <img src={profilePhoto} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-emerald-500/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 rounded-full flex items-center justify-center border-4 border-dashed border-zinc-300 dark:border-zinc-700">
                          <UserIcon className="w-10 h-10 text-zinc-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {profileError && (
                    <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-xl">
                      {profileError}
                    </p>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Nome</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          className={`flex-1 px-4 py-2 rounded-xl border focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                          value={profileName}
                          onChange={(e) => setProfileName(e.target.value)}
                        />
                        <button
                          onClick={updateProfileName}
                          className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Foto do Perfil</label>
                      <div className="flex items-center gap-2">
                        <label className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl border cursor-pointer hover:opacity-80 transition-all ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}>
                          <Plus className="w-4 h-4 text-emerald-500" />
                          <span className="text-sm font-medium">Importar da Galeria</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  updateProfilePhoto(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                        {profilePhoto && (
                          <button 
                            onClick={() => updateProfilePhoto('')}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Remover foto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">Escolha uma imagem do seu dispositivo para o seu perfil.</p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1 block">Tema</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => updateProfileTheme('light')}
                          className={`py-2 rounded-xl border font-semibold transition-all ${profileTheme === 'light' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent border-zinc-200 dark:border-zinc-700'}`}
                        >
                          Claro
                        </button>
                        <button
                          onClick={() => updateProfileTheme('dark')}
                          className={`py-2 rounded-xl border font-semibold transition-all ${profileTheme === 'dark' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-transparent border-zinc-200 dark:border-zinc-700'}`}
                        >
                          Escuro
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        <AnimatePresence mode="wait">
          {activeTab === 'transactions' ? (
            <motion.div
              key="transactions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6 items-start"
            >
              <div className="space-y-6">
                {/* Month/Year Selector */}
                <div className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    <h2 className="font-bold">Período</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={selectedMonth} 
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className={`px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                    >
                      {months.map((m, i) => (
                        <option key={m} value={i}>{m}</option>
                      ))}
                    </select>
                    <select 
                      value={selectedYear} 
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className={`px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-medium ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                    >
                      {years.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className="bg-zinc-900 p-5 sm:p-6 rounded-3xl text-white shadow-xl flex flex-col justify-center"
                  >
                    <p className="text-zinc-400 text-[10px] sm:text-xs mb-1 uppercase tracking-wider font-semibold">Saldo {months[selectedMonth]}</p>
                    <h2 className="text-2xl sm:text-3xl font-bold">R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -4 }}
                    className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}
                  >
                    <div className="flex items-center gap-2 text-emerald-600 mb-1">
                      <TrendingUp className="w-4 h-4" />
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Receitas</p>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold">R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                  </motion.div>

                  <motion.div 
                    whileHover={{ y: -4 }}
                    className={`p-5 sm:p-6 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}
                  >
                    <div className="flex items-center gap-2 text-red-500 mb-1">
                      <TrendingDown className="w-4 h-4" />
                      <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold">Despesas</p>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-bold">R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h2>
                  </motion.div>
                </div>

                {/* Add Transaction Form */}
                <section className={`p-6 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      <PlusCircle className="w-5 h-5 text-emerald-500" />
                      Nova Transação
                    </h3>
                    <button 
                      onClick={() => setShowAddCategory(!showAddCategory)}
                      className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Gerenciar Categorias
                    </button>
                  </div>

                  <AnimatePresence>
                    {showAddCategory && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className={`mb-4 p-4 rounded-2xl border ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-emerald-50 border-emerald-100'}`}
                      >
                        <div className="flex flex-col gap-4 mb-4">
                          <div className="flex items-center gap-4">
                            <input
                              type="text"
                              placeholder="Nome da Categoria"
                              className={`flex-1 px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 border ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-emerald-200'}`}
                              value={editingCategory ? editingCategory.name : newCategoryName}
                              onChange={(e) => editingCategory ? setEditingCategory({...editingCategory, name: e.target.value}) : setNewCategoryName(e.target.value)}
                            />
                            <button
                              onClick={editingCategory ? updateCategory : addCategory}
                              className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                            >
                              {editingCategory ? 'Salvar' : 'Adicionar'}
                            </button>
                            {editingCategory && (
                              <button
                                onClick={() => setEditingCategory(null)}
                                className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 px-4 py-2 rounded-xl font-semibold hover:opacity-80 transition-all"
                              >
                                Cancelar
                              </button>
                            )}
                            <button onClick={() => setShowAddCategory(false)} className="text-zinc-400">
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                          {editingCategory && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingCategory({...editingCategory, type: 'income'})}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${editingCategory.type === 'income' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
                              >
                                Receita
                              </button>
                              <button
                                onClick={() => setEditingCategory({...editingCategory, type: 'expense'})}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all ${editingCategory.type === 'expense' ? 'bg-red-500 text-white border-red-500' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-500'}`}
                              >
                                Despesa
                              </button>
                            </div>
                          )}
                        </div>

                        {categories.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Suas Categorias</p>
                            <div className="flex flex-wrap gap-2">
                              {categories.map((c) => (
                                <div key={c.id} className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-200'}`}>
                                  <span className={c.type === 'income' ? 'text-emerald-500' : 'text-red-500'}>●</span>
                                  {c.name}
                                  <div className="flex items-center gap-1 ml-1 border-l pl-2 border-zinc-200 dark:border-zinc-700">
                                    <button onClick={() => setEditingCategory(c)} className="text-zinc-400 hover:text-emerald-500 transition-colors">
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                    <button onClick={() => deleteCategory(c.id)} className="text-zinc-400 hover:text-red-500 transition-colors">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={addTransaction} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                    <input
                      type="text"
                      placeholder="Descrição"
                      className={`px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Valor (R$)"
                      step="0.01"
                      className={`px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                    <select
                      className={`px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={type}
                      onChange={(e) => setType(e.target.value as 'income' | 'expense')}
                    >
                      <option value="expense">Despesa</option>
                      <option value="income">Receita</option>
                    </select>
                    <select
                      className={`px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {type === 'expense' 
                        ? allExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)
                        : allIncomeCategories.map(c => <option key={c} value={c}>{c}</option>)
                      }
                    </select>
                    <button
                      type="submit"
                      className="bg-emerald-500 text-white py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors sm:col-span-2 lg:col-span-1"
                    >
                      Adicionar
                    </button>
                  </form>
                </section>

                {/* Transactions List */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base sm:text-lg font-bold">Histórico de {months[selectedMonth]}</h3>
                    <div className="flex gap-2">
                      <div className={`flex items-center gap-1 text-[10px] sm:text-xs px-3 py-1 rounded-full border ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-zinc-400' : 'bg-white border-black/5 text-zinc-500'}`}>
                        <Calendar className="w-3 h-3" />
                        {months[selectedMonth]} {selectedYear}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {filteredTransactions.length === 0 ? (
                        <div className={`text-center py-12 rounded-3xl border border-dashed ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
                          <PieChartIcon className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                          <p className="text-zinc-500 text-sm">Nenhuma transação encontrada</p>
                        </div>
                      ) : (
                        filteredTransactions.map((t) => (
                          <motion.div
                            key={t.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`p-4 rounded-2xl border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between group gap-4 ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}
                          >
                            {editingTransaction?.id === t.id ? (
                              <form onSubmit={updateTransaction} className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <input
                                  type="text"
                                  className={`px-3 py-1.5 border rounded-lg text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                                  value={editingTransaction.description}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, description: e.target.value})}
                                />
                                <input
                                  type="number"
                                  step="0.01"
                                  className={`px-3 py-1.5 border rounded-lg text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                                  value={editingTransaction.amount}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, amount: parseFloat(e.target.value)})}
                                />
                                <select
                                  className={`px-3 py-1.5 border rounded-lg text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                                  value={editingTransaction.category}
                                  onChange={(e) => setEditingTransaction({...editingTransaction, category: e.target.value})}
                                >
                                  {editingTransaction.type === 'expense' 
                                    ? allExpenseCategories.map(c => <option key={c} value={c}>{c}</option>)
                                    : allIncomeCategories.map(c => <option key={c} value={c}>{c}</option>)
                                  }
                                </select>
                                <div className="flex gap-2">
                                  <button type="submit" className="flex-1 bg-emerald-500 text-white rounded-lg text-sm font-bold">Salvar</button>
                                  <button onClick={() => setEditingTransaction(null)} className={`p-2 rounded-lg ${profileTheme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}><X className="w-4 h-4" /></button>
                                </div>
                              </form>
                            ) : (
                              <>
                                <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                    {t.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="font-semibold text-sm sm:text-base truncate">{t.description}</p>
                                      <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wider shrink-0 ${profileTheme === 'dark' ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                                        {t.category}
                                      </span>
                                    </div>
                                    <p className="text-[10px] sm:text-xs text-zinc-500">{new Date(t.date + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                  </div>
                                </div>
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4">
                                  <span className={`font-bold text-sm sm:text-base ${t.type === 'income' ? 'text-emerald-600' : 'text-red-500'}`}>
                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                  <div className="flex items-center gap-1 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setEditingTransaction(t)}
                                      className={`p-2 rounded-lg transition-all ${profileTheme === 'dark' ? 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                    >
                                      <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => deleteTransaction(t.id)}
                                      className={`p-2 rounded-lg transition-all ${profileTheme === 'dark' ? 'text-zinc-400 hover:text-red-500 hover:bg-red-500/10' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50'}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                </section>
              </div>

              {/* Sidebar - Charts and Summaries */}
              <aside className="space-y-6 xl:sticky xl:top-[88px] order-first xl:order-last">
                <section className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-6 self-start">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                    Análise por Categoria
                  </h3>
                  <div className="h-[250px] w-full flex flex-col items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value">
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: profileTheme === 'dark' ? '#18181b' : '#fff', color: profileTheme === 'dark' ? '#fff' : '#000' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-4 w-full">
                      {pieData.slice(0, 4).map((entry, index) => (
                        <div key={entry.name} className="flex items-center gap-2 text-[10px] font-medium text-zinc-500">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                          <span className="truncate">{entry.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className={`p-6 rounded-3xl border shadow-sm flex flex-col items-center ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-6 self-start">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Histórico Anual
                  </h3>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={annualData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={profileTheme === 'dark' ? '#27272a' : '#f0f0f0'} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#71717a' }} />
                        <YAxis hide />
                        <Tooltip 
                          formatter={(value: number) => `R$ ${value.toLocaleString('pt-BR')}`}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: profileTheme === 'dark' ? '#18181b' : '#fff', color: profileTheme === 'dark' ? '#fff' : '#000' }}
                        />
                        <Bar dataKey="entradas" fill="#10b981" radius={[4, 4, 0, 0]} name="Entradas" />
                        <Bar dataKey="saidas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Saídas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 flex flex-col w-full gap-2">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Total Entradas</span>
                      <span className="text-emerald-500">R$ {annualTotals.entradas.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className="text-zinc-500">Total Saídas</span>
                      <span className="text-red-500">R$ {annualTotals.saidas.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                </section>
              </aside>
            </motion.div>
          ) : (
            <motion.div
              key="shopping"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid grid-cols-1 xl:grid-cols-[1fr_390px] gap-6 items-start"
            >
              <div className="space-y-6">
                {/* Shopping List Form */}
                <section className={`p-6 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <ShoppingBag className="w-5 h-5 text-emerald-500" />
                    Lista de Compras e Gastos
                  </h3>
                  <form onSubmit={addShoppingItem} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <input
                      type="text"
                      placeholder="O que você precisa comprar/pagar?"
                      className={`flex-1 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={newShoppingName}
                      onChange={(e) => setNewShoppingName(e.target.value)}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Valor est. (Opcional)"
                      step="0.01"
                      className={`w-full sm:w-40 px-4 py-2.5 border rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                      value={newShoppingAmount}
                      onChange={(e) => setNewShoppingAmount(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors shrink-0"
                    >
                      Adicionar
                    </button>
                  </form>
                </section>

                {/* Shopping List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold">Itens na Lista</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Filtrar:</span>
                      <button className="text-[10px] font-bold text-emerald-600">Todos</button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                    {shoppingItems.length === 0 ? (
                      <div className={`text-center py-12 rounded-3xl border border-dashed ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'}`}>
                        <ShoppingBag className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
                        <p className="text-zinc-500 text-sm">Sua lista está vazia. Comece adicionando algo!</p>
                      </div>
                    ) : (
                      shoppingItems.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={`p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-4 transition-all ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'} ${item.is_purchased ? 'opacity-60 grayscale-[0.5]' : ''}`}
                        >
                          {editingShoppingItem?.id === item.id ? (
                            <form onSubmit={updateShoppingItem} className="flex-1 flex flex-col sm:flex-row gap-3">
                              <input
                                type="text"
                                className={`flex-1 px-3 py-1.5 border rounded-lg text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                                value={editingShoppingItem.name}
                                onChange={(e) => setEditingShoppingItem({...editingShoppingItem, name: e.target.value})}
                                autoFocus
                              />
                              <input
                                type="number"
                                step="0.01"
                                className={`w-full sm:w-32 px-3 py-1.5 border rounded-lg text-sm ${profileTheme === 'dark' ? 'bg-zinc-800 border-zinc-700' : 'bg-zinc-50 border-zinc-200'}`}
                                value={editingShoppingItem.amount || ''}
                                onChange={(e) => setEditingShoppingItem({...editingShoppingItem, amount: e.target.value ? parseFloat(e.target.value) : null})}
                              />
                              <div className="flex gap-2">
                                <button type="submit" className="flex-1 bg-emerald-500 text-white px-4 rounded-lg text-sm font-bold">Salvar</button>
                                <button onClick={() => setEditingShoppingItem(null)} className={`p-2 rounded-lg ${profileTheme === 'dark' ? 'bg-zinc-800' : 'bg-zinc-100'}`}><X className="w-4 h-4" /></button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="flex items-center gap-3 sm:gap-4 flex-1">
                                <button 
                                  onClick={() => toggleShoppingItem(item)}
                                  className={`transition-all shrink-0 active:scale-95 ${item.is_purchased ? 'text-emerald-500' : 'text-zinc-400'}`}
                                >
                                  {item.is_purchased ? <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 fill-emerald-500 text-white" /> : <Square className="w-5 h-5 sm:w-6 sm:h-6" />}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-sm sm:text-base truncate ${item.is_purchased ? 'line-through text-zinc-500' : ''}`}>
                                    {item.name}
                                  </p>
                                  {item.amount && (
                                    <p className="text-[10px] sm:text-xs text-zinc-500 font-medium">Est: R$ {item.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 group-hover:opacity-100 transition-opacity">
                                {!item.is_purchased && (
                                  <>
                                    <button 
                                      onClick={() => toggleFinancialType(item, 'income')}
                                      className={`p-2 rounded-xl transition-all ${item.financial_type === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}
                                      title="Marcar como receita"
                                    >
                                      <PlusCircle className="w-4 h-4" />
                                    </button>
                                    <button 
                                      onClick={() => toggleFinancialType(item, 'expense')}
                                      className={`p-2 rounded-xl transition-all ${item.financial_type === 'expense' ? 'bg-red-500 text-white shadow-lg' : 'text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'}`}
                                      title="Marcar como despesa"
                                    >
                                      <MinusCircle className="w-4 h-4" />
                                    </button>
                                    {item.financial_type && (
                                      <button 
                                        onClick={() => toggleFinancialType(item, null)}
                                        className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all"
                                        title="Remover marcação"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button 
                                      onClick={() => convertToTransaction(item)}
                                      className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                      title="Converter em despesa permanente"
                                    >
                                      <RefreshCw className="w-4 h-4" />
                                    </button>
                                  </>
                                )}
                                <button 
                                  onClick={() => setEditingShoppingItem(item)}
                                  className="p-2 text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => deleteShoppingItem(item.id)}
                                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </>
                          )}
                        </motion.div>
                      ))
                    )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Sidebar - Shopping Summary */}
              <aside className="space-y-6 xl:sticky xl:top-[88px] order-first xl:order-last">
                <section className={`p-6 rounded-3xl border shadow-sm ${profileTheme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-black/5'}`}>
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    Resumo da Lista
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Progresso</p>
                        <p className="text-2xl font-bold">{Math.round((shoppingItems.filter(i => i.is_purchased).length / (shoppingItems.length || 1)) * 100)}%</p>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Concluídos</p>
                        <p className="text-lg font-bold text-emerald-500">{shoppingItems.filter(i => i.is_purchased).length} / {shoppingItems.length}</p>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(shoppingItems.filter(i => i.is_purchased).length / (shoppingItems.length || 1)) * 100}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-2">Total Estimado (Pendente)</p>
                      <h4 className="text-xl font-bold text-emerald-600">
                        R$ {shoppingItems.filter(i => !i.is_purchased).reduce((acc, curr) => acc + (curr.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2 font-medium">
                        <PlusCircle className="w-4 h-4 shrink-0" />
                        Dica: Converta itens em despesas reais usando o ícone <RefreshCw className="w-3 h-3 inline" /> para atualizar seu saldo!
                      </p>
                    </div>
                  </div>
                </section>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
