import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/financial-utils";
import { Volume2 } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";
import { getCategoryById } from "@/lib/categories";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const amount = parseFloat(transaction.totalAmount);
  const isExpense = amount < 0;
  const category = transaction.category ? getCategoryById(transaction.category) : null;
  const { toast } = useToast();

  // Voice note playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingReason, setIsPlayingReason] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const reasonAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Cleanup audio when component unmounts
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (reasonAudioRef.current) {
        reasonAudioRef.current.pause();
        reasonAudioRef.current = null;
      }
    };
  }, []);

  const handleVoiceNoteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!transaction.voiceNoteUrl) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(transaction.voiceNoteUrl);

        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
        });

        audioRef.current.addEventListener('error', () => {
          setIsPlaying(false);
          toast({
            title: "Playback Error",
            description: "Could not play voice note",
            variant: "destructive"
          });
        });
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (error) {
      toast({
        title: "Playback Error",
        description: "Could not play voice note",
        variant: "destructive"
      });
    }
  };

  const handleReasonAudioClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!transaction.reasonAudioUrl) return;

    try {
      if (!reasonAudioRef.current) {
        reasonAudioRef.current = new Audio(transaction.reasonAudioUrl);

        reasonAudioRef.current.addEventListener('ended', () => {
          setIsPlayingReason(false);
        });

        reasonAudioRef.current.addEventListener('error', () => {
          toast({
            title: "Playback Error",
            description: "Could not play reason audio",
            variant: "destructive"
          });
          setIsPlayingReason(false);
        });
      }

      if (isPlayingReason) {
        reasonAudioRef.current.pause();
        setIsPlayingReason(false);
      } else {
        reasonAudioRef.current.play();
        setIsPlayingReason(true);
      }
    } catch (error) {
      toast({
        title: "Playback Error",
        description: "Could not play reason audio",
        variant: "destructive"
      });
    }
  };

  const dateStr = format(new Date(transaction.date), 'MMM dd, yyyy');
  const amountStr = `${isExpense ? '-' : '+'}${formatCurrency(Math.abs(amount))}`;
  const categoryName = category?.name || 'Uncategorized';

  return (
    <div
      className="group relative font-mono text-xs py-2 px-3 hover:bg-accent/50 cursor-pointer transition-all duration-200 border-l-2 border-transparent hover:border-l-primary"
      onClick={onClick}
      data-testid={`transaction-${transaction.id}`}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "shrink-0 font-bold min-w-[100px] text-right tabular-nums",
          isExpense ? "text-destructive" : "text-success"
        )}>
          {amountStr}
        </span>
        
        <span className="shrink-0 text-muted-foreground/70 text-[10px] min-w-[80px]">
          {dateStr}
        </span>
        
        <span className="flex-1 truncate font-medium text-foreground">
          {transaction.description}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-muted-foreground/60 text-[10px] px-2 py-0.5 bg-muted/30 rounded">
            {categoryName}
          </span>
          
          {transaction.contentmentLevel !== null && transaction.contentmentLevel !== undefined && (
            <span className="text-sm" title={`Contentment: ${transaction.contentmentLevel}/5`}>
              {transaction.contentmentLevel === 5 && '😄'}
              {transaction.contentmentLevel === 4 && '🙂'}
              {transaction.contentmentLevel === 3 && '😐'}
              {transaction.contentmentLevel === 2 && '😕'}
              {transaction.contentmentLevel === 1 && '😞'}
            </span>
          )}
          
          {transaction.voiceNoteUrl && (
            <button
              onClick={handleVoiceNoteClick}
              className={cn(
                "p-1 rounded-md hover:bg-muted transition-colors",
                isPlaying && "bg-primary/10 text-primary"
              )}
              title={isPlaying ? "Playing..." : "Play voice note"}
            >
              <Volume2 className={cn("h-3 w-3", isPlaying ? "text-primary" : "text-muted-foreground")} />
            </button>
          )}
        </div>
      </div>

      {(transaction.locationName || transaction.reason) && (
        <div className="flex items-center gap-3 mt-1.5 ml-[100px] pl-3 text-[10px] text-muted-foreground/60">
          {transaction.locationName && (
            <span className="flex items-center gap-1" data-testid={`location-${transaction.id}`}>
              <span className="text-[9px]">📍</span>
              {transaction.locationName}
            </span>
          )}
          
          {transaction.reason && (
            <span className="flex items-center gap-1 italic">
              <span>•</span>
              {transaction.reason}
              {transaction.reasonAudioUrl && (
                <button
                  onClick={handleReasonAudioClick}
                  className={cn(
                    "ml-1 p-0.5 rounded hover:bg-muted transition-colors",
                    isPlayingReason && "bg-primary/10 text-primary"
                  )}
                  title={isPlayingReason ? "Playing..." : "Hear why you did this"}
                >
                  <Volume2 className={cn("h-2.5 w-2.5", isPlayingReason ? "text-primary" : "text-muted-foreground")} />
                </button>
              )}
            </span>
          )}
        </div>
      )}
    </div>
  );
}