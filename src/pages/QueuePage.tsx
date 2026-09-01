import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  FileSpreadsheet,
  Filter,
  MapPin,
  Search,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { AssignmentModal, InspectionModal, ReviewModal } from '../components/SurveyModals';
import { RiskBadge, StatusBadge } from '../components/StatusBadge';
import { downloadParcelsCsv, importPnuCsv } from '../lib/csv';
import { importParcels, startSurvey } from '../lib/surveyStore';
import { useSurveyStore } from '../lib/useSurveyStore';
import type { Parcel, SurveyStatus } from '../types';

export function QueuePage({ mode }: { mode: 'survey' | 'review' }) {
  const state = useSurveyStore();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | SurveyStatus>(mode === 'review' ? 'needs_review' : 'all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeParcel, setActiveParcel] = useState<Parcel | null>(null);
  const [action, setAction] = useState<'inspect' | 'review' | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setStatus(mode === 'review' ? 'needs_review' : 'all');
    setSelectedIds([]);
  }, [mode]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const rows = useMemo(() => state.parcels.filter((parcel) => {
    if (mode === 'review' && parcel.status !== 'needs_review') return false;
    if (mode === 'survey' && parcel.status === 'completed') return false;
    if (status !== 'all' && parcel.status !== status) return false;
    const normalized = query.trim().toLowerCase();
    return !normalized || [parcel.address, parcel.pnu, parcel.farmMapId, parcel.crop].some((value) => value.toLowerCase().includes(normalized));
  }).sort((a, b) => b.riskScore - a.riskScore), [mode, query, state.parcels, status]);

  const toggleAll = () => setSelectedIds(selectedIds.length === rows.length ? [] : rows.map((parcel) => parcel.id));
  const toggleOne = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  const openRowAction = (parcel: Parcel) => {
    setActiveParcel(parcel);
    if (mode === 'review' || parcel.status === 'needs_review') setAction('review');
    else if (parcel.status === 'pending') {
      setSelectedIds([parcel.id]);
      setAssignOpen(true);
    } else {
      if (parcel.status === 'assigned') startSurvey(parcel.id, parcel.assigneeId);
      setAction('inspect');
    }
  };

  const statusCounts = {
    pending: state.parcels.filter((parcel) => parcel.status === 'pending').length,
    assigned: state.parcels.filter((parcel) => parcel.status === 'assigned').length,
    in_progress: state.parcels.filter((parcel) => parcel.status === 'in_progress').length,
    needs_review: state.parcels.filter((parcel) => parcel.status === 'needs_review').length,
  };

  return (
    <div className="queue-page">
      <section className="page-intro queue-intro">
        <div><span className="eyebrow">{mode === 'review' ? '품질관리·판정확정' : '현장 업무 운영'}</span><h2>{mode === 'review' ? '검수 대기열' : '조사 업무 목록'}</h2><p>{mode === 'review' ? '제출된 현장 증빙과 팜맵·행정자료를 대조해 결과를 확정합니다.' : '필지를 배정하고 현장조사 진행상태와 기한을 관리합니다.'}</p></div>
        <div className="intro-actions">
          {mode === 'survey' && <button className="secondary-button" onClick={() => setImportOpen(true)}><Upload size={16} /> PNU 가져오기</button>}
          <button className="primary-button" onClick={() => downloadParcelsCsv(rows, state.investigators)}><ArrowDownToLine size={16} /> CSV 내보내기</button>
        </div>
      </section>

      {mode === 'review' ? (
        <section className="review-summary-grid">
          <article><div className="summary-icon violet"><ClipboardCheck size={19} /></div><div><span>전체 검수대기</span><strong>{statusCounts.needs_review}<small>건</small></strong></div><em>평균 6시간</em></article>
          <article><div className="summary-icon red"><AlertTriangle size={19} /></div><div><span>전용 의심</span><strong>{state.parcels.filter((p) => p.status === 'needs_review' && p.decision === 'suspected_conversion').length}<small>건</small></strong></div><em>우선 검수</em></article>
          <article><div className="summary-icon amber"><CalendarClock size={19} /></div><div><span>기한 임박</span><strong>1<small>건</small></strong></div><em>24시간 이내</em></article>
          <article><div className="summary-icon green"><CheckCircle2 size={19} /></div><div><span>오늘 승인</span><strong>{state.parcels.filter((p) => p.status === 'completed' && p.completedAt?.startsWith('2026-09-01')).length}<small>건</small></strong></div><em>처리율 67%</em></article>
        </section>
      ) : (
        <section className="work-status-strip">
          {[
            ['pending', '미배정', statusCounts.pending, '#7d8a83'],
            ['assigned', '배정 완료', statusCounts.assigned, '#527e9f'],
            ['in_progress', '현장 조사 중', statusCounts.in_progress, '#b87119'],
            ['needs_review', '검수 대기', statusCounts.needs_review, '#72569d'],
          ].map(([value, label, count, color]) => <button key={String(value)} className={status === value ? 'active' : ''} onClick={() => setStatus(status === value ? 'all' : value as SurveyStatus)}><i style={{ background: String(color) }} /><span>{label}</span><strong>{count}</strong></button>)}
        </section>
      )}

      <section className="panel queue-table-panel">
        <div className="queue-toolbar">
          <div className="search-input queue-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="주소, PNU, 팜맵 ID 검색" />{query && <button onClick={() => setQuery('')}><X size={14} /></button>}</div>
          <div className="toolbar-filters">
            <label><select value={status} onChange={(event) => setStatus(event.target.value as 'all' | SurveyStatus)}><option value="all">모든 상태</option><option value="pending">미배정</option><option value="assigned">배정 완료</option><option value="in_progress">조사 중</option><option value="needs_review">검수 대기</option></select><ChevronDown size={13} /></label>
            <button className="secondary-button"><Filter size={15} /> 상세 필터</button>
          </div>
          <span className="toolbar-count"><b>{rows.length}</b>건</span>
        </div>

        {selectedIds.length > 0 && mode === 'survey' && (
          <div className="bulk-bar"><span><CheckCircle2 size={15} /><b>{selectedIds.length}</b>개 필지 선택</span><div><button onClick={() => downloadParcelsCsv(state.parcels.filter((p) => selectedIds.includes(p.id)), state.investigators)}><ArrowDownToLine size={14} /> 내보내기</button><button className="assign" onClick={() => setAssignOpen(true)}><UserPlus size={14} /> 일괄 배정</button><button aria-label="선택 해제" onClick={() => setSelectedIds([])}><X size={14} /></button></div></div>
        )}

        <div className="table-wrap">
          <table className="data-table queue-table">
            <thead><tr>{mode === 'survey' && <th className="check-cell"><input aria-label="전체 선택" type="checkbox" checked={rows.length > 0 && selectedIds.length === rows.length} onChange={toggleAll} /></th>}<th>필지</th><th>분류·면적</th><th>위험도</th><th>조사 상태</th><th>담당자</th><th>기한/제출</th><th>증빙</th><th aria-label="작업" /></tr></thead>
            <tbody>
              {rows.map((parcel) => {
                const assignee = state.investigators.find((person) => person.id === parcel.assigneeId);
                return (
                  <tr key={parcel.id} className={parcel.riskScore >= 85 ? 'high-risk-row' : ''}>
                    {mode === 'survey' && <td className="check-cell"><input aria-label={`${parcel.address} 선택`} type="checkbox" checked={selectedIds.includes(parcel.id)} onChange={() => toggleOne(parcel.id)} /></td>}
                    <td><button className="parcel-link" onClick={() => openRowAction(parcel)}><strong>{parcel.address.split(' ').slice(-2).join(' ')}</strong><span>{parcel.pnu}</span></button></td>
                    <td><strong>{parcel.category} · {parcel.crop}</strong><span>{parcel.areaM2.toLocaleString()}㎡ / 팜맵 {parcel.farmAreaM2.toLocaleString()}㎡</span></td>
                    <td><RiskBadge score={parcel.riskScore} /><span className="risk-score">{parcel.riskScore}점</span></td>
                    <td><StatusBadge value={parcel.status} /></td>
                    <td>{assignee ? <div className="table-assignee"><span className="avatar tiny" style={{ background: `${assignee.color}1a`, color: assignee.color }}>{assignee.name.slice(-1)}</span><span><strong>{assignee.name}</strong><small>{assignee.team}</small></span></div> : <span className="unassigned-text">미배정</span>}</td>
                    <td><strong>{parcel.dueDate ?? '미정'}</strong><span>{parcel.status === 'needs_review' ? '제출 완료' : parcel.status === 'in_progress' ? '현장 진행 중' : '조사 기한'}</span></td>
                    <td><div className="evidence-mini"><span className={parcel.gpsVerified ? 'ok' : ''}><MapPin size={12} />GPS</span><span className={parcel.photoCount >= 2 ? 'ok' : ''}><FileSpreadsheet size={12} />{parcel.photoCount}</span></div></td>
                    <td><button className={`row-action ${mode === 'review' ? 'review' : ''}`} onClick={() => openRowAction(parcel)}>{mode === 'review' || parcel.status === 'needs_review' ? '검수' : parcel.status === 'pending' ? '배정' : '조사'}</button></td>
                  </tr>
                );
              })}
              {!rows.length && <tr><td colSpan={mode === 'survey' ? 9 : 8}><div className="empty-table"><Filter size={25} /><strong>조건에 맞는 업무가 없습니다.</strong><span>검색어 또는 상태 필터를 변경해 보세요.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
        <footer className="table-footer"><span>1–{rows.length} / {rows.length}건</span><div><button disabled>이전</button><button className="active">1</button><button disabled>다음</button></div></footer>
      </section>

      {mode === 'review' && <div className="reference-notice"><AlertCircle size={16} /><p><strong>검수 원칙</strong> 조사자가 기록한 현장 사실·의견과 최종 판정은 분리됩니다. 최종 판정 변경 시 검수 의견과 적용 규칙 버전을 반드시 남기세요.</p></div>}

      {assignOpen && <AssignmentModal parcelIds={selectedIds} investigators={state.investigators} onClose={() => setAssignOpen(false)} onDone={(message) => { setToast(message); setSelectedIds([]); }} />}
      {importOpen && <PnuImportModal existingParcels={state.parcels} onClose={() => setImportOpen(false)} onDone={setToast} />}
      {action === 'inspect' && activeParcel && <InspectionModal parcel={state.parcels.find((p) => p.id === activeParcel.id) ?? activeParcel} onClose={() => setAction(null)} onDone={setToast} />}
      {action === 'review' && activeParcel && <ReviewModal parcel={state.parcels.find((p) => p.id === activeParcel.id) ?? activeParcel} onClose={() => setAction(null)} onDone={setToast} />}
      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast(null)}><X size={14} /></button></div>}
    </div>
  );
}

