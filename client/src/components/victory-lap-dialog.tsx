import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, TrendingUp, Lock } from "lucide-react";
import { motion } from "framer-motion";
import type { Goal } from "@shared/schema";

interface VictoryLapDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLockFunds?: () => void;
  onRollOver?: () => void;
}

export function VictoryLapDialog({ goal, open, onOpenChange, onLockFunds, onRollOver }: VictoryLapDialogProps) {
  const [progress, setProgress] = useState(0);
  const [showActions, setShowActions] = useState(false);

  useEffect(() => {
    if (open) {
      // Animate progress bar fill
      setTimeout(() => setProgress(100), 100);
      
      // Show actions after animation
      setTimeout(() => setShowActions(true), 2000);
      
      // Auto-close after 15 seconds
      setTimeout(() => onOpenChange(false), 15000);
    } else {
      setProgress(0);
      setShowActions(false);
    }
  }, [open, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg" data-testid="dialog-victory-lap">
        <div className="space-y-6 py-4">
          {/* Trophy Animation */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", duration: 0.8 }}
            className="flex justify-center"
          >
            <div className="p-6 bg-primary/10 rounded-full">
              <Trophy className="h-16 w-16 text-primary" />
            </div>
          </motion.div>

          {/* Goal Achieved Message */}
          <div className="text-center space-y-2">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold"
            >
              Goal Achieved!
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-xl font-semibold text-foreground"
            >
              {goal.name}
            </motion.p>
          </div>

          {/* Progress Bar Animation */}
          <div className="space-y-2">
            <Progress value={progress} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>$0</span>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="font-semibold text-success"
              >
                ${parseFloat(goal.targetAmount).toLocaleString()}
              </motion.span>
            </div>
          </div>

          {/* Why Message */}
          {goal.why && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
              className="bg-muted/50 p-4 rounded-lg"
            >
              <p className="text-sm italic text-center">
                "{goal.why}"
              </p>
            </motion.div>
          )}

          {/* Action Buttons */}
          {showActions && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-center text-muted-foreground">
                What's next?
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => {
                    onLockFunds?.();
                    onOpenChange(false);
                  }}
                  data-testid="button-lock-funds"
                >
                  <Lock className="h-5 w-5" />
                  <div className="text-xs">
                    <div className="font-semibold">Lock Funds</div>
                    <div className="text-muted-foreground">High-yield savings</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="flex flex-col h-auto py-4 gap-2"
                  onClick={() => {
                    onRollOver?.();
                    onOpenChange(false);
                  }}
                  data-testid="button-roll-over"
                >
                  <TrendingUp className="h-5 w-5" />
                  <div className="text-xs">
                    <div className="font-semibold">Roll Over</div>
                    <div className="text-muted-foreground">To next goal</div>
                  </div>
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
