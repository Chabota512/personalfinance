import { useState, useEffect } from "react";
import { useParams, Link } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  useLesson, 
  useLessons, 
  useLessonProgress, 
  useUpdateLessonProgress,
  useLessonQuiz,
  useSubmitQuiz
} from "@/lib/api";
import { 
  ArrowLeft, 
  ArrowRight, 
  BookOpen, 
  CheckCircle2, 
  Clock,
  Trophy,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LessonViewer() {
  const { id } = useParams();
  const { toast } = useToast();
  const [showQuiz, setShowQuiz] = useState(false);

  const { data: lesson, isLoading: lessonLoading } = useLesson(id!);
  const { data: allLessons } = useLessons();
  const { data: progress } = useLessonProgress(id!);
  const updateProgress = useUpdateLessonProgress();

  useEffect(() => {
    if (lesson && progress?.status === 'not_started') {
      updateProgress.mutate({
        lessonId: id!,
        status: 'in_progress'
      });
    }
  }, [lesson, progress]);

  const currentLessonIndex = allLessons?.findIndex((l: any) => l.id === id) ?? -1;
  const previousLesson = currentLessonIndex > 0 ? allLessons[currentLessonIndex - 1] : null;
  const nextLesson = currentLessonIndex >= 0 && currentLessonIndex < (allLessons?.length ?? 0) - 1 
    ? allLessons[currentLessonIndex + 1] 
    : null;

  const handleMarkComplete = () => {
    updateProgress.mutate({
      lessonId: id!,
      status: 'completed'
    }, {
      onSuccess: () => {
        toast({
          title: "Lesson Completed!",
          description: "Great job! Your progress has been saved.",
        });
      }
    });
  };

  if (lessonLoading) {
    return (
      <div className="p-4 sm:p-6 space-y-6 max-w-[900px] mx-auto">
        <Skeleton className="h-8 w-full max-w-md" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <Alert>
          <AlertDescription>Lesson not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (showQuiz) {
    return <QuizComponent lessonId={id!} onClose={() => setShowQuiz(false)} />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px] mx-auto">
      <div className="flex items-center gap-2">
        <Link href="/learn">
          <Button variant="ghost" size="icon" data-testid="button-back-to-lessons">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold">{lesson.title}</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge data-testid="badge-lesson-category">{lesson.category}</Badge>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {lesson.estimatedMinutes} minutes
            </span>
            {progress?.status === 'completed' && (
              <Badge className="bg-green-500/10 text-green-700 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Completed
              </Badge>
            )}
            {progress?.score !== null && progress?.score !== undefined && (
              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400">
                <Trophy className="h-3 w-3 mr-1" />
                Score: {progress.score}%
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {lesson.objectives && lesson.objectives.length > 0 && (
            <div className="mb-6 p-4 bg-primary/5 rounded-lg">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Learning Objectives
              </h3>
              <ul className="space-y-2">
                {lesson.objectives.map((objective: string, idx: number) => (
                  <li key={idx} className="text-sm flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="prose prose-sm sm:prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {lesson.content}
            </ReactMarkdown>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
        <div className="flex gap-2">
          {previousLesson && (
            <Link href={`/learn/${previousLesson.id}`}>
              <Button variant="outline" data-testid="button-previous-lesson">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
            </Link>
          )}
          {nextLesson && (
            <Link href={`/learn/${nextLesson.id}`}>
              <Button variant="outline" data-testid="button-next-lesson">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          )}
        </div>

        <div className="flex gap-2">
          {progress?.status !== 'completed' && (
            <Button 
              onClick={handleMarkComplete}
              variant="outline"
              data-testid="button-mark-complete"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Mark as Complete
            </Button>
          )}
          <Button 
            onClick={() => setShowQuiz(true)}
            data-testid="button-take-quiz"
          >
            Take Quiz
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuizComponent({ lessonId, onClose }: { lessonId: string; onClose: () => void }) {
  const { toast } = useToast();
  const { data: quizData, isLoading } = useLessonQuiz(lessonId);
  const submitQuiz = useSubmitQuiz();
  
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleAnswerSelect = (questionId: string, answerIndex: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerIndex
    }));
  };

  const handleSubmit = () => {
    if (Object.keys(answers).length < quizData.length) {
      toast({
        title: "Incomplete Quiz",
        description: "Please answer all questions before submitting.",
        variant: "destructive"
      });
      return;
    }

    const formattedAnswers = quizData.map((q: any) => ({
      questionId: q.id,
      selectedAnswer: answers[q.id]
    }));

    submitQuiz.mutate({
      lessonId,
      answers: formattedAnswers
    }, {
      onSuccess: (data) => {
        setResults(data);
        setSubmitted(true);
        toast({
          title: "Quiz Submitted!",
          description: `You scored ${data.score}%. ${data.score >= 70 ? 'Great job!' : 'Keep learning!'}`,
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!quizData || quizData.length === 0) {
    return (
      <div className="p-6 max-w-[900px] mx-auto">
        <Alert>
          <AlertDescription>No quiz available for this lesson.</AlertDescription>
        </Alert>
        <Button onClick={onClose} className="mt-4">Back to Lesson</Button>
      </div>
    );
  }

  const calculateProgress = () => {
    return (Object.keys(answers).length / quizData.length) * 100;
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[900px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold">Quiz</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          data-testid="button-close-quiz"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {!submitted && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Object.keys(answers).length} / {quizData.length}</span>
              </div>
              <Progress value={calculateProgress()} />
            </div>
          </CardContent>
        </Card>
      )}

      {submitted && results && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6 text-primary" />
              Quiz Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-2">{results.score}%</div>
                <p className="text-muted-foreground">
                  {results.correctCount} out of {results.totalQuestions} correct
                </p>
              </div>
              {results.score >= 70 ? (
                <Alert className="bg-green-500/10 border-green-500/20">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600 dark:text-green-500">
                    Excellent work! You've mastered this lesson.
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertDescription>
                    Review the lesson content and try again to improve your score.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {quizData.map((question: any, index: number) => {
          const isAnswered = answers[question.id] !== undefined;
          const selectedAnswer = answers[question.id];
          const isCorrect = submitted && selectedAnswer === question.correctAnswer;
          const isWrong = submitted && isAnswered && selectedAnswer !== question.correctAnswer;

          return (
            <Card 
              key={question.id}
              className={
                submitted 
                  ? isCorrect 
                    ? "border-green-500 bg-green-500/5" 
                    : isWrong 
                      ? "border-red-500 bg-red-500/5"
                      : ""
                  : ""
              }
              data-testid={`card-question-${index}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">
                  Question {index + 1}
                </CardTitle>
                <p className="text-base font-normal">{question.question}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(question.options || question.answers).map((answer: string, answerIndex: number) => {
                  const isSelected = selectedAnswer === answerIndex;
                  const isCorrectAnswer = parseInt(question.correctAnswer) === answerIndex;
                  
                  return (
                    <button
                      key={answerIndex}
                      onClick={() => !submitted && handleAnswerSelect(question.id, answerIndex)}
                      disabled={submitted}
                      className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                        submitted
                          ? isCorrectAnswer
                            ? "border-green-500 bg-green-500/10"
                            : isSelected
                              ? "border-red-500 bg-red-500/10"
                              : "border-border"
                          : isSelected
                            ? "border-primary bg-primary/10"
                            : "border-border hover-elevate"
                      } ${submitted ? "cursor-not-allowed" : "cursor-pointer"}`}
                      data-testid={`button-answer-${index}-${answerIndex}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          submitted
                            ? isCorrectAnswer
                              ? "border-green-500 bg-green-500"
                              : isSelected
                                ? "border-red-500 bg-red-500"
                                : "border-border"
                            : isSelected
                              ? "border-primary bg-primary"
                              : "border-border"
                        }`}>
                          {((submitted && isCorrectAnswer) || (!submitted && isSelected)) && (
                            <CheckCircle2 className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <span className="flex-1">{answer}</span>
                      </div>
                    </button>
                  );
                })}
                {submitted && question.explanation && (
                  <div className="mt-4 p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                    <p className="text-sm font-medium mb-1 text-blue-700 dark:text-blue-400">Explanation:</p>
                    <p className="text-sm text-muted-foreground">{question.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex gap-4">
        <Button 
          variant="outline" 
          onClick={onClose}
          data-testid="button-back-to-lesson"
        >
          Back to Lesson
        </Button>
        {!submitted && (
          <Button 
            onClick={handleSubmit}
            disabled={submitQuiz.isPending}
            data-testid="button-submit-quiz"
          >
            {submitQuiz.isPending ? "Submitting..." : "Submit Quiz"}
          </Button>
        )}
        {submitted && (
          <Button 
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
              setResults(null);
            }}
            data-testid="button-retake-quiz"
          >
            Retake Quiz
          </Button>
        )}
      </div>
    </div>
  );
}
