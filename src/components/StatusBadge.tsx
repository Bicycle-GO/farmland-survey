import type { SurveyDecision, SurveyStage, SurveyStatus } from '../types';
import { SURVEY_DECISION_LABELS, SURVEY_STAGE_LABELS, SURVEY_STATUS_LABELS } from '../types';

type BadgeKind = SurveyStatus | SurveyStage | SurveyDecision | 'high' | 'medium' | 'low';

const labels: Partial<Record<BadgeKind, string>> = {
  ...SURVEY_DECISION_LABELS,
  ...SURVEY_STAGE_LABELS,
  ...SURVEY_STATUS_LABELS,
  high: '고위험',
  medium: '주의',
  low: '낮음',
};

export function StatusBadge({ value, dot = true }: { value: BadgeKind; dot?: boolean }) {
  return (
    <span className={`status-badge status-${value}`}>
      {dot && <i />}
      {labels[value] ?? value}
    </span>
  );
}

export function RiskBadge({ score }: { score: number }) {
  const level = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
  return <StatusBadge value={level} />;
}
