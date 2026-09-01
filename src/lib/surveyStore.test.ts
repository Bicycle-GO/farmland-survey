import { beforeEach, describe, expect, it } from 'vitest';
import { importPnuCsv } from './csv';
import {
  assignParcel,
  completeSurvey,
  getParcelById,
  getSurveyState,
  resetSurveyStore,
  startSurvey,
  submitParcelForReview,
} from './surveyStore';

describe('survey store workflow', () => {
  beforeEach(() => {
    localStorage.clear();
    resetSurveyStore('inv-005');
  });

  it('moves an unassigned parcel through field survey, review and completion', () => {
    assignParcel('parcel-005', 'inv-002', '2026-09-08', 'inv-005');
    expect(getParcelById('parcel-005')?.status).toBe('assigned');

    startSurvey('parcel-005', 'inv-002');
    expect(getParcelById('parcel-005')?.stage).toBe('field_survey');

    submitParcelForReview('parcel-005', {
      decision: 'suspected_conversion',
      notes: '현장 성토와 자재 적치를 확인했습니다.',
      reasons: ['성토 의심'],
      photoCount: 3,
      gpsVerified: true,
    }, 'inv-002');
    expect(getParcelById('parcel-005')?.status).toBe('needs_review');

    completeSurvey('parcel-005', {
      decision: 'suspected_conversion',
      notes: '검수 완료',
    }, 'inv-005');
    expect(getParcelById('parcel-005')).toMatchObject({
      stage: 'completed',
      status: 'completed',
      decision: 'suspected_conversion',
    });
    expect(getSurveyState().activities[0].type).toBe('completed');
  });
});

describe('PNU CSV parser', () => {
  it('validates and converts a Korean-header row', () => {
    const result = importPnuCsv(
      'PNU,주소,면적㎡,농지유형,작물,위도,경도\n3611034021101440000,세종특별자치시 금남면 용포리 144,2140,밭,콩,36.46,127.28',
    );
    expect(result.errors).toHaveLength(0);
    expect(result.parcels).toHaveLength(1);
    expect(result.parcels[0]).toMatchObject({
      pnu: '3611034021101440000',
      category: '밭',
      crop: '콩',
      status: 'pending',
    });
    expect(result.parcels[0].coordinates).toHaveLength(5);
  });

  it('rejects a malformed PNU', () => {
    const result = importPnuCsv('PNU,주소\n1234,잘못된 필지');
    expect(result.parcels).toHaveLength(0);
    expect(result.errors[0]?.message).toContain('19자리');
  });
});
