
import { db } from "./db";
import { merchantPriceBook, items } from "@shared/schema";
import { eq, and, gte, sql } from "drizzle-orm";

interface PriceAnomaly {
  itemName: string;
  actualPrice: number;
  averagePrice: number;
  percentageDiff: number;
  isAnomaly: boolean;
  severity: 'low' | 'medium' | 'high';
}

const REGIONAL_MULTIPLIERS: Record<string, number> = {
  'SF': 1.3,     // San Francisco
  'NYC': 1.25,   // New York
  'LA': 1.15,    // Los Angeles
  'default': 1.0
};

export async function detectPriceAnomaly(
  itemName: string,
  actualPrice: number,
  locationName?: string,
  userRegion: string = 'default'
): Promise<PriceAnomaly> {
  // Get historical prices for this item
  const historicalPrices = await db
    .select({
      averagePrice: sql<number>`AVG(CAST(${merchantPriceBook.averagePrice} AS REAL))`,
      count: sql<number>`COUNT(*)`,
    })
    .from(merchantPriceBook)
    .where(eq(merchantPriceBook.itemName, itemName))
    .groupBy(merchantPriceBook.itemName);

  if (!historicalPrices.length || historicalPrices[0].count < 3) {
    // Not enough data
    return {
      itemName,
      actualPrice,
      averagePrice: actualPrice,
      percentageDiff: 0,
      isAnomaly: false,
      severity: 'low',
    };
  }

  const baseAverage = historicalPrices[0].averagePrice;
  const regionalMultiplier = REGIONAL_MULTIPLIERS[userRegion] || 1.0;
  const regionalAverage = baseAverage * regionalMultiplier;
  
  const percentageDiff = ((actualPrice - regionalAverage) / regionalAverage) * 100;
  const isAnomaly = Math.abs(percentageDiff) > 15; // 15% threshold
  
  let severity: 'low' | 'medium' | 'high' = 'low';
  if (Math.abs(percentageDiff) > 38) {
    severity = 'high';
  } else if (Math.abs(percentageDiff) > 25) {
    severity = 'medium';
  }

  return {
    itemName,
    actualPrice,
    averagePrice: regionalAverage,
    percentageDiff,
    isAnomaly,
    severity,
  };
}

export async function checkAllItemsForAnomalies(
  userId: string,
  items: Array<{ itemName: string; actualPrice: string }>,
  userRegion?: string
): Promise<PriceAnomaly[]> {
  const anomalies: PriceAnomaly[] = [];

  for (const item of items) {
    const anomaly = await detectPriceAnomaly(
      item.itemName,
      parseFloat(item.actualPrice),
      undefined,
      userRegion
    );
    
    if (anomaly.isAnomaly) {
      anomalies.push(anomaly);
    }
  }

  return anomalies;
}
