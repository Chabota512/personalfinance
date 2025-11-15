import Papa from 'papaparse';
// @ts-ignore - ofx-js doesn't have type definitions
import { parse as parseOfx } from 'ofx-js';
import { createSimpleTransaction, getAccountsByUserId } from './storage';
import { db } from "./db";
import { transactions, accounts } from "@shared/schema";
import { parse } from "csv-parse/sync";

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
}

interface CSVRow {
  date: string;
  description: string;
  amount: string;
  category?: string;
}

export async function importCSV(userId: string, fileContent: string): Promise<ImportResult> {
  const result: ImportResult = { success: 0, failed: 0, errors: [] };

  try {
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    }) as CSVRow[];

    const imported: any[] = [];
    for (const record of records) {
      // Simple import - creates expense transactions
      const amount = Math.abs(parseFloat(record.amount));

      // Get all user accounts
      const userAccounts = await getAccountsByUserId(userId);
      
      // Get checking account (assuming it exists)
      const checkingAccount = userAccounts.find(
        (a) => a.accountCategory === "checking"
      );

      if (!checkingAccount) {
        result.failed++;
        result.errors.push(`No checking account found for record: ${record.description}`);
        continue;
      }

      // Create expense transaction using simplified model
      await createSimpleTransaction(
        userId,
        {
          accountId: checkingAccount.id,
          transactionType: 'expense',
          date: record.date,
          description: record.description,
          totalAmount: amount.toFixed(2),
          notes: `Imported from CSV${record.category ? ` - ${record.category}` : ""}`,
          category: record.category || null,
        }
      );
      result.success++;
    }

    return result;
  } catch (error: any) {
    result.failed++;
    result.errors.push(`CSV import failed: ${error.message}`);
    return result;
  }
}

// OFX import is removed as per instructions
// export async function importOFX(userId: string, fileContent: string): Promise<ImportResult> {
//   const result: ImportResult = { success: 0, failed: 0, errors: [] };
//   result.errors.push('OFX import requires account mapping configuration. Please set up account mappings first.');
//   return result;
// }