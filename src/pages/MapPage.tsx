import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  FileClock,
  Filter,
  Info,
  Layers3,
  ListFilter,
  LocateFixed,
  MapPinned,
  Ruler,
  Search,
  ShieldAlert,
  Sprout,
  UserRound,
  X,
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { FarmMapView } from '../components/FarmMapView';
import { AssignmentModal, InspectionModal, ReviewModal } from '../components/SurveyModals';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { startSurvey } from '../lib/surveyStore';
import { useSurveyStore } from '../lib/useSurveyStore';
import type { Parcel, SurveyStatus } from '../types';
import { SURVEY_DECISION_LABELS } from '../types';

const statusFilters: Array<{ value: 'all' | SurveyStatus; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'pending', label: '미배정' },
  { value: 'assigned', label: '배정' },
  { value: 'in_progress', label: '조사중' },
  { value: 'needs_review', label: '검수' },
  { value: 'completed', label: '완료' },
];

type ModalState = 'assign' | 'inspect' | 'review' | null;

export function MapPage() {
  const state = useSurveyStore();
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | SurveyStatus>('all');
  const [risk, setRisk] = useState(searchParams.get('risk') === 'high' ? 'high' : 'all');
  const [region, setRegion] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(() => searchParams.get('parcel') ?? (window.innerWidth > 680 ? 'parcel-007' : null));
  const [detailsTab, setDetailsTab] = useState<'summary' | 'survey' | 'evidence' | 'history'>('summary');
  const [modal, setModal] = useState<ModalState>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'map'>('map');

  const regions = useMemo(() => Array.from(new Set(state.parcels.map((parcel) => parcel.adminArea.split(' ')[0]))), [state.parcels]);
  const filtered = useMemo(() => state.parcels.filter((parcel) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || [parcel.address, parcel.pnu, parcel.farmMapId, parcel.crop].some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesQuery
      && (status === 'all' || parcel.status === status)
      && (risk === 'all' || (risk === 'high' ? parcel.riskScore >= 75 : parcel.riskScore >= 45 && parcel.riskScore < 75))
      && (region === 'all' || parcel.adminArea.startsWith(region));
  }), [query, region, risk, state.parcels, status]);

  const selected = state.parcels.find((parcel) => parcel.id === selectedId) ?? null;

  useEffect(() => {
    if (toast) {
      const timer = window.setTimeout(() => setToast(null), 3200);
      return () => window.clearTimeout(timer);
    }
  }, [toast]);

  const selectParcel = (parcel: Parcel) => {
    setSelectedId(parcel.id);
    setDetailsTab('summary');
  };

  const primaryAction = () => {
    if (!selected) return;
    if (selected.status === 'pending') setModal('assign');
    else if (selected.status === 'assigned') {
      startSurvey(selected.id, selected.assigneeId);
      setToast('현장조사를 시작했습니다. 위치와 필지 경계를 확인하세요.');
      setModal('inspect');
    } else if (selected.status === 'in_progress') setModal('inspect');
    else if (selected.status === 'needs_review') setModal('review');
  };

  const actionLabel = selected?.status === 'pending' ? '담당자 배정' : selected?.status === 'assigned' ? '현장조사 시작' : selected?.status === 'in_progress' ? '조사 이어하기' : selected?.status === 'needs_review' ? '검수하기' : '조사 완료';

  return (
    <div className="map-page">
      <aside className={`map-list-panel ${mobileView === 'list' ? 'mobile-active' : ''}`}>
        <div className="map-search-block">
          <div className="search-input"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주소, PNU, 팜맵 ID 검색" />{query && <button aria-label="검색어 지우기" onClick={() => setQuery('')}><X size={14} /></button>}</div>
          <div className="filter-row">
            <label><span className="sr-only">지역</span><select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">전체 읍면</option>{regions.map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={13} /></label>
            <label><span className="sr-only">위험도</span><select value={risk} onChange={(event) => setRisk(event.target.value)}><option value="all">모든 위험도</option><option value="high">고위험</option><option value="medium">주의</option></select><ChevronDown size={13} /></label>
            <button aria-label="상세 필터"><ListFilter size={15} /></button>
          </div>
        </div>
        <div className="status-tabs scroll-tabs">
          {statusFilters.map((item) => <button className={status === item.value ? 'active' : ''} onClick={() => setStatus(item.value)} key={item.value}>{item.label}{item.value !== 'all' && <span>{state.parcels.filter((parcel) => parcel.status === item.value).length}</span>}</button>)}
        </div>
        <div className="result-summary"><span><b>{filtered.length}</b>개 조사대상</span><button><ArrowLeftRight size={13} /> 다필지 선택</button></div>
        <div className="parcel-list">
          {filtered.length ? filtered.map((parcel) => {
            const assignee = state.investigators.find((person) => person.id === parcel.assigneeId);
            return (
              <button className={`parcel-card ${selectedId === parcel.id ? 'selected' : ''}`} key={parcel.id} onClick={() => selectParcel(parcel)}>
                <span className="parcel-card-top"><StatusBadge value={parcel.status} /><RiskBadge score={parcel.riskScore} /></span>
                <strong>{parcel.address.split(' ').slice(-2).join(' ')}</strong>
                <small>{parcel.category} · {parcel.crop} · {parcel.areaM2.toLocaleString()}㎡</small>
                <span className="parcel-meta"><i>PNU {parcel.pnu}</i>{assignee && <em><span className="avatar tiny" style={{ background: `${assignee.color}1a`, color: assignee.color }}>{assignee.name.slice(-1)}</span>{assignee.name}</em>}</span>
                {parcel.reasons[0] && <span className="parcel-reason"><AlertTriangle size={12} /> {parcel.reasons[0]}</span>}
              </button>
            );
          }) : <div className="empty-list"><Filter size={24} /><strong>검색 결과가 없습니다.</strong><span>필터를 변경하거나 다른 검색어를 입력하세요.</span><button onClick={() => { setQuery(''); setStatus('all'); setRisk('all'); setRegion('all'); }}>필터 초기화</button></div>}
        </div>
      </aside>

      <section className={`map-canvas-panel ${mobileView === 'map' ? 'mobile-active' : ''}`}>
        <FarmMapView parcels={filtered} selectedId={selectedId} onSelect={selectParcel} />
        <div className="map-floating-tools">
          <button><Ruler size={16} /><span>측정</span></button>
          <button><ArrowLeftRight size={16} /><span>시계열</span></button>
          <button><Layers3 size={16} /><span>주제도</span></button>
        </div>
        <div className="map-legend">
          <strong>조사 상태</strong>
          <span><i className="pending" />미배정</span><span><i className="assigned" />배정</span><span><i className="in-progress" />조사중</span><span><i className="review" />검수</span><span><i className="completed" />완료</span>
        </div>
      </section>

      <aside className={`detail-panel ${selected ? 'is-open' : ''}`}>
        {selected ? (
          <>
            <header className="detail-head">
              <div><span>{selected.farmMapId}</span><h2>{selected.address.split(' ').slice(-2).join(' ')}</h2><p>PNU {selected.pnu}</p></div>
              <button className="icon-button subtle" aria-label="상세 닫기" onClick={() => setSelectedId(null)}><X size={19} /></button>
            </header>
            <div className="detail-badges"><StatusBadge value={selected.status} /><RiskBadge score={selected.riskScore} />{selected.decision !== 'pending' && <StatusBadge value={selected.decision} />}</div>
            <nav className="detail-tabs">
              <button className={detailsTab === 'summary' ? 'active' : ''} onClick={() => setDetailsTab('summary')}>요약</button>
              <button className={detailsTab === 'survey' ? 'active' : ''} onClick={() => setDetailsTab('survey')}>조사정보</button>
              <button className={detailsTab === 'evidence' ? 'active' : ''} onClick={() => setDetailsTab('evidence')}>증빙 <span>{selected.photoCount}</span></button>
              <button className={detailsTab === 'history' ? 'active' : ''} onClick={() => setDetailsTab('history')}>이력</button>
            </nav>
            <div className="detail-scroll">
              {detailsTab === 'summary' && <SummaryTab parcel={selected} assigneeName={state.investigators.find((person) => person.id === selected.assigneeId)?.name} />}
              {detailsTab === 'survey' && <SurveyTab parcel={selected} />}
              {detailsTab === 'evidence' && <EvidenceTab parcel={selected} />}
              {detailsTab === 'history' && <HistoryTab parcel={selected} activities={state.activities.filter((item) => item.parcelId === selected.id)} />}
            </div>
            <footer className="detail-actions">
              <button className="secondary-button"><FileClock size={15} /> 이슈 등록</button>
              <button className="primary-button" disabled={selected.status === 'completed'} onClick={primaryAction}>{selected.status === 'needs_review' ? <CheckCircle2 size={16} /> : <ClipboardCheck size={16} />}{actionLabel}</button>
            </footer>
          </>
        ) : (
          <div className="empty-detail"><MapPinned size={32} /><strong>필지를 선택하세요.</strong><span>목록 또는 지도 경계를 선택하면 팜맵·지적 정보와 조사 이력을 확인할 수 있습니다.</span></div>
        )}
      </aside>

      <div className="mobile-map-switch"><button className={mobileView === 'list' ? 'active' : ''} onClick={() => setMobileView('list')}><ListFilter size={16} /> 목록</button><button className={mobileView === 'map' ? 'active' : ''} onClick={() => setMobileView('map')}><MapPinned size={16} /> 지도</button></div>

      {modal === 'assign' && selected && <AssignmentModal parcelIds={[selected.id]} investigators={state.investigators} onClose={() => setModal(null)} onDone={setToast} />}
      {modal === 'inspect' && selected && <InspectionModal parcel={selected} onClose={() => setModal(null)} onDone={setToast} />}
      {modal === 'review' && selected && <ReviewModal parcel={selected} onClose={() => setModal(null)} onDone={setToast} />}
      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast(null)}><X size={14} /></button></div>}
    </div>
  );
}

