import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  LocateFixed,
  MapPin,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import type { Investigator, Parcel, SurveyDecision } from '../types';
import { SURVEY_DECISION_LABELS } from '../types';
import { bulkAssignParcels, completeSurvey, submitParcelForReview } from '../lib/surveyStore';
import { RiskBadge, StatusBadge } from './StatusBadge';

interface ModalProps {
  onClose: () => void;
  onDone?: (message: string) => void;
}

function ModalFrame({ title, eyebrow, onClose, children, wide = false }: ModalProps & { title: string; eyebrow: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal-card ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <header className="modal-head">
          <div><span>{eyebrow}</span><h2 id="modal-title">{title}</h2></div>
          <button className="icon-button subtle" aria-label="닫기" onClick={onClose}><X size={19} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

export function AssignmentModal({ parcelIds, investigators, onClose, onDone }: ModalProps & { parcelIds: string[]; investigators: Investigator[] }) {
  const [assigneeId, setAssigneeId] = useState(investigators.find((person) => person.role === 'surveyor' && person.status === 'available')?.id ?? investigators[0]?.id ?? '');
  const [dueDate, setDueDate] = useState('2026-09-07');
  const [submitting, setSubmitting] = useState(false);

  const selected = investigators.find((person) => person.id === assigneeId);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!assigneeId) return;
    setSubmitting(true);
    bulkAssignParcels(parcelIds, assigneeId, dueDate || null, 'inv-005');
    onDone?.(`${parcelIds.length}개 필지를 ${selected?.name ?? '조사자'}님에게 배정했습니다.`);
    onClose();
  };

  return (
    <ModalFrame title="조사 담당자 배정" eyebrow={`${parcelIds.length}개 필지 선택`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="modal-body">
          <div className="form-group">
            <label>담당 조사자</label>
            <div className="assignee-options">
              {investigators.filter((person) => person.role !== 'reviewer').map((person) => (
                <label className={`assignee-option ${assigneeId === person.id ? 'selected' : ''}`} key={person.id}>
                  <input type="radio" name="assignee" value={person.id} checked={assigneeId === person.id} onChange={() => setAssigneeId(person.id)} />
                  <span className="avatar small" style={{ background: `${person.color}1a`, color: person.color }}>{person.name.slice(-1)}</span>
                  <span><strong>{person.name}</strong><small>{person.team} · {person.coverageAreas.slice(0, 2).join(', ')}</small></span>
                  <i className={`availability ${person.status}`} />
                </label>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="due-date">조사 기한</label>
            <input id="due-date" className="text-input" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            <small className="field-help">기한 24시간 전 담당자에게 자동 알림이 표시됩니다.</small>
          </div>
          <div className="info-callout"><ShieldCheck size={17} /><p>담당자는 배정된 필지만 조회·작성할 수 있습니다. 재배정 이력은 감사로그에 남습니다.</p></div>
        </div>
        <footer className="modal-actions">
          <button type="button" className="secondary-button" onClick={onClose}>취소</button>
          <button type="submit" className="primary-button" disabled={submitting || !assigneeId}><UserRound size={16} /> 배정 완료</button>
        </footer>
      </form>
    </ModalFrame>
  );
}

const decisionOptions: Array<{ value: Exclude<SurveyDecision, 'pending'>; label: string; description: string; tone: string }> = [
  { value: 'cultivated', label: '정상 경작', description: '농업 경영 및 경작 상태 확인', tone: 'green' },
  { value: 'fallow', label: '휴경', description: '현재 경작되지 않으나 농지 기능 유지', tone: 'amber' },
  { value: 'suspected_conversion', label: '전용 의심', description: '시설·포장·야적 등 추가 검수 필요', tone: 'red' },
  { value: 'non_farmland', label: '비농지', description: '농지 형상과 기능이 소실된 상태', tone: 'gray' },
];

export function InspectionModal({ parcel, onClose, onDone }: ModalProps & { parcel: Parcel }) {
  const [decision, setDecision] = useState<SurveyDecision>(parcel.decision === 'pending' ? 'cultivated' : parcel.decision);
  const [crop, setCrop] = useState(parcel.crop === '미상' ? '' : parcel.crop);
  const [cultivator, setCultivator] = useState('소유자 자경');
  const [photoCount, setPhotoCount] = useState(Math.max(parcel.photoCount, 3));
  const [gpsVerified, setGpsVerified] = useState(true);
  const [notes, setNotes] = useState(parcel.notes);
  const [step, setStep] = useState(1);

  const canSubmit = decision !== 'pending' && notes.trim().length >= 5 && photoCount >= 2 && gpsVerified;

  const submit = () => {
    if (!canSubmit) return;
    submitParcelForReview(parcel.id, {
      decision,
      notes: notes.trim(),
      reasons: [...parcel.reasons, `${SURVEY_DECISION_LABELS[decision]} 현장 확인`],
      photoCount,
      gpsVerified,
    }, parcel.assigneeId);
    onDone?.(`${parcel.address.split(' ').slice(-2).join(' ')} 조사 결과를 검수 요청했습니다.`);
    onClose();
  };

  return (
    <ModalFrame title="현장조사 기록" eyebrow={`${parcel.farmMapId} · ${parcel.address}`} onClose={onClose} wide>
      <div className="stepper">
        {['필지 확인', '이용 현황', '증빙·제출'].map((label, index) => (
          <button className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} key={label} onClick={() => setStep(index + 1)}>
            <i>{step > index + 1 ? <Check size={12} /> : index + 1}</i><span>{label}</span>
          </button>
        ))}
      </div>
      <div className="modal-body survey-form-body">
        {step === 1 && (
          <div className="survey-step">
            <div className="field-summary-card">
              <div className="field-summary-map"><MapPin size={21} /></div>
              <div><span>PNU {parcel.pnu}</span><strong>{parcel.address}</strong><p>{parcel.category} · 지적 {parcel.areaM2.toLocaleString()}㎡ · 팜맵 {parcel.farmAreaM2.toLocaleString()}㎡</p></div>
              <RiskBadge score={parcel.riskScore} />
            </div>
            <div className="check-grid">
              <button className={`check-card ${gpsVerified ? 'checked' : ''}`} onClick={() => setGpsVerified(!gpsVerified)}>
                <LocateFixed size={21} /><span><strong>현장 위치 확인</strong><small>GPS 정확도 ±4.8m</small></span><i>{gpsVerified && <Check size={13} />}</i>
              </button>
              <button className="check-card checked"><MapPin size={21} /><span><strong>필지 경계 확인</strong><small>경계까지 3.2m</small></span><i><Check size={13} /></i></button>
            </div>
            <div className="source-warning"><AlertTriangle size={16} /><p>팜맵 대표 PNU는 실제 지적공부와 다를 수 있습니다. 화면 경계와 현장 표지를 함께 확인하세요.</p></div>
          </div>
        )}

        {step === 2 && (
          <div className="survey-step">
            <div className="form-grid two">
              <div className="form-group"><label htmlFor="cultivator">실경작 관계</label><select id="cultivator" value={cultivator} onChange={(e) => setCultivator(e.target.value)}><option>소유자 자경</option><option>임대 경작</option><option>사용대차</option><option>경작자 미확인</option><option>미경작</option></select></div>
              <div className="form-group"><label htmlFor="crop">실제 작물·용도</label><input id="crop" className="text-input" value={crop} onChange={(e) => setCrop(e.target.value)} placeholder="예: 벼, 콩, 농자재 적치" /></div>
            </div>
            <div className="form-group">
              <label>현장 확인 결과</label>
              <div className="decision-grid">
                {decisionOptions.map((option) => (
                  <button key={option.value} className={`decision-card tone-${option.tone} ${decision === option.value ? 'selected' : ''}`} onClick={() => setDecision(option.value)}>
                    <i>{decision === option.value && <Check size={13} />}</i><strong>{option.label}</strong><span>{option.description}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group"><label htmlFor="field-note">현장 관찰 메모 <em>필수</em></label><textarea id="field-note" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="작물 상태, 시설물, 경계, 면담 내용 등 판정 근거를 기록하세요." /><small className="field-help">최소 5자 · 현재 {notes.trim().length}자</small></div>
          </div>
        )}

        {step === 3 && (
          <div className="survey-step">
            <div className="evidence-upload">
              <div><Camera size={24} /><strong>현장 사진</strong><span>전경·경계·경작 상태 원본</span></div>
              <div className="photo-counter"><button onClick={() => setPhotoCount(Math.max(0, photoCount - 1))}>−</button><strong>{photoCount}</strong><span>장</span><button onClick={() => setPhotoCount(photoCount + 1)}>+</button></div>
            </div>
            <div className="submission-checks">
              <div className={gpsVerified ? 'passed' : 'failed'}><i>{gpsVerified ? <Check size={13} /> : <X size={13} />}</i><span><strong>위치 확인</strong><small>{gpsVerified ? 'GPS 검증 완료' : '현장 위치 확인 필요'}</small></span></div>
              <div className={photoCount >= 2 ? 'passed' : 'failed'}><i>{photoCount >= 2 ? <Check size={13} /> : <X size={13} />}</i><span><strong>사진 증빙</strong><small>{photoCount >= 2 ? `${photoCount}장 첨부됨` : '최소 2장 필요'}</small></span></div>
              <div className={notes.trim().length >= 5 ? 'passed' : 'failed'}><i>{notes.trim().length >= 5 ? <Check size={13} /> : <X size={13} />}</i><span><strong>판정 근거</strong><small>{notes.trim().length >= 5 ? '현장 메모 작성됨' : '현장 메모 필요'}</small></span></div>
            </div>
            <div className="result-preview"><ClipboardCheck size={20} /><div><span>조사자 의견</span><strong>{decision === 'pending' ? '미판정' : SURVEY_DECISION_LABELS[decision]}</strong><p>검수자가 행정자료와 증빙을 대조한 뒤 최종 확정합니다.</p></div></div>
          </div>
        )}
      </div>
      <footer className="modal-actions split">
        <button type="button" className="secondary-button" onClick={step === 1 ? onClose : () => setStep(step - 1)}>{step === 1 ? '임시저장 후 닫기' : '이전'}</button>
        {step < 3 ? <button type="button" className="primary-button" onClick={() => setStep(step + 1)}>다음 단계 <ChevronRight size={16} /></button> : <button type="button" className="primary-button" disabled={!canSubmit} onClick={submit}><ClipboardCheck size={16} /> 검수 요청</button>}
      </footer>
    </ModalFrame>
  );
}

export function ReviewModal({ parcel, onClose, onDone }: ModalProps & { parcel: Parcel }) {
  const initialDecision = parcel.decision === 'pending' ? 'cultivated' : parcel.decision;
  const [decision, setDecision] = useState<Exclude<SurveyDecision, 'pending'>>(initialDecision);
  const [comment, setComment] = useState(parcel.notes);
  const evidenceReady = parcel.photoCount >= 2 && parcel.gpsVerified;
  const investigator = useMemo(() => parcel.assigneeId, [parcel.assigneeId]);

  const approve = () => {
    completeSurvey(parcel.id, { decision, notes: comment, gpsVerified: parcel.gpsVerified, photoCount: parcel.photoCount }, 'inv-005');
    onDone?.(`${parcel.address.split(' ').slice(-2).join(' ')} 검수를 승인했습니다.`);
    onClose();
  };

  return (
    <ModalFrame title="조사결과 검수" eyebrow={`${parcel.farmMapId} · 제출자료 대조`} onClose={onClose} wide>
      <div className="modal-body review-body">
        <div className="review-column">
          <span className="review-label">필지·원천자료</span>
          <div className="review-map-preview"><MapPin size={26} /><span>팜맵 {parcel.farmMapId}</span></div>
          <dl className="detail-list"><div><dt>대표 주소</dt><dd>{parcel.address}</dd></div><div><dt>PNU</dt><dd>{parcel.pnu}</dd></div><div><dt>팜맵/지적</dt><dd>{parcel.farmAreaM2.toLocaleString()} / {parcel.areaM2.toLocaleString()}㎡</dd></div><div><dt>중첩률</dt><dd>{parcel.overlapRate}%</dd></div></dl>
          <div className="source-chip-row"><span>팜맵 2025</span><span>지적 2025</span><span>항공 2024</span></div>
        </div>
        <div className="review-column main">
          <span className="review-label">현장 제출자료</span>
          <div className="review-submit-head"><div className="avatar">조</div><div><strong>현장조사 제출</strong><span>담당자 {investigator ? '배정됨' : '미확인'} · 2026.09.01 10:44</span></div><StatusBadge value="needs_review" /></div>
          <div className="evidence-strip">
            {Array.from({ length: Math.min(parcel.photoCount, 4) }).map((_, index) => <div key={index}><Camera size={18} /><span>현장 {index + 1}</span></div>)}
            {parcel.photoCount > 4 && <div className="more-evidence">+{parcel.photoCount - 4}</div>}
          </div>
          <div className="review-facts"><div><LocateFixed size={16} /><span><b>GPS 검증</b>{parcel.gpsVerified ? '정상 · ±4.8m' : '미검증'}</span></div><div><Camera size={16} /><span><b>원본 사진</b>{parcel.photoCount}장</span></div></div>
          <div className="submitted-note"><span>조사자 현장 메모</span><p>{parcel.notes || '등록된 현장 메모가 없습니다.'}</p></div>
        </div>
        <div className="review-column decision">
          <span className="review-label">최종 판정</span>
          <div className="form-group"><label htmlFor="review-decision">판정 결과</label><select id="review-decision" value={decision} onChange={(e) => setDecision(e.target.value as Exclude<SurveyDecision, 'pending'>)}>{decisionOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></div>
          <div className="form-group"><label htmlFor="review-comment">검수 의견</label><textarea id="review-comment" rows={6} value={comment} onChange={(e) => setComment(e.target.value)} /></div>
          <div className={`quality-check ${evidenceReady ? 'ready' : 'not-ready'}`}><CheckCircle2 size={18} /><div><strong>{evidenceReady ? '필수 증빙 충족' : '증빙 보완 필요'}</strong><span>GPS, 사진, 현장 메모 기준</span></div></div>
        </div>
      </div>
      <footer className="modal-actions split">
        <button type="button" className="danger-button" onClick={() => onDone?.('반려 사유 작성 기능은 검수함에서 사용할 수 있습니다.')}><AlertTriangle size={15} /> 보완 요청</button>
        <div><button type="button" className="secondary-button" onClick={onClose}>취소</button><button type="button" className="primary-button" disabled={!evidenceReady || comment.trim().length < 5} onClick={approve}><CheckCircle2 size={16} /> 승인·확정</button></div>
      </footer>
    </ModalFrame>
  );
}
