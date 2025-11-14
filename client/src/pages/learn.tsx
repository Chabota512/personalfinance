import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Clock, CheckCircle2, Circle, PlayCircle } from "lucide-react";
import { useLessons, useUserProgress } from "@/lib/api";
import { Link } from "wouter";
import { useMemo } from "react";

const categoryIcons: Record<string, string> = {
  budgeting: "💰",
  saving: "🏦",
  investing: "📈",
  credit: "💳"
};

const categoryColors: Record<string, string> = {
  budgeting: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  saving: "bg-green-500/10 text-green-700 dark:text-green-400",
  investing: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  credit: "bg-orange-500/10 text-orange-700 dark:text-orange-400"
};

export default function LearnPage() {
  const { data: lessons, isLoading: lessonsLoading } = useLessons();
  const { data: userProgress, isLoading: progressLoading } = useUserProgress();

  const categorizedLessons = useMemo(() => {
    if (!lessons) return {};
    
    return lessons.reduce((acc: any, lesson: any) => {
      if (!acc[lesson.category]) {
        acc[lesson.category] = [];
      }
      acc[lesson.category].push(lesson);
      return acc;
    }, {});
  }, [lessons]);

  const progressStats = useMemo(() => {
    if (!userProgress || !lessons) {
      return { total: 0, completed: 0, inProgress: 0, notStarted: 0 };
    }

    const completed = userProgress.filter((p: any) => p.status === 'completed').length;
    const inProgress = userProgress.filter((p: any) => p.status === 'in_progress').length;
    const total = lessons.length;
    const notStarted = total - completed - inProgress;

    return { total, completed, inProgress, notStarted };
  }, [userProgress, lessons]);

  const getProgressForLesson = (lessonId: string) => {
    if (!userProgress) return null;
    return userProgress.find((p: any) => p.lessonId === lessonId);
  };

  if (lessonsLoading || progressLoading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const overallProgress = progressStats.total > 0 
    ? (progressStats.completed / progressStats.total) * 100 
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto px-4 py-4 md:px-6 md:py-6 space-y-4">
        <div>
          <h1 className="text-display-xl md:text-display-2xl font-bold text-foreground">Learning Center</h1>
          <p className="text-body-md text-muted-foreground">
            Master personal finance with structured lessons and interactive quizzes
          </p>
        </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lessons</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold" data-testid="text-total-lessons">{progressStats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-500" data-testid="text-completed-lessons">
              {progressStats.completed}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-500" data-testid="text-inprogress-lessons">
              {progressStats.inProgress}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-3xl font-bold" data-testid="text-overall-progress">
                {Math.round(overallProgress)}%
              </div>
              <Progress value={overallProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {Object.entries(categorizedLessons).map(([category, categoryLessons]: [string, any]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{categoryIcons[category] || "📚"}</span>
            <h2 className="text-display-md md:text-display-lg font-bold capitalize">{category}</h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {categoryLessons
              .sort((a: any, b: any) => a.orderIndex - b.orderIndex)
              .map((lesson: any) => {
                const progress = getProgressForLesson(lesson.id);
                const status = progress?.status || 'not_started';
                const score = progress?.score;

                return (
                  <Card 
                    key={lesson.id} 
                    className="hover-elevate transition-all"
                    data-testid={`card-lesson-${lesson.slug}`}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge 
                              className={categoryColors[category] || ""}
                              data-testid={`badge-category-${lesson.slug}`}
                            >
                              {category}
                            </Badge>
                            {status === 'completed' && (
                              <Badge 
                                className="bg-green-500/10 text-green-700 dark:text-green-400"
                                data-testid={`badge-status-${lesson.slug}`}
                              >
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Completed
                              </Badge>
                            )}
                            {status === 'in_progress' && (
                              <Badge 
                                className="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                data-testid={`badge-status-${lesson.slug}`}
                              >
                                <PlayCircle className="h-3 w-3 mr-1" />
                                In Progress
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{lesson.title}</CardTitle>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {lesson.estimatedMinutes} min
                            </span>
                            {score !== null && score !== undefined && (
                              <span className="flex items-center gap-1 text-green-600 dark:text-green-500 font-medium">
                                Score: {score}%
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {lesson.objectives && lesson.objectives.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Learning Objectives:</p>
                          <ul className="space-y-1">
                            {lesson.objectives.slice(0, 3).map((objective: string, idx: number) => (
                              <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                                <Circle className="h-3 w-3 mt-0.5 fill-primary text-primary flex-shrink-0" />
                                <span>{objective}</span>
                              </li>
                            ))}
                            {lesson.objectives.length > 3 && (
                              <li className="text-sm text-muted-foreground italic">
                                +{lesson.objectives.length - 3} more...
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                      
                      <Link href={`/learn/${lesson.id}`}>
                        <Button 
                          className="w-full" 
                          variant={status === 'not_started' ? 'default' : 'outline'}
                          data-testid={`button-start-lesson-${lesson.slug}`}
                        >
                          {status === 'not_started' && 'Start Lesson'}
                          {status === 'in_progress' && 'Continue Lesson'}
                          {status === 'completed' && 'Review Lesson'}
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </div>
      ))}

      {(!lessons || lessons.length === 0) && (
        <Card>
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Lessons Available</h3>
            <p className="text-muted-foreground">
              Lessons are being prepared. Check back soon!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
    </div>
  );
}
