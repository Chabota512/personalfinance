
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Trash2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AutoSweepConfig() {
  const [category, setCategory] = useState("");
  const [goalId, setGoalId] = useState("");
  const [threshold, setThreshold] = useState("50");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sweeps = [] } = useQuery({ queryKey: ["/api/auto-sweep"] });
  const { data: goals = [] } = useQuery({ queryKey: ["/api/goals"] });

  const createSweep = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/auto-sweep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-sweep"] });
      toast({ title: "Success", description: "Auto-sweep configured" });
      setCategory("");
      setGoalId("");
      setThreshold("50");
    },
  });

  const deleteSweep = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/auto-sweep/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auto-sweep"] });
      toast({ title: "Success", description: "Auto-sweep removed" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Savings Auto-Sweep
        </CardTitle>
        <CardDescription>
          You already saved money this week. Move it to your goals automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Source Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fun">Fun</SelectItem>
                  <SelectItem value="Entertainment">Entertainment</SelectItem>
                  <SelectItem value="Dining">Dining Out</SelectItem>
                  <SelectItem value="Shopping">Shopping</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Target Goal</Label>
              <Select value={goalId} onValueChange={setGoalId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(goals) && goals.map((goal: any) => (
                    <SelectItem key={goal.id} value={goal.id.toString()}>
                      {goal.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div>
            <Label>Minimum Threshold ($)</Label>
            <Input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder="50.00"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only move savings if amount exceeds this threshold
            </p>
          </div>
          
          <Button
            onClick={() => createSweep.mutate({
              sourceCategory: category,
              targetGoalId: parseInt(goalId),
              threshold,
            })}
            disabled={!category || !goalId || createSweep.isPending}
          >
            Add Auto-Sweep Rule
          </Button>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium">Active Rules</h4>
          {Array.isArray(sweeps) && sweeps.map((sweep: any) => (
            <div key={sweep.id} className="flex items-center justify-between border rounded-lg p-3">
              <div className="text-sm">
                <span className="font-medium">{sweep.sourceCategory}</span>
                {" → "}
                <span className="text-muted-foreground">Goal (if &gt; ${sweep.threshold})</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSweep.mutate(sweep.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
