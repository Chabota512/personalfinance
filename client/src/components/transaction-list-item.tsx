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
      className="font-mono text-sm py-1 px-2 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
      data-testid={`transaction-${transaction.id}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-muted-foreground shrink-0">[{dateStr}]</span>
        <span className={cn("shrink-0 font-semibold", isExpense ? "text-destructive" : "text-success")}>
          {amountStr.padEnd(12)}
        </span>
        <span className="flex-1 truncate">{transaction.description}</span>
        {transaction.voiceNoteUrl && (
          <button
            onClick={handleVoiceNoteClick}
            className={cn(
              "shrink-0 p-0.5 rounded hover:bg-muted",
              isPlaying && "bg-primary/10"
            )}
            title={isPlaying ? "Playing..." : "Play voice note"}
          >
            <Volume2 className={cn("h-3 w-3", isPlaying ? "text-primary" : "text-muted-foreground")} />
          </button>
        )}
      </div>
      <div className="flex items-start gap-2 pl-2 text-xs text-muted-foreground">
        <span className="shrink-0">└─</span>
        <span className="shrink-0">{categoryName}</span>
        {transaction.locationName && (
          <>
            <span>|</span>
            <span className="truncate" data-testid={`location-${transaction.id}`}>📍 {transaction.locationName}</span>
          </>
        )}
        {transaction.contentmentLevel !== null && transaction.contentmentLevel !== undefined && (
          <>
            <span>|</span>
            <span title={`Contentment: ${transaction.contentmentLevel}/5`}>
              {transaction.contentmentLevel === 5 && '😄'}
              {transaction.contentmentLevel === 4 && '🙂'}
              {transaction.contentmentLevel === 3 && '😐'}
              {transaction.contentmentLevel === 2 && '😕'}
              {transaction.contentmentLevel === 1 && '😞'}
            </span>
          </>
        )}
      </div>
      {transaction.reason && (
        <div className="flex items-start gap-2 pl-2 text-xs text-muted-foreground italic">
          <span className="shrink-0">└─</span>
          <span className="truncate">"{transaction.reason}"</span>
          {transaction.reasonAudioUrl && (
            <button
              onClick={handleReasonAudioClick}
              className={cn(
                "shrink-0 p-0.5 rounded hover:bg-muted",
                isPlayingReason && "bg-primary/10"
              )}
              title={isPlayingReason ? "Playing..." : "Hear why you did this"}
            >
              <Volume2 className={cn("h-3 w-3", isPlayingReason ? "text-primary" : "text-muted-foreground")} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}