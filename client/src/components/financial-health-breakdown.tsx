import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, AlertCircle, CheckCircle, Lightbulb } from "lucide-react";

interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  currentValue: string;
  explanation: string;
  suggestion: string;
}

interface HealthScoreData {
  score: number;
  grade: string;
  explanation: string;
  factors: HealthFactor[];
  recommendations?: string[];
}

interface FinancialHealthBreakdownProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  healthData: HealthScoreData | null;
}

export function FinancialHealthBreakdown({ open, onOpenChange, healthData }: FinancialHealthBreakdownProps) {
  if (!healthData) return null;

  const getGradeBadgeVariant = (grade: string) => {
    if (grade === 'Excellent') return 'default';
    if (grade === 'Good') return 'default';
    return 'secondary';
  };

  const getGradeColor = (grade: string) => {
    if (grade === 'Excellent') return 'text-success';
    if (grade === 'Good') return 'text-primary';
    if (grade === 'Fair') return 'text-warning';
    return 'text-destructive';
  };

  const getFactorStatusIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-success" />;
    if (score >= 60) return <TrendingUp className="h-5 w-5 text-primary" />;
    return <AlertCircle className="h-5 w-5 text-warning" />;
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-success';
    if (score >= 60) return 'bg-primary';
    if (score >= 40) return 'bg-warning';
    return 'bg-destructive';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-health-breakdown">
        <DialogHeader>
          <DialogTitle className="text-2xl">Financial Health Score Breakdown</DialogTitle>
        </DialogHeader>

        {/* Overall Score Section */}
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-2">Overall Score</div>
                  <div className={`text-6xl font-bold ${getGradeColor(healthData.grade)}`} data-testid="text-breakdown-score">
                    {healthData.score}
                  </div>
                </div>
                <Badge variant={getGradeBadgeVariant(healthData.grade)} className="text-base px-4 py-2" data-testid="badge-breakdown-grade">
                  {healthData.grade}
                </Badge>
              </div>
              <Progress value={healthData.score} className="h-3 mb-3" />
              <p className="text-sm text-muted-foreground">
                {healthData.explanation}
              </p>
            </CardContent>
          </Card>

          <Separator />

          {/* Factors Breakdown */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contributing Factors</h3>
            {healthData.factors.map((factor, index) => {
              const contribution = Math.round(factor.score * factor.weight);
              
              return (
                <Card key={index} className="hover-elevate" data-testid={`factor-card-${index}`}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Factor Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          {getFactorStatusIcon(factor.score)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base mb-1" data-testid={`factor-name-${index}`}>
                              {factor.name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Current: <span className="font-medium text-foreground">{factor.currentValue}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground" data-testid={`factor-contribution-${index}`}>
                            +{contribution}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            points
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Factor Score</span>
                          <span>{Math.round(factor.score)}/100</span>
                        </div>
                        <div className="relative h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${getProgressColor(factor.score)} transition-all`}
                            style={{ width: `${factor.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Explanation */}
                      <div className="pt-2 space-y-2">
                        <p className="text-sm text-muted-foreground">
                          {factor.explanation}
                        </p>
                        
                        {/* Suggestion */}
                        {factor.suggestion && (
                          <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
                            <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-foreground">
                              <span className="font-medium">Suggestion: </span>
                              {factor.suggestion}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Overall Recommendations */}
          {healthData.recommendations && healthData.recommendations.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  Personalized Recommendations
                </h3>
                <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="pt-6">
                    <ul className="space-y-2">
                      {healthData.recommendations.map((rec, index) => (
                        <li key={index} className="flex gap-3 text-sm" data-testid={`recommendation-${index}`}>
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
