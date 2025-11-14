import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Trophy, Target } from "lucide-react";
import type { Goal } from "@shared/schema";

interface MilestoneCelebrationProps {
  milestone: number;
  goal: Goal;
  onComplete?: () => void;
}

export function MilestoneCelebration({ milestone, goal, onComplete }: MilestoneCelebrationProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-hide after 3 seconds
    const timer = setTimeout(() => {
      setShow(false);
      onComplete?.();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  const getMilestoneMessage = (percent: number) => {
    if (percent >= 90) return "Almost there!";
    if (percent >= 75) return "Great progress!";
    if (percent >= 60) return "Keep it up!";
    if (percent >= 40) return "Nice work!";
    if (percent >= 25) return "You're on fire!";
    return "Strong start!";
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-background/95 backdrop-blur-sm border-2 border-primary rounded-lg p-8 shadow-2xl max-w-md mx-4">
            <div className="text-center space-y-4">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="inline-block"
              >
                <Trophy className="h-16 w-16 text-primary mx-auto" />
              </motion.div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">
                  {milestone}% Complete! 
                </h2>
                <p className="text-lg text-muted-foreground">
                  {getMilestoneMessage(milestone)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {goal.name}
                </p>
                {goal.why && milestone >= 90 && (
                  <p className="text-xs italic text-muted-foreground mt-2">
                    "{goal.why}"
                  </p>
                )}
              </div>

              {/* Confetti effect */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ 
                      y: -20, 
                      x: Math.random() * 400 - 200,
                      opacity: 1 
                    }}
                    animate={{ 
                      y: 400, 
                      rotate: Math.random() * 360,
                      opacity: 0 
                    }}
                    transition={{ 
                      duration: 2,
                      delay: Math.random() * 0.5,
                      ease: "easeOut"
                    }}
                    className="absolute top-0 left-1/2"
                  >
                    <Sparkles className="h-4 w-4 text-primary" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
