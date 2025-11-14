import { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/financial-utils";
import { MapPin, Volume2, AlertCircle } from "lucide-react";
import type { Transaction } from "@shared/schema";
import { format } from "date-fns";
import { getCategoryById } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Assume TransactionStatusBadge and formatDate are defined elsewhere or imported
// For this example, let's provide dummy implementations if they are not in the original snippet
const TransactionStatusBadge = ({ status }: { status: string }) => (
  <div className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${status === 'pending' ? 'bg-yellow-200 text-yellow-800' : ''}`}>
    {status.toUpperCase()}
  </div>
);

const formatDate = (date: string | Date) => format(new Date(date), 'MMM dd, yyyy');

interface TransactionListItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionListItem({ transaction, onClick }: TransactionListItemProps) {
  const amount = parseFloat(transaction.totalAmount);
  const isExpense = amount < 0;
  const category = transaction.category ? getCategoryById(transaction.category) : null;
  const CategoryIcon = category?.icon;
  const { toast } = useToast();

  // Voice note playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPlayingReason, setIsPlayingReason] = useState(false);
  const [hasError, setHasError] = useState(false);
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
          setHasError(true);
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
        setHasError(false);
      }
    } catch (error) {
      setHasError(true);
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

  return (
    <div
      className="flex items-center justify-between p-4 hover-elevate rounded-lg cursor-pointer border border-transparent hover:border-border transition-all"
      onClick={onClick}
      data-testid={`transaction-${transaction.id}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        {/* Category Icon */}
        <div className={`p-2 rounded-lg ${
          CategoryIcon
            ? 'bg-card'
            : isExpense ? 'bg-destructive/10' : 'bg-success/10'
        }`}>
          {CategoryIcon ? (
            <CategoryIcon className={`h-5 w-5 ${category?.color || 'text-muted-foreground'}`} />
          ) : (
            <div className={`h-5 w-5 ${isExpense ? 'text-destructive' : 'text-success'}`}>
              {isExpense ? '−' : '+'}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{transaction.description}</p>
            {transaction.voiceNoteUrl && (
              <button
                onClick={handleVoiceNoteClick}
                className={cn(
                  "p-1 rounded-full hover:bg-muted transition-colors",
                  isPlaying && "bg-primary/10"
                )}
                title={isPlaying ? "Playing voice note..." : "Play voice note"}
              >
                <Volume2 className={cn("h-4 w-4", isPlaying ? "text-primary" : "text-muted-foreground")} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-sm text-muted-foreground">
              {format(new Date(transaction.date), 'MMM dd, yyyy')}
            </p>

            {/* Location Display */}
            {transaction.locationName && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate" data-testid={`location-${transaction.id}`}>
                    {transaction.locationName}
                  </span>
                </div>
              </>
            )}

            {/* Contentment Level Display */}
            {transaction.contentmentLevel !== null && transaction.contentmentLevel !== undefined && (
              <>
                <span className="text-muted-foreground">•</span>
                <div className="flex items-center gap-1 text-sm" title={`Contentment: ${transaction.contentmentLevel}/5`}>
                  {transaction.contentmentLevel === 5 && <span>😄</span>}
                  {transaction.contentmentLevel === 4 && <span>🙂</span>}
                  {transaction.contentmentLevel === 3 && <span>😐</span>}
                  {transaction.contentmentLevel === 2 && <span>😕</span>}
                  {transaction.contentmentLevel === 1 && <span>😞</span>}
                </div>
              </>
            )}
          </div>
          {transaction.reason && (
            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground italic">
              <span className="truncate">"{transaction.reason}"</span>
              {transaction.reasonAudioUrl && (
                <button
                  onClick={handleReasonAudioClick}
                  className={cn(
                    "p-1 rounded-full hover:bg-muted transition-colors shrink-0",
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
      </div>

      <div className="flex items-center gap-3">
        {/* Amount */}
        <div className="text-right">
          <p className={`font-mono font-semibold text-lg ${
            isExpense ? 'text-destructive' : 'text-success'
          }`} data-testid={`amount-${transaction.id}`}>
            {isExpense ? '-' : '+'}{formatCurrency(Math.abs(amount))}
          </p>
        </div>
      </div>
    </div>
  );
}