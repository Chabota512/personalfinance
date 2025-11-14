
import { db } from "./db";
import { pantryInventory } from "@shared/schema";
import { eq, and, sql } from "drizzle-orm";

interface PantryItem {
  itemName: string;
  quantity: number;
  unit?: string;
  expiryDate?: string;
  location?: string;
}

export async function addToPantry(
  userId: string,
  items: PantryItem[]
): Promise<{ added: number; updated: number; skipped: number }> {
  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    // Check if item already exists
    const existing = await db.query.pantryInventory.findFirst({
      where: and(
        eq(pantryInventory.userId, userId),
        sql`LOWER(${pantryInventory.itemName}) = LOWER(${item.itemName})`
      ),
    });

    if (existing) {
      // Update quantity
      const newQuantity = parseFloat(existing.quantity) + item.quantity;
      await db
        .update(pantryInventory)
        .set({
          quantity: newQuantity.toString(),
          lastUpdated: new Date().toISOString(),
        })
        .where(eq(pantryInventory.id, existing.id));
      updated++;
    } else {
      // Add new item
      await db.insert(pantryInventory).values({
        userId,
        itemName: item.itemName,
        quantity: item.quantity.toString(),
        unit: item.unit || null,
        expiryDate: item.expiryDate || null,
        location: item.location || null,
      });
      added++;
    }
  }

  return { added, updated, skipped };
}

export async function checkPantryBeforeShopping(
  userId: string,
  shoppingList: string[]
): Promise<Array<{ itemName: string; inPantry: boolean; quantity?: string }>> {
  const results = [];

  for (const itemName of shoppingList) {
    const pantryItem = await db.query.pantryInventory.findFirst({
      where: and(
        eq(pantryInventory.userId, userId),
        sql`LOWER(${pantryInventory.itemName}) = LOWER(${itemName})`
      ),
    });

    results.push({
      itemName,
      inPantry: !!pantryItem,
      quantity: pantryItem?.quantity,
    });
  }

  return results;
}

export async function consumeFromPantry(
  userId: string,
  itemName: string,
  quantity: number
) {
  const existing = await db.query.pantryInventory.findFirst({
    where: and(
      eq(pantryInventory.userId, userId),
      sql`LOWER(${pantryInventory.itemName}) = LOWER(${itemName})`
    ),
  });

  if (!existing) return false;

  const currentQty = parseFloat(existing.quantity);
  const newQty = currentQty - quantity;

  if (newQty <= 0) {
    // Remove from pantry
    await db.delete(pantryInventory).where(eq(pantryInventory.id, existing.id));
  } else {
    // Update quantity
    await db
      .update(pantryInventory)
      .set({
        quantity: newQty.toString(),
        lastUpdated: new Date().toISOString(),
      })
      .where(eq(pantryInventory.id, existing.id));
  }

  return true;
}