function SummaryTab({ parcel, assigneeName }: { parcel: Parcel; assigneeName?: string }) {
  return (
    <>
      <section className="detail-section">
        <div className="section-title"><h3>원천자료 대조</h3><span>2025 기준</span></div>
        <div className="compare-card">
          <div><span>지적 면적</span><strong>{parcel.areaM2.toLocaleString()}㎡</strong><small>지적 2025</small></div>
          <ArrowLeftRight size={17} />
          <div><span>팜맵 면적</span><strong>{parcel.farmAreaM2.toLocaleString()}㎡</strong><small>팜맵 2025</small></div>
        </div>
        <div className={`match-meter ${parcel.overlapRate < 70 ? 'danger' : parcel.overlapRate < 90 ? 'warning' : ''}`}><div><span>지적 중첩률</span><strong>{parcel.overlapRate}%</strong></div><div><i style={{ width: `${parcel.overlapRate}%` }} /></div><p><Info size={12} /> 팜맵 대표 PNU와 지적공부는 다를 수 있습니다.</p></div>
      </section>
      <section className="detail-section">
        <div className="section-title"><h3>필지 정보</h3></div>
        <dl className="detail-list"><div><dt>농경지 분류</dt><dd>{parcel.category}</dd></div><div><dt>추정 작물</dt><dd>{parcel.crop}</dd></div><div><dt>담당자</dt><dd>{assigneeName ?? <em>미배정</em>}</dd></div><div><dt>조사 기한</dt><dd>{parcel.dueDate ?? '미정'}</dd></div><div><dt>갱신일</dt><dd>{new Date(parcel.updatedAt).toLocaleDateString('ko-KR')}</dd></div></dl>
      </section>
      <section className="detail-section">
        <div className="section-title"><h3>선별 사유</h3><RiskBadge score={parcel.riskScore} /></div>
        <div className="reason-list">{parcel.reasons.map((reason, index) => <div key={reason}><span>{index + 1}</span><p>{reason}</p></div>)}</div>
      </section>
      <div className="legal-note"><ShieldAlert size={16} /><p>이 정보는 조사 보조자료이며 법적 효력이 없습니다. 행정자료와 현장 증빙을 검수한 후 판정을 확정하세요.</p></div>
    </>
  );
}

