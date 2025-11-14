
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, TrendingDown, TrendingUp, MapPin, Search, Edit, Trash2, ShoppingCart, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/financial-utils";
import { PageHeader } from "@/components/page-header";

interface Item {
  id: string;
  name: string;
  category: string;
  averagePrice?: string;
  bestPrice?: string;
  bestLocation?: string;
  lastPurchased?: string;
  purchaseCount: number;
  priceHistory?: Array<{
    id: string;
    price: string;
    purchaseDate: string;
    locationName?: string;
  }>;
}

interface QuickDealItem {
  id: string;
  description: string;
  amount: string;
  category: string;
  locationName?: string;
  date: string;
  type: 'income' | 'expense';
}

export default function ItemsPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addToBudgetOpen, setAddToBudgetOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [selectedQuickDeal, setSelectedQuickDeal] = useState<QuickDealItem | null>(null);
  const [activeTab, setActiveTab] = useState<"quick-deals" | "budget-items">("quick-deals");
  
  const [newItem, setNewItem] = useState({
    name: "",
    category: "",
  });
  
  const [editForm, setEditForm] = useState({
    name: "",
    category: "",
  });

  const [budgetItemForm, setBudgetItemForm] = useState({
    name: "",
    category: "",
    quantity: "",
    unit: "",
    estimatedPrice: "",
    notes: "",
  });

  // Fetch master items (budget items)
  const { data: items = [], isLoading: loadingItems } = useQuery<Item[]>({
    queryKey: ["/api/items"],
  });

  // Fetch quick deals (expense transactions)
  const { data: transactions = [], isLoading: loadingQuickDeals } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
  });

  const quickDealItems: QuickDealItem[] = transactions
    .filter(t => t.category && t.category !== 'other_income' && t.category !== 'other_expense')
    .map(t => ({
      id: t.id,
      description: t.description,
      amount: t.totalAmount,
      category: t.category,
      locationName: t.locationName,
      date: t.date,
      type: t.totalAmount?.startsWith('-') ? 'expense' : 'income',
    }));

  const createItemMutation = useMutation({
    mutationFn: async (data: { name: string; category: string }) => {
      return await apiRequest("POST", "/api/items", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item added to budget items" });
      setNewItem({ name: "", category: "" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name: string; category: string } }) => {
      return await apiRequest("PUT", `/api/items/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item updated successfully" });
      setEditOpen(false);
      setEditingItem(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/items/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      toast({ title: "Item deleted successfully" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAddItem = () => {
    if (!newItem.name || !newItem.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    createItemMutation.mutate(newItem);
  };

  const handleEditItem = () => {
    if (!editingItem || !editForm.name || !editForm.category) {
      toast({
        title: "Missing information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    updateItemMutation.mutate({ id: editingItem.id, data: editForm });
  };

  const handleDeleteItem = (item: Item) => {
    if (confirm(`Are you sure you want to delete "${item.name}"? This action cannot be undone.`)) {
      deleteItemMutation.mutate(item.id);
    }
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      category: item.category,
    });
    setEditOpen(true);
  };

  const openAddToBudgetDialog = (quickDeal: QuickDealItem) => {
    setSelectedQuickDeal(quickDeal);
    setBudgetItemForm({
      name: quickDeal.description,
      category: quickDeal.category,
      quantity: "1",
      unit: "",
      estimatedPrice: quickDeal.amount.replace('-', ''),
      notes: quickDeal.locationName ? `From ${quickDeal.locationName}` : "",
    });
    setAddToBudgetOpen(true);
  };

  const handleAddToBudget = () => {
    if (!budgetItemForm.name || !budgetItemForm.category || !budgetItemForm.estimatedPrice) {
      toast({
        title: "Missing information",
        description: "Please fill in name, category, and estimated price",
        variant: "destructive",
      });
      return;
    }
    
    createItemMutation.mutate({
      name: budgetItemForm.name,
      category: budgetItemForm.category,
    });
    
    setAddToBudgetOpen(false);
    setBudgetItemForm({
      name: "",
      category: "",
      quantity: "",
      unit: "",
      estimatedPrice: "",
      notes: "",
    });
  };

  const filteredItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuickDeals = quickDealItems.filter(
    (item) =>
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPriceTrend = (item: Item) => {
    if (!item.priceHistory || item.priceHistory.length < 2) return null;
    const sortedHistory = [...item.priceHistory].sort((a, b) => 
      new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime()
    );
    const latest = parseFloat(sortedHistory[0].price);
    const previous = parseFloat(sortedHistory[1].price);
    return latest < previous ? "down" : latest > previous ? "up" : "same";
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <PageHeader
        title="Items"
        description="Track and manage your shopping items"
        breadcrumbs={[{ label: "Items", href: "/items" }]}
      />

      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-items"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quick-deals" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              Quick Deals
            </TabsTrigger>
            <TabsTrigger value="budget-items" className="gap-2">
              <Package className="h-4 w-4" />
              Budget Items
            </TabsTrigger>
          </TabsList>

          {/* Quick Deals Tab */}
          <TabsContent value="quick-deals" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Items from your quick transactions. Click "Add to Budget" to save them for future budgets.
            </p>

            {loadingQuickDeals ? (
              <p>Loading quick deals...</p>
            ) : filteredQuickDeals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery
                    ? "No quick deals match your search"
                    : "No quick deals yet. Record transactions to see items here."}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Quick Deals</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredQuickDeals.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {item.description}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{item.category}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(parseFloat(item.amount))}
                          </TableCell>
                          <TableCell>
                            {new Date(item.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAddToBudgetDialog(item)}
                              className="gap-2"
                            >
                              <Plus className="h-4 w-4" />
                              Add to Budget
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Budget Items Tab */}
          <TabsContent value="budget-items" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Master list of items you track for budgeting
              </p>
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-add-item">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Budget Item</DialogTitle>
                    <DialogDescription>
                      Add an item to track for future budgets
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="item-name">Item Name</Label>
                      <Input
                        id="item-name"
                        value={newItem.name}
                        onChange={(e) =>
                          setNewItem({ ...newItem, name: e.target.value })
                        }
                        placeholder="e.g., Milk, Bread, Coffee"
                        data-testid="input-item-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="item-category">Category</Label>
                      <Input
                        id="item-category"
                        value={newItem.category}
                        onChange={(e) =>
                          setNewItem({ ...newItem, category: e.target.value })
                        }
                        placeholder="e.g., Groceries, Electronics"
                        data-testid="input-item-category"
                      />
                    </div>
                    <Button
                      onClick={handleAddItem}
                      className="w-full"
                      disabled={createItemMutation.isPending}
                      data-testid="button-save-item"
                    >
                      {createItemMutation.isPending ? "Adding..." : "Add Item"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loadingItems ? (
              <p>Loading items...</p>
            ) : filteredItems.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {searchQuery
                    ? "No items match your search"
                    : "No budget items yet. Add your first item to start tracking."}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Budget Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Average</TableHead>
                        <TableHead className="text-right">Best Price</TableHead>
                        <TableHead className="text-right">Purchases</TableHead>
                        <TableHead>Trend</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const trend = getPriceTrend(item);
                        return (
                          <TableRow
                            key={item.id}
                            data-testid={`row-item-${item.id}`}
                          >
                            <TableCell 
                              className="font-medium cursor-pointer hover:underline"
                              onClick={() => setSelectedItem(item)}
                            >
                              {item.name}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{item.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {item.averagePrice
                                ? formatCurrency(parseFloat(item.averagePrice))
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.bestPrice ? (
                                <div>
                                  <div className="font-semibold text-success">
                                    {formatCurrency(parseFloat(item.bestPrice))}
                                  </div>
                                  {item.bestLocation && (
                                    <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {item.bestLocation}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.purchaseCount}
                            </TableCell>
                            <TableCell>
                              {trend === "down" && (
                                <TrendingDown className="h-4 w-4 text-success" />
                              )}
                              {trend === "up" && (
                                <TrendingUp className="h-4 w-4 text-destructive" />
                              )}
                              {!trend && <span className="text-muted-foreground">-</span>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex gap-1 justify-end">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditDialog(item);
                                  }}
                                  data-testid={`button-edit-${item.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteItem(item);
                                  }}
                                  data-testid={`button-delete-${item.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Add to Budget Dialog */}
        <Dialog open={addToBudgetOpen} onOpenChange={setAddToBudgetOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Budget Items</DialogTitle>
              <DialogDescription>
                Edit the item details before adding to your budget items list
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="budget-item-name">Item Name</Label>
                <Input
                  id="budget-item-name"
                  value={budgetItemForm.name}
                  onChange={(e) =>
                    setBudgetItemForm({ ...budgetItemForm, name: e.target.value })
                  }
                  placeholder="e.g., Milk, Bread, Coffee"
                />
              </div>
              <div>
                <Label htmlFor="budget-item-category">Category</Label>
                <Input
                  id="budget-item-category"
                  value={budgetItemForm.category}
                  onChange={(e) =>
                    setBudgetItemForm({ ...budgetItemForm, category: e.target.value })
                  }
                  placeholder="e.g., Groceries, Electronics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="budget-item-quantity">Quantity</Label>
                  <Input
                    id="budget-item-quantity"
                    value={budgetItemForm.quantity}
                    onChange={(e) =>
                      setBudgetItemForm({ ...budgetItemForm, quantity: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label htmlFor="budget-item-unit">Unit</Label>
                  <Input
                    id="budget-item-unit"
                    value={budgetItemForm.unit}
                    onChange={(e) =>
                      setBudgetItemForm({ ...budgetItemForm, unit: e.target.value })
                    }
                    placeholder="kg, lbs, pcs"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="budget-item-price">Estimated Price</Label>
                <Input
                  id="budget-item-price"
                  type="number"
                  step="0.01"
                  value={budgetItemForm.estimatedPrice}
                  onChange={(e) =>
                    setBudgetItemForm({ ...budgetItemForm, estimatedPrice: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="budget-item-notes">Notes (Optional)</Label>
                <Input
                  id="budget-item-notes"
                  value={budgetItemForm.notes}
                  onChange={(e) =>
                    setBudgetItemForm({ ...budgetItemForm, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddToBudgetOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToBudget}
                  className="flex-1"
                  disabled={createItemMutation.isPending}
                >
                  {createItemMutation.isPending ? "Adding..." : "Add to Budget Items"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Item Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
              <DialogDescription>
                Update the item details
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-item-name">Item Name</Label>
                <Input
                  id="edit-item-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                  placeholder="e.g., Milk, Bread, Coffee"
                  data-testid="input-edit-item-name"
                />
              </div>
              <div>
                <Label htmlFor="edit-item-category">Category</Label>
                <Input
                  id="edit-item-category"
                  value={editForm.category}
                  onChange={(e) =>
                    setEditForm({ ...editForm, category: e.target.value })
                  }
                  placeholder="e.g., Groceries, Electronics"
                  data-testid="input-edit-item-category"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                  className="flex-1"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditItem}
                  className="flex-1"
                  disabled={updateItemMutation.isPending}
                  data-testid="button-save-edit"
                >
                  {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Item Detail Dialog */}
        <Dialog
          open={!!selectedItem}
          onOpenChange={() => setSelectedItem(null)}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedItem?.name}</DialogTitle>
              <DialogDescription>Price history and statistics</DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">
                        Average Price
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedItem.averagePrice
                          ? formatCurrency(parseFloat(selectedItem.averagePrice))
                          : "-"}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-sm text-muted-foreground">Best Price</p>
                      <p className="text-2xl font-bold text-success">
                        {selectedItem.bestPrice
                          ? formatCurrency(parseFloat(selectedItem.bestPrice))
                          : "-"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {selectedItem.priceHistory &&
                  selectedItem.priceHistory.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Price History</h3>
                      <div className="space-y-2">
                        {selectedItem.priceHistory.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between p-2 bg-muted rounded-md"
                          >
                            <div>
                              <p className="font-medium">
                                {formatCurrency(parseFloat(entry.price))}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(entry.purchaseDate).toLocaleDateString()}
                              </p>
                            </div>
                            {entry.locationName && (
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {entry.locationName}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
