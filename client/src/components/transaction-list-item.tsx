import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/financial-utils";
import { Volume2 } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";
import { getCategoryById } from "@/lib/categories";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const amount = parseFloat(transaction.totalAmount);
  const isExpense = amount < 0;
  const category = transaction.category ? getCategoryById(transaction.category) : null;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
      className="group relative font-sans text-xs py-1 px-3 hover:shadow-md transition-all duration-200 rounded-md"
      data-testid={`transaction-${transaction.id}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 truncate font-bold text-foreground text-[12px]">
          {transaction.description}
        </span>
        
        <span className={cn(
          "shrink-0 font-bold tabular-nums text-[12px]",
          isExpense ? "text-destructive" : "text-success"
        )}>
          {amountStr}
        </span>
        
        <span className="shrink-0 font-bold text-muted-foreground/70 text-[12px] min-w-[90px]">
          {dateStr}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            if (onClick) {
              onClick();
            } else {
              setLocation('/transactions');
            }
          }}
          className="shrink-0 text-primary hover:text-primary/80 underline text-[12px] font-bold"
        >
          See more
        </button>
      </div>
    </div>
  );
}