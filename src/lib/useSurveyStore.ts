import { useSyncExternalStore } from 'react';
import { getSurveySnapshot, subscribeSurveyStore } from './surveyStore';

export function useSurveyStore() {
  return useSyncExternalStore(subscribeSurveyStore, getSurveySnapshot, getSurveySnapshot);
}
