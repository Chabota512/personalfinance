import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TemplateVersion = {
  id: string;
  version: number;
  createdAt: string;
  [key: string]: any;
};

type TemplateVersionsResponse = TemplateVersion[];

export function TemplateVersionHistory({ templateId }: { templateId: number }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: versions, isLoading } = useQuery<TemplateVersionsResponse>({
    queryKey: [`/api/templates/${templateId}/versions`],
    enabled: !!templateId,
  });

  const createVersion = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await fetch(`/api/templates/${templateId}/create-version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/templates/${templateId}/versions`] });
      toast({ title: "Success", description: "New version created" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="h-4 w-4 mr-2" />
          Version History
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Template Versions</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {versions?.map((version: TemplateVersion) => (
              <div key={version.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{version.name}</h4>
                      <Badge variant="outline">v{version.version}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{version.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(version.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => createVersion.mutate({ name: `${version.name} (Copy)` })}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}