function SurveyTab({ parcel }: { parcel: Parcel }) {
  const items = [
    { icon: UserRound, label: '소유·경작 관계', value: parcel.status === 'pending' ? '조사 전' : '소유자 자경', done: parcel.status !== 'pending' },
    { icon: Sprout, label: '실제 이용 현황', value: parcel.decision === 'pending' ? parcel.crop : SURVEY_DECISION_LABELS[parcel.decision], done: parcel.decision !== 'pending' },
    { icon: LocateFixed, label: '현장 위치 검증', value: parcel.gpsVerified ? 'GPS 확인 완료' : '미확인', done: parcel.gpsVerified },
    { icon: Camera, label: '사진 증빙', value: `${parcel.photoCount}장`, done: parcel.photoCount >= 2 },
  ];
  return <section className="detail-section"><div className="section-title"><h3>조사 체크리스트</h3><span>{items.filter((item) => item.done).length}/{items.length}</span></div><div className="checklist-list">{items.map(({ icon: Icon, label, value, done }) => <div key={label} className={done ? 'done' : ''}><i><Icon size={16} /></i><span><strong>{label}</strong><small>{value}</small></span>{done ? <CheckCircle2 size={17} /> : <ChevronRight size={17} />}</div>)}</div>{parcel.notes && <div className="memo-card"><span>현장 메모</span><p>{parcel.notes}</p></div>}</section>;
}

function EvidenceTab({ parcel }: { parcel: Parcel }) {
  return <section className="detail-section"><div className="section-title"><h3>현장 증빙</h3><span>원본 보존</span></div>{parcel.photoCount ? <div className="evidence-grid">{Array.from({ length: parcel.photoCount }).map((_, index) => <div key={index}><Camera size={21} /><span>현장사진 {String(index + 1).padStart(2, '0')}</span><small>GPS · 원본</small></div>)}</div> : <div className="empty-evidence"><Camera size={25} /><strong>등록된 증빙이 없습니다.</strong><span>현장조사에서 전경과 경계 사진을 촬영하세요.</span></div>}<div className="evidence-policy"><Info size={14} /><p>원본 파일은 변경하지 않고 해시와 촬영 시각·위치 정보를 함께 보존합니다.</p></div></section>;
}

function HistoryTab({ parcel, activities }: { parcel: Parcel; activities: Array<{ id: string; message: string; createdAt: string }> }) {
  const timeline = activities.length ? activities : [{ id: 'created', message: '조사대상 필지가 생성되었습니다.', createdAt: parcel.createdAt }];
  return <section className="detail-section"><div className="section-title"><h3>처리 이력</h3><span>감사로그</span></div><div className="detail-timeline">{timeline.map((activity, index) => <div key={activity.id}><i /><span><strong>{activity.message}</strong><small>{new Date(activity.createdAt).toLocaleString('ko-KR')}</small></span>{index === 0 && <em>최근</em>}</div>)}</div></section>;
}
