import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GoLiveDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
  onStreamCreated?: (streamData: any) => void;
}

export const GoLiveDialog = ({ open, onOpenChange, children, onStreamCreated }: GoLiveDialogProps) => {
  const [title, setTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleGoLive = async () => {
    if (!title.trim()) {
      toast.error("Please enter a title for your live stream");
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke("stream-management", {
        body: {
          action: "create",
          title: title.trim(),
        },
      });

      if (error) throw error;

      toast.success("Live stream created! Starting camera...");
      setTitle("");
      onOpenChange?.(false);
      
      // Pass stream credentials to parent
      if (onStreamCreated) {
        onStreamCreated(data);
      }
    } catch (error: any) {
      console.error("Error starting live stream:", error);
      toast.error(error.message || "Failed to start live stream");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Live Stream</DialogTitle>
          <DialogDescription>
            Enter a title for your live stream to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Stream Title</Label>
            <Input
              id="title"
              placeholder="Enter stream title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isCreating}
            />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange?.(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleGoLive} disabled={isCreating}>
            {isCreating ? "Starting..." : "Go Live"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};