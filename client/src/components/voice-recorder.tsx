import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Square, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VoiceRecorderProps {
  onTranscriptionComplete: (transcription: string) => void;
  className?: string;
}

export function VoiceRecorder({ onTranscriptionComplete, className }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setTranscription(prev => prev + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Recognition error: ${event.error}`);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Error",
        description: "Speech recognition is not available",
        variant: "destructive"
      });
      return;
    }

    setError(null);
    setTranscription("");
    setIsRecording(true);
    
    try {
      recognitionRef.current.start();
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone"
      });
    } catch (error: any) {
      setError(error.message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
      
      if (transcription.trim()) {
        onTranscriptionComplete(transcription.trim());
        toast({
          title: "Recording completed",
          description: "Your reasons have been transcribed"
        });
      }
    }
  };

  const clearTranscription = () => {
    setTranscription("");
    onTranscriptionComplete("");
  };

  return (
    <div className={className}>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="h-4 w-4" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              {!isRecording ? (
                <Button
                  type="button"
                  onClick={startRecording}
                  disabled={!!error}
                  variant="outline"
                  className="gap-2"
                  data-testid="button-start-recording"
                >
                  <Mic className="h-4 w-4" />
                  Start Recording
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={stopRecording}
                  variant="destructive"
                  className="gap-2"
                  data-testid="button-stop-recording"
                >
                  <Square className="h-4 w-4" />
                  Stop Recording
                </Button>
              )}

              {transcription && (
                <Button
                  type="button"
                  onClick={clearTranscription}
                  variant="ghost"
                  size="sm"
                  data-testid="button-clear-transcription"
                >
                  Clear
                </Button>
              )}
            </div>

            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 bg-destructive rounded-full animate-pulse" />
                  <span>Recording in progress...</span>
                </div>
              </div>
            )}

            {isTranscribing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Transcribing...</span>
              </div>
            )}

            {transcription && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">Transcription:</span>
                </div>
                <div 
                  className="p-3 bg-muted rounded-md text-sm"
                  data-testid="text-transcription"
                >
                  {transcription}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
