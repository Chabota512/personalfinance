import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Account, Transaction, Budget, Goal } from "@shared/schema";
import { apiRequest, fetchApi } from "./queryClient";

// API error handler
function handleApiError(error: any): never {
  const message = error?.message || 'An unexpected error occurred';
  throw new Error(message);
}

// ============= Types =============
interface LoginCredentials {
  username: string;
  password: string;
}

interface RegisterData {
  username: string;
  email: string;
  password: string;
}

// ============= Auth API =============
export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterData) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

// ============= User API =============
export function useCurrentUser() {
  return useQuery({
    queryKey: ["/api/users/me"],
    retry: false,
    // Add error handling for the query
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/me");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/users/me", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/me"] });
    },
  });
}

export function useUserPreferences() {
  return useQuery({
    queryKey: ["/api/users/preferences"],
    // Add error handling for the query
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/users/preferences");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (settings: any) => {
      const res = await apiRequest("PUT", "/api/users/preferences", { settings });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users/preferences"] });
    },
  });
}

// ============= Accounts API =============
export function useAccounts() {
  return useQuery({
    queryKey: ["/api/accounts"],
    // Add error handling for the query
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/accounts");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ["/api/accounts", id],
    enabled: !!id,
    // Add error handling for the query
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounts/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/accounts", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/accounts/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/accounts/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

// ============= Transactions API =============
export function useTransactions(limit = 100) {
  return useQuery({
    queryKey: ["/api/transactions", { limit }],
    queryFn: async () => {
      const res = await fetch(`/api/transactions?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
  });
}

export function useTransactionsByDateRange(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["/api/transactions/range", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const res = await fetch(
        `/api/transactions/range?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ["/api/transactions", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/transactions", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/transactions/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/transactions/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics"] });
    },
  });
}

// ============= Budgets API =============
export function useBudgets() {
  return useQuery({
    queryKey: ["/api/budgets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/budgets");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useActiveBudgets() {
  return useQuery({
    queryKey: ["/api/budgets/active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/budgets/active");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useBudget(id: string) {
  return useQuery({
    queryKey: ["/api/budgets", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/budgets/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/budgets", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/budgets/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/budgets/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/budgets"] });
    },
  });
}

export function useBudgetSpending(budgetId: string) {
  return useQuery({
    queryKey: ["/api/budgets", budgetId, "spending"],
    queryFn: async () => {
      const res = await fetch(`/api/budgets/${budgetId}/spending`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    enabled: !!budgetId,
  });
}

// ============= Goals API =============
export function useGoals() {
  return useQuery({
    queryKey: ["/api/goals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/goals");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useActiveGoals() {
  return useQuery({
    queryKey: ["/api/goals/active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/goals/active");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: ["/api/goals", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/goals/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/goals", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/goals/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/goals/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function usePauseGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/goals/${id}/pause`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useResumeGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/goals/${id}/resume`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useCancelGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/goals/${id}/cancel`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useContributeToGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      const res = await apiRequest("POST", `/api/goals/${id}/contribute`, { amount });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useStartBoostWeek() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/goals/${id}/boost-week`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

export function useCloneGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, multiplier }: { id: string; multiplier?: number }) => {
      const res = await apiRequest("POST", `/api/goals/${id}/clone`, { multiplier });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
  });
}

// ============= Analytics API =============
export function useFinancialHealthScore() {
  return useQuery({
    queryKey: ["/api/analytics/health-score"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/health-score");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useNetWorth() {
  return useQuery({
    queryKey: ["/api/analytics/net-worth"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/net-worth");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useNetWorthHistory(months: number = 12) {
  return useQuery({
    queryKey: ["/api/analytics/net-worth-history", months],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/net-worth-history?months=${months}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useTotalAssets() {
  return useQuery({
    queryKey: ["/api/analytics/assets"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/assets");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useTotalLiabilities() {
  return useQuery({
    queryKey: ["/api/analytics/liabilities"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/liabilities");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCategorySpending(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["/api/analytics/category-spending", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate) return [];
      const res = await fetch(
        `/api/analytics/category-spending?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceSheet() {
  return useQuery({
    queryKey: ["/api/analytics/balance-sheet"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/balance-sheet");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCashFlow(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["/api/analytics/cash-flow", startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      if (!startDate || !endDate) return null;
      const res = await fetch(
        `/api/analytics/cash-flow?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useBalanceHistory(days: number = 30) {
  return useQuery({
    queryKey: ["/api/analytics/balance-history", days],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/analytics/balance-history?days=${days}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useSpendingDaysComparison() {
  return useQuery({
    queryKey: ["/api/analytics/spending-days-comparison"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/analytics/spending-days-comparison");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

// ============= Recommendations API =============
export function useSavingsRecommendations() {
  return useQuery({
    queryKey: ["/api/recommendations"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/recommendations");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateRecommendation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/recommendations", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recommendations"] });
    },
  });
}

export async function logout(): Promise<void> {
  await fetchApi("/api/logout", {
    method: "POST",
  });
}

// Analytics
export async function getBalanceSheet(): Promise<any> {
  const res = await fetchApi("/api/analytics/balance-sheet");
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

export async function getCashFlow(startDate: string, endDate: string): Promise<any> {
  const res = await fetchApi(`/api/analytics/cash-flow?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

export async function getFinancialRatios(): Promise<any> {
  const res = await fetchApi("/api/analytics/financial-ratios");
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

export async function getHealthScore(): Promise<any> {
  const res = await fetchApi("/api/analytics/health-score");
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

export async function getSpendingPatterns(months: number = 3): Promise<any> {
  const res = await fetchApi(`/api/analytics/spending-patterns?months=${months}`);
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

// Budget spending
export async function getBudgetSpending(budgetId: number, startDate: string, endDate: string): Promise<any> {
  const res = await fetchApi(`/api/budgets/${budgetId}/spending?startDate=${startDate}&endDate=${endDate}`);
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

// AI & Notifications
export async function getRecommendations(): Promise<any> {
  const res = await fetchApi("/api/ai/recommendations");
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

export async function getNotifications(): Promise<any> {
  const res = await fetchApi("/api/notifications");
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

// Double-entry transactions
export async function createDoubleEntryTransaction(data: any): Promise<any> {
  const res = await fetchApi("/api/transactions/double-entry", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) handleApiError(await res.json());
  return await res.json();
}

// ============= Learning Center API =============
export function useLessons() {
  return useQuery({
    queryKey: ["/api/lessons"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/lessons");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useLesson(id: string) {
  return useQuery({
    queryKey: ["/api/lessons", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lessons/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useLessonQuiz(lessonId: string) {
  return useQuery({
    queryKey: ["/api/lessons", lessonId, "quiz"],
    enabled: !!lessonId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lessons/${lessonId}/quiz`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useSubmitQuiz() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, answers }: { lessonId: string; answers: any[] }) => {
      const res = await apiRequest("POST", `/api/lessons/${lessonId}/quiz`, { answers });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", variables.lessonId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
    },
  });
}

export function useLessonProgress(lessonId: string) {
  return useQuery({
    queryKey: ["/api/lessons", lessonId, "progress"],
    enabled: !!lessonId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/lessons/${lessonId}/progress`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useUpdateLessonProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ lessonId, status }: { lessonId: string; status: string }) => {
      const res = await apiRequest("POST", `/api/lessons/${lessonId}/progress`, { status });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/lessons", variables.lessonId, "progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/progress"] });
    },
  });
}

export function useUserProgress() {
  return useQuery({
    queryKey: ["/api/user/progress"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/progress");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

// ============= Debts API =============
export function useDebts() {
  return useQuery({
    queryKey: ["/api/debts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/debts");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useActiveDebts() {
  return useQuery({
    queryKey: ["/api/debts", "active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/debts/active");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useDebt(id: string) {
  return useQuery({
    queryKey: ["/api/debts", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/debts/${id}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/debts", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
    },
  });
}

export function useUpdateDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/debts/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debts", variables.id] });
    },
  });
}

export function useDeleteDebt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/debts/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
    },
  });
}

export function useCreateDebtPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ debtId, data }: { debtId: string; data: any }) => {
      const res = await apiRequest("POST", `/api/debts/${debtId}/payment`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/debts", variables.debtId] });
    },
  });
}

export function useDebtProjection(id: string) {
  return useQuery({
    queryKey: ["/api/debts", id, "projection"],
    enabled: !!id,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/debts/${id}/projection`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useDebtComparison(debtIds: string[], surplus: number) {
  return useQuery({
    queryKey: ["/api/debts/compare", debtIds, surplus],
    enabled: debtIds.length > 0,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/debts/compare", { debtIds, surplus });
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

// ============= Quick Deal Monthly Account API =============
export function useQuickDealNeedsSetup() {
  return useQuery({
    queryKey: ["/api/quick-deals/needs-setup"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/quick-deals/needs-setup");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useQuickDealMonthlyAccount() {
  return useQuery({
    queryKey: ["/api/quick-deals/monthly-account"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/quick-deals/monthly-account");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

// ============= Recurring Income API =============
export function useRecurringIncome() {
  return useQuery({
    queryKey: ["/api/recurring-income"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/recurring-income");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useActiveRecurringIncome() {
  return useQuery({
    queryKey: ["/api/recurring-income", "active"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/recurring-income/active");
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useUpcomingRecurringIncome(daysAhead: number = 7) {
  return useQuery({
    queryKey: ["/api/recurring-income", "upcoming", daysAhead],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/recurring-income/upcoming?daysAhead=${daysAhead}`);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
  });
}

export function useCreateRecurringIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/recurring-income", data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-income"] });
    },
  });
}

export function useUpdateRecurringIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/recurring-income/${id}`, data);
      if (!res.ok) handleApiError(await res.json());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-income"] });
    },
  });
}

export function useDeleteRecurringIncome() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/recurring-income/${id}`);
      if (!res.ok) handleApiError(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recurring-income"] });
    },
  });
}