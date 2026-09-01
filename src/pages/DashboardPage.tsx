import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  LandPlot,
  MapPin,
  MoreHorizontal,
  SearchCheck,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEMO_ACTIVITY_LOGS, DEMO_INVESTIGATORS, DEMO_PARCELS } from '../data/fields';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';

const parcels = DEMO_PARCELS;

export function DashboardPage() {
  const total = parcels.length;
  const completed = parcels.filter((parcel) => parcel.status === 'completed').length;
  const inProgress = parcels.filter((parcel) => parcel.status === 'in_progress').length;
  const review = parcels.filter((parcel) => parcel.status === 'needs_review').length;
  const unassigned = parcels.filter((parcel) => parcel.status === 'pending').length;
  const highRisk = parcels.filter((parcel) => parcel.riskScore >= 75);
  const completionRate = Math.round((completed / total) * 100);
  const totalArea = parcels.reduce((sum, parcel) => sum + parcel.areaM2, 0);
  const surveyedArea = parcels.filter((parcel) => parcel.status === 'completed').reduce((sum, parcel) => sum + parcel.areaM2, 0);

  const regionRows = Array.from(new Set(parcels.map((parcel) => parcel.adminArea.split(' ')[0])))
    .map((name) => {
      const regionParcels = parcels.filter((parcel) => parcel.adminArea.startsWith(name));
      const done = regionParcels.filter((parcel) => parcel.status === 'completed').length;
      return { name, total: regionParcels.length, done, rate: Math.round((done / regionParcels.length) * 100) };
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 6);

  return (
    <div className="dashboard-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow">2026년 9월 1일 화요일</span>
          <h2>안녕하세요, 김조사님.</h2>
          <p>세종시 농지 전수조사 현황과 오늘 처리할 업무를 확인하세요.</p>
        </div>
        <Link to="/map" className="primary-button"><MapPin size={17} /> 지도에서 조사 시작</Link>
      </section>

      <section className="attention-strip">
        <div className="attention-icon"><AlertTriangle size={20} /></div>
        <div>
          <strong>오늘 확인이 필요한 고위험 필지가 {highRisk.length}건 있습니다.</strong>
          <span>팜맵·지적 중첩률이 낮거나 전용 의심 징후가 있는 필지를 우선 확인해 주세요.</span>
        </div>
        <Link to="/map?risk=high">고위험 필지 보기 <ArrowRight size={15} /></Link>
      </section>

      <section className="kpi-grid" aria-label="핵심 현황">
        <article className="kpi-card kpi-primary">
          <div className="kpi-head"><span>전체 조사대상</span><div><LandPlot size={19} /></div></div>
          <div className="kpi-value"><strong>{total}</strong><span>필지</span></div>
          <p>{(totalArea / 10_000).toFixed(1)} ha · 세종시 9개 읍면</p>
        </article>
        <article className="kpi-card">
          <div className="kpi-head"><span>조사 완료</span><div className="green"><CheckCircle2 size={19} /></div></div>
          <div className="kpi-value"><strong>{completed}</strong><span>필지</span><em>+2 오늘</em></div>
          <p>{(surveyedArea / 10_000).toFixed(1)} ha 현장 확인 완료</p>
        </article>
        <article className="kpi-card">
          <div className="kpi-head"><span>조사 진행 중</span><div className="blue"><ClipboardList size={19} /></div></div>
          <div className="kpi-value"><strong>{inProgress}</strong><span>필지</span></div>
          <p>현장 임시저장 포함</p>
        </article>
        <article className="kpi-card">
          <div className="kpi-head"><span>검수 대기</span><div className="violet"><FileCheck2 size={19} /></div></div>
          <div className="kpi-value"><strong>{review}</strong><span>필지</span><em className="warning">1건 기한임박</em></div>
          <p>평균 대기 6시간</p>
        </article>
        <article className="kpi-card">
          <div className="kpi-head"><span>미배정</span><div className="amber"><UserRound size={19} /></div></div>
          <div className="kpi-value"><strong>{unassigned}</strong><span>필지</span></div>
          <p>고위험 {parcels.filter((p) => p.status === 'pending' && p.riskScore >= 75).length}건 우선 배정 필요</p>
        </article>
      </section>

      <section className="dashboard-grid">
        <article className="panel progress-panel">
          <div className="panel-head">
            <div><span className="panel-kicker">조사 진척도</span><h3>읍면별 완료 현황</h3></div>
            <button className="ghost-button">전체 지역 <ArrowRight size={14} /></button>
          </div>
          <div className="progress-layout">
            <div className="progress-ring" style={{ '--progress': `${completionRate * 3.6}deg` } as React.CSSProperties}>
              <div><strong>{completionRate}%</strong><span>전체 완료율</span></div>
            </div>
            <div className="region-progress-list">
              {regionRows.map((region) => (
                <div className="region-progress" key={region.name}>
                  <div><strong>{region.name}</strong><span>{region.done}/{region.total} 필지</span><b>{region.rate}%</b></div>
                  <div className="progress-track"><i style={{ width: `${region.rate}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          <div className="panel-footnote"><TrendingUp size={14} /><span>지난주보다 <b>13%p</b> 빨라졌습니다.</span></div>
        </article>

        <article className="panel schedule-panel">
          <div className="panel-head">
            <div><span className="panel-kicker">오늘의 일정</span><h3>현장조사 계획</h3></div>
            <button className="icon-button subtle" aria-label="더보기"><MoreHorizontal size={18} /></button>
          </div>
          <div className="schedule-date">
            <div><strong>01</strong><span>9월 · 화</span></div>
            <p><b>4개 필지</b> · 예상 3시간 20분</p>
          </div>
          <div className="schedule-timeline">
            <div className="schedule-item current">
              <time>09:00</time><i /><div><span>조사 중</span><strong>조치원읍 봉산리 92</strong><p>시설재배 · 3,106㎡</p></div>
            </div>
            <div className="schedule-item">
              <time>11:30</time><i /><div><span>예정</span><strong>연서면 월하리 390</strong><p>밭 · 2,105㎡</p></div>
            </div>
            <div className="schedule-item">
              <time>14:00</time><i /><div><span>예정</span><strong>금남면 영곡리 218</strong><p>밭 · 3,346㎡</p></div>
            </div>
          </div>
          <Link to="/queue" className="secondary-button full">내 조사 일정 보기 <ArrowRight size={15} /></Link>
        </article>
      </section>

      <section className="dashboard-grid lower-grid">
        <article className="panel risk-panel">
          <div className="panel-head">
            <div><span className="panel-kicker">우선 확인</span><h3>고위험 필지</h3></div>
            <Link to="/map?risk=high" className="ghost-button">전체 보기 <ArrowRight size={14} /></Link>
          </div>
          <div className="table-wrap">
            <table className="data-table compact-table">
              <thead><tr><th>소재지</th><th>위험 사유</th><th>위험도</th><th>상태</th></tr></thead>
              <tbody>
                {highRisk.slice(0, 4).map((parcel) => (
                  <tr key={parcel.id}>
                    <td><Link to={`/map?parcel=${parcel.id}`}><strong>{parcel.address.split(' ').slice(-2).join(' ')}</strong><span>{parcel.pnu}</span></Link></td>
                    <td>{parcel.reasons[0]}</td>
                    <td><RiskBadge score={parcel.riskScore} /></td>
                    <td><StatusBadge value={parcel.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel activity-panel">
          <div className="panel-head">
            <div><span className="panel-kicker">실시간 기록</span><h3>최근 활동</h3></div>
            <button className="icon-button subtle" aria-label="더보기"><MoreHorizontal size={18} /></button>
          </div>
          <div className="activity-list">
            {DEMO_ACTIVITY_LOGS.slice(0, 5).map((activity, index) => {
              const investigator = DEMO_INVESTIGATORS.find((person) => person.id === activity.actorId);
              const Icon = activity.type === 'completed' ? CheckCircle2 : activity.type === 'assigned' ? UserRound : SearchCheck;
              return (
                <div className="activity-row" key={activity.id}>
                  <div className={`activity-icon type-${activity.type}`}><Icon size={15} /></div>
                  <div><p>{activity.message}</p><span>{investigator?.name ?? '시스템'} · {index === 0 ? '방금 전' : `${index * 17 + 8}분 전`}</span></div>
                </div>
              );
            })}
          </div>
        </article>
      </section>

      <div className="reference-notice">
        <CalendarDays size={16} />
        <p><strong>판정 유의사항</strong> 팜맵과 자동 위험도는 조사 보조자료입니다. 최종 판정은 현장 증빙과 행정자료를 검수한 권한자가 확정해야 합니다.</p>
      </div>
    </div>
  );
}
