import { useMemo, useState, type CSSProperties } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  FileText,
  LandPlot,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { downloadParcelsCsv } from '../lib/csv';
import { getSurveyStatistics } from '../lib/surveyStore';
import { useSurveyStore } from '../lib/useSurveyStore';
import type { SurveyDecision } from '../types';
import { SURVEY_DECISION_LABELS } from '../types';

const decisionColors: Record<SurveyDecision, string> = {
  pending: '#aab4af',
  cultivated: '#4a956d',
  fallow: '#dfa048',
  suspected_conversion: '#c45f54',
  non_farmland: '#68766e',
};

export function ReportsPage() {
  const state = useSurveyStore();
  const [unit, setUnit] = useState<'count' | 'area'>('count');
  const stats = getSurveyStatistics(state.parcels);
  const completed = state.parcels.filter((parcel) => parcel.status === 'completed');

  const regionStats = useMemo(() => Array.from(new Set(state.parcels.map((parcel) => parcel.adminArea.split(' ')[0]))).map((region) => {
    const parcels = state.parcels.filter((parcel) => parcel.adminArea.startsWith(region));
    const done = parcels.filter((parcel) => parcel.status === 'completed');
    const risk = parcels.filter((parcel) => parcel.riskScore >= 75);
    return {
      region,
      total: parcels.length,
      done: done.length,
      rate: Math.round((done.length / parcels.length) * 100),
      area: parcels.reduce((sum, parcel) => sum + parcel.areaM2, 0),
      risk: risk.length,
    };
  }).sort((a, b) => b.total - a.total), [state.parcels]);

  const decisionData = (Object.keys(stats.byDecision) as SurveyDecision[]).map((decision) => {
    const parcels = state.parcels.filter((parcel) => parcel.decision === decision);
    return {
      decision,
      count: parcels.length,
      area: parcels.reduce((sum, parcel) => sum + parcel.areaM2, 0),
    };
  });
  const totalValue = decisionData.reduce((sum, item) => sum + (unit === 'count' ? item.count : item.area), 0) || 1;
  let offset = 0;
  const segments = decisionData.map((item) => {
    const value = unit === 'count' ? item.count : item.area;
    const length = (value / totalValue) * 100;
    const segment = { ...item, value, length, offset };
    offset += length;
    return segment;
  });

  return (
    <div className="reports-page">
      <section className="page-intro queue-intro">
        <div><span className="eyebrow">2026 정기 전수조사</span><h2>조사 성과와 위험 현황</h2><p>필지수와 면적을 함께 살펴보고 행정 보고용 데이터를 내보낼 수 있습니다.</p></div>
        <div className="intro-actions"><button className="secondary-button"><FileText size={16} /> 보고서 미리보기</button><button className="primary-button" onClick={() => downloadParcelsCsv(state.parcels, state.investigators)}><ArrowDownToLine size={16} /> 전체 CSV</button></div>
      </section>

      <div className="report-filterbar">
        <div><label>조사 캠페인<select><option>2026 정기 전수조사</option></select><ChevronDown size={13} /></label><label>지역<select><option>세종특별자치시 전체</option></select><ChevronDown size={13} /></label><label>기간<select><option>2026.05.01 – 2026.12.31</option></select><ChevronDown size={13} /></label></div>
        <span>마지막 집계 2026.09.01 11:20</span>
      </div>

      <section className="report-kpi-grid">
        <article><div className="summary-icon green"><LandPlot size={19} /></div><span>조사대상 면적</span><strong>{(stats.totalAreaM2 / 10_000).toFixed(1)}<small>ha</small></strong><p>{stats.total}개 필지</p></article>
        <article><div className="summary-icon blue"><CheckCircle2 size={19} /></div><span>완료 면적</span><strong>{(stats.surveyedAreaM2 / 10_000).toFixed(1)}<small>ha</small></strong><p>{stats.completed}개 필지 완료</p></article>
        <article><div className="summary-icon amber"><TrendingUp size={19} /></div><span>전체 완료율</span><strong>{stats.completionRate}<small>%</small></strong><p>전주 대비 +13%p</p></article>
        <article><div className="summary-icon red"><AlertTriangle size={19} /></div><span>고위험 대상</span><strong>{stats.highRisk}<small>건</small></strong><p>{state.parcels.filter((p) => p.decision === 'suspected_conversion').length}건 전용 의심</p></article>
      </section>

      <section className="report-grid">
        <article className="panel decision-chart-panel">
          <div className="panel-head"><div><span className="panel-kicker">판정 분포</span><h3>조사 결과 구성</h3></div><div className="segmented chart-unit"><button className={unit === 'count' ? 'active' : ''} onClick={() => setUnit('count')}>필지수</button><button className={unit === 'area' ? 'active' : ''} onClick={() => setUnit('area')}>면적</button></div></div>
          <div className="donut-layout">
            <div className="donut-chart-wrap">
              <svg className="donut-chart" viewBox="0 0 42 42" role="img" aria-label="판정 분포 도넛 차트">
                <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#edf1ee" strokeWidth="5" />
                {segments.filter((segment) => segment.length > 0).map((segment) => <circle key={segment.decision} cx="21" cy="21" r="15.915" fill="transparent" stroke={decisionColors[segment.decision]} strokeWidth="5" strokeDasharray={`${segment.length} ${100 - segment.length}`} strokeDashoffset={25 - segment.offset} />)}
              </svg>
              <div><strong>{unit === 'count' ? stats.total : (stats.totalAreaM2 / 10_000).toFixed(1)}</strong><span>{unit === 'count' ? '전체 필지' : '전체 ha'}</span></div>
            </div>
            <div className="donut-legend">
              {segments.map((segment) => <div key={segment.decision}><i style={{ background: decisionColors[segment.decision] }} /><span>{SURVEY_DECISION_LABELS[segment.decision]}</span><strong>{unit === 'count' ? `${segment.count}건` : `${(segment.area / 10_000).toFixed(2)}ha`}</strong><em>{Math.round(segment.length)}%</em></div>)}
            </div>
          </div>
        </article>

        <article className="panel weekly-chart-panel">
          <div className="panel-head"><div><span className="panel-kicker">주간 추이</span><h3>누적 조사 완료</h3></div><button className="ghost-button">최근 6주 <ChevronDown size={13} /></button></div>
          <div className="bar-chart" aria-label="주간 누적 조사 차트">
            {[
              { label: '7월 4주', value: 18 },
              { label: '8월 1주', value: 27 },
              { label: '8월 2주', value: 35 },
              { label: '8월 3주', value: 51 },
              { label: '8월 4주', value: 66 },
              { label: '9월 1주', value: 82 },
            ].map((week, index) => <div key={week.label} style={{ '--bar-height': `${week.value}%` } as CSSProperties}><span>{week.value}</span><i style={{ height: `${week.value}%` }} className={index === 5 ? 'current' : ''} /><small>{week.label}</small></div>)}
            <div className="target-line"><span>목표 75%</span></div>
          </div>
          <div className="trend-callout"><TrendingUp size={16} /><p><strong>현재 추세라면 11월 18일 완료 예상</strong><span>계획보다 6일 빠른 속도입니다.</span></p></div>
        </article>
      </section>

      <section className="panel region-report-panel">
        <div className="panel-head"><div><span className="panel-kicker">지역 성과</span><h3>읍면별 조사 현황</h3></div><button className="secondary-button" onClick={() => downloadParcelsCsv(completed, state.investigators)}><ArrowDownToLine size={14} /> 완료자료 내보내기</button></div>
        <div className="table-wrap"><table className="data-table region-report-table"><thead><tr><th>지역</th><th>조사대상</th><th>대상면적</th><th>완료</th><th>완료율</th><th>고위험</th><th>진척도</th></tr></thead><tbody>{regionStats.map((row) => <tr key={row.region}><td><div className="region-name"><MapPin size={14} /><strong>{row.region}</strong></div></td><td>{row.total}필지</td><td>{(row.area / 10_000).toFixed(2)}ha</td><td>{row.done}필지</td><td><strong>{row.rate}%</strong></td><td>{row.risk ? <span className="risk-count">{row.risk}건</span> : <span className="none-count">없음</span>}</td><td><div className="table-progress"><i style={{ width: `${row.rate}%` }} /></div></td></tr>)}</tbody></table></div>
      </section>

      <div className="report-footnote"><BarChart3 size={15} /><p>통계는 데모 필지 데이터의 현재 상태를 실시간 집계합니다. 운영 환경에서는 원천 스냅샷·판정 규칙·집계 시각을 보고서와 함께 고정 보관합니다.</p></div>
    </div>
  );
}
