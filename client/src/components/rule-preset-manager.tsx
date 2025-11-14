import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Layers, Plus, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type AutomationRule = {
  id: string;
  name: string;
  [key: string]: any;
};

type AutomationRulesResponse = AutomationRule[];

const PRESET_TEMPLATES = {
  "50/30/20": { Needs: 50, Wants: 30, Savings: 20 },
  "60/20/20": { Needs: 60, Wants: 20, Savings: 20 },
  "70/20/10": { Needs: 70, Wants: 20, Savings: 10 },
};

export function RulePresetManager({ budgetId, onApply }: { budgetId?: number; onApply?: () => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [template, setTemplate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: presets } = useQuery<AutomationRulesResponse>({
    queryKey: ["/api/rule-presets"],
    enabled: open,
  });

  const createPreset = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/rule-presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rule-presets"] });
      toast({ title: "Success", description: "Preset saved" });
      setCreating(false);
      setName("");
      setDescription("");
    },
  });

  const applyPreset = useMutation({
    mutationFn: async (presetId: number) => {
      const res = await fetch(`/api/budgets/${budgetId}/apply-preset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ presetId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Rule preset applied" });
      setOpen(false);
      onApply?.();
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="h-4 w-4 mr-2" />
          Rule Presets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Budget Rule Presets</DialogTitle>
        </DialogHeader>

        {!creating ? (
          <div className="space-y-4">
            <Button onClick={() => setCreating(true)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Create New Preset
            </Button>

            <div className="space-y-2">
              {presets?.map((preset: any) => (
                <div key={preset.id} className="border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{preset.name}</h4>
                      <Badge variant="secondary">{preset.ruleType}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{preset.description}</p>
                  </div>
                  {budgetId && (
                    <Button
                      size="sm"
                      onClick={() => applyPreset.mutate(preset.id)}
                      disabled={applyPreset.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Apply
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Custom Rule"
              />
            </div>

            <div>
              <Label htmlFor="preset-template">Base Template</Label>
              <Select value={template} onValueChange={setTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a template" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(PRESET_TEMPLATES).map((key) => (
                    <SelectItem key={key} value={key}>{key} Rule</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="preset-desc">Description</Label>
              <Textarea
                id="preset-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  if (name && template) {
                    createPreset.mutate({
                      name,
                      description,
                      ruleType: "percentage",
                      ruleConfig: PRESET_TEMPLATES[template as keyof typeof PRESET_TEMPLATES],
                    });
                  }
                }}
                disabled={!name || !template || createPreset.isPending}
              >
                Save Preset
              </Button>
              <Button variant="outline" onClick={() => setCreating(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}