function PnuImportModal({ existingParcels, onClose, onDone }: { existingParcels: Parcel[]; onClose: () => void; onDone: (message: string) => void }) {
  const [text, setText] = useState("PNU,주소,면적㎡,농지유형,작물,위험점수\n3611034021101440000,세종특별자치시 금남면 용포리 144,2140,밭,콩,58");
  const [errors, setErrors] = useState<string[]>([]);

  const readFile = async (file?: File) => {
    if (!file) return;
    setText(await file.text());
    setErrors([]);
  };

  const submit = () => {
    const result = importPnuCsv(text, { existingParcels });
    if (result.errors.length) {
      setErrors(result.errors.slice(0, 4).map((error) => `${error.row}행: ${error.message}`));
      return;
    }
    const imported = importParcels(result.parcels, 'inv-005');
    onDone(`${imported.added.length}개 필지를 가져왔습니다.${result.skippedPnus.length ? ` 중복 ${result.skippedPnus.length}건 제외` : ''}`);
    onClose();
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="import-title">
        <header className="modal-head"><div><span>조사대상 일괄 등록</span><h2 id="import-title">PNU CSV 가져오기</h2></div><button className="icon-button subtle" onClick={onClose}><X size={19} /></button></header>
        <div className="modal-body">
          <label className="file-drop"><Upload size={22} /><strong>CSV 파일을 선택하거나 내용을 붙여넣으세요.</strong><span>필수 열: PNU(19자리) · 선택: 주소, 면적, 분류, 위·경도</span><input type="file" accept=".csv,text/csv" onChange={(event) => readFile(event.target.files?.[0])} /></label>
          <div className="form-group import-text"><label htmlFor="csv-text">CSV 미리보기</label><textarea id="csv-text" rows={8} value={text} onChange={(event) => setText(event.target.value)} /></div>
          {errors.length > 0 && <div className="import-errors"><AlertTriangle size={16} /><div><strong>가져오기 전에 확인해 주세요.</strong>{errors.map((error) => <span key={error}>{error}</span>)}</div></div>}
          <div className="info-callout"><AlertCircle size={16} /><p>좌표가 없는 PNU는 임시 경계로 등록되며, 팜맵·지적 원천자료 동기화 후 경계를 반드시 확인해야 합니다.</p></div>
        </div>
        <footer className="modal-actions"><button className="secondary-button" onClick={onClose}>취소</button><button className="primary-button" onClick={submit}><Upload size={15} /> 데이터 검증·가져오기</button></footer>
      </section>
    </div>
  );
}
