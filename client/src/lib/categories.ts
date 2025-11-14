// Category definitions with icon mappings for Quick Deals
// Using Lucide React icons for consistency and styling flexibility

import {
  Utensils,
  Car,
  Home,
  Film,
  HeartPulse,
  Zap,
  Sparkles,
  BookOpen,
  ShoppingBag,
  MoreHorizontal,
  DollarSign,
  Briefcase,
  TrendingUp,
  Wallet,
  type LucideIcon
} from "lucide-react";

export interface Category {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

export const EXPENSE_CATEGORIES: Category[] = [
  { id: "food", name: "Food & Dining", icon: Utensils, color: "text-orange-600" },
  { id: "transportation", name: "Transport", icon: Car, color: "text-blue-600" },
  { id: "shopping", name: "Shopping", icon: ShoppingBag, color: "text-purple-600" },
  { id: "entertainment", name: "Entertainment", icon: Film, color: "text-pink-600" },
  { id: "housing", name: "Housing", icon: Home, color: "text-amber-700" },
  { id: "healthcare", name: "Healthcare", icon: HeartPulse, color: "text-red-600" },
  { id: "utilities", name: "Utilities", icon: Zap, color: "text-yellow-600" },
  { id: "personal_care", name: "Personal Care", icon: Sparkles, color: "text-rose-600" },
  { id: "education", name: "Education", icon: BookOpen, color: "text-indigo-600" },
  { id: "other_expense", name: "Other", icon: MoreHorizontal, color: "text-gray-600" },
];

export const INCOME_CATEGORIES: Category[] = [
  { id: "salary", name: "Salary", icon: DollarSign, color: "text-green-600" },
  { id: "business", name: "Business", icon: Briefcase, color: "text-blue-600" },
  { id: "investment_income", name: "Investment", icon: TrendingUp, color: "text-purple-600" },
  { id: "other_income", name: "Other Income", icon: Wallet, color: "text-emerald-600" },
];

export function getCategoryById(id: string): Category | undefined {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(cat => cat.id === id);
}

export function getCategoryIcon(id: string): LucideIcon {
  return getCategoryById(id)?.icon || MoreHorizontal;
}

export function getCategoryName(id: string): string {
  return getCategoryById(id)?.name || "Other";
}

export function getCategoryColor(id: string): string {
  return getCategoryById(id)?.color || "text-gray-600";
}
