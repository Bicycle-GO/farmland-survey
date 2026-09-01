import { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Cloud,
  Database,
  Eye,
  EyeOff,
  FileKey,
  KeyRound,
  Layers3,
  Link2,
  Map,
  RefreshCw,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  UserCog,
  UsersRound,
  X,
} from 'lucide-react';
import { clearFarmMapConfig, loadFarmMapConfig, saveFarmMapConfig, type FarmMapConfig } from '../lib/farmMap';
import { resetSurveyStore } from '../lib/surveyStore';
import { useSurveyStore } from '../lib/useSurveyStore';

type SettingsTab = 'integration' | 'campaign' | 'access' | 'audit';

const tabs: Array<{ id: SettingsTab; label: string; description: string; icon: typeof Link2 }> = [
  { id: 'integration', label: '팜맵·데이터 연계', description: 'API와 원천자료', icon: Link2 },
  { id: 'campaign', label: '조사 캠페인', description: '기간과 판정 규칙', icon: SlidersHorizontal },
  { id: 'access', label: '사용자·권한', description: '관할과 역할', icon: UsersRound },
  { id: 'audit', label: '감사로그', description: '변경과 내보내기', icon: Activity },
];

export function SettingsPage() {
  const state = useSurveyStore();
  const [tab, setTab] = useState<SettingsTab>('integration');
  const [config, setConfig] = useState<FarmMapConfig>(() => loadFarmMapConfig());
  const [showKey, setShowKey] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const saveConfig = () => {
    try {
      new URL(config.domain);
      saveFarmMapConfig(config);
      setToast(config.apiKey && config.enabled ? '팜맵 WMS 연계 설정을 저장했습니다.' : '데모 모드 설정을 저장했습니다.');
    } catch {
      setToast('도메인은 http:// 또는 https://로 시작하는 올바른 URL이어야 합니다.');
    }
  };

  return (
    <div className="settings-page">
      <section className="page-intro queue-intro">
        <div><span className="eyebrow">시스템 관리</span><h2>연계 및 운영 설정</h2><p>팜맵 인증정보, 조사 기준, 사용자 관할과 감사기록을 관리합니다.</p></div>
        <button className="secondary-button" onClick={() => setResetConfirm(true)}><RefreshCw size={15} /> 데모 데이터 초기화</button>
      </section>

      <div className="settings-layout">
        <aside className="settings-nav panel">
          {tabs.map(({ id, label, description, icon: Icon }) => <button className={tab === id ? 'active' : ''} onClick={() => setTab(id)} key={id}><i><Icon size={17} /></i><span><strong>{label}</strong><small>{description}</small></span><ChevronRight size={15} /></button>)}
          <div className="settings-help"><BookOpen size={17} /><p><strong>운영 문서</strong><span>팜맵 연계 및 아키텍처 가이드가 저장소 docs에 포함되어 있습니다.</span></p></div>
        </aside>

        <section className="settings-content">
          {tab === 'integration' && <IntegrationSettings config={config} setConfig={setConfig} showKey={showKey} setShowKey={setShowKey} onSave={saveConfig} onClear={() => { clearFarmMapConfig(); setConfig(loadFarmMapConfig()); setToast('연계 설정을 초기화하고 데모 모드로 전환했습니다.'); }} />}
          {tab === 'campaign' && <CampaignSettings onSave={() => setToast('캠페인 운영 설정을 저장했습니다.')} />}
          {tab === 'access' && <AccessSettings investigators={state.investigators} />}
          {tab === 'audit' && <AuditSettings activities={state.activities} />}
        </section>
      </div>

      {resetConfirm && <div className="modal-backdrop"><section className="modal-card small-confirm"><header className="modal-head"><div><span>로컬 데모 데이터</span><h2>초기 상태로 되돌릴까요?</h2></div><button className="icon-button subtle" onClick={() => setResetConfirm(false)}><X size={18} /></button></header><div className="modal-body"><div className="destructive-warning"><AlertTriangle size={19} /><p><strong>현재 브라우저에서 변경한 배정·조사·검수 기록이 사라집니다.</strong><span>팜맵 API 설정은 유지되며, 15개 데모 필지만 처음 상태로 복원됩니다.</span></p></div></div><footer className="modal-actions"><button className="secondary-button" onClick={() => setResetConfirm(false)}>취소</button><button className="danger-button" onClick={() => { resetSurveyStore('inv-005'); setResetConfirm(false); setToast('데모 조사 데이터를 초기화했습니다.'); }}>초기화</button></footer></section></div>}
      {toast && <div className="toast"><CheckCircle2 size={17} /><span>{toast}</span><button onClick={() => setToast(null)}><X size={14} /></button></div>}
    </div>
  );
}

function IntegrationSettings({ config, setConfig, showKey, setShowKey, onSave, onClear }: { config: FarmMapConfig; setConfig: (config: FarmMapConfig) => void; showKey: boolean; setShowKey: (value: boolean) => void; onSave: () => void; onClear: () => void }) {
  const configured = Boolean(config.apiKey && config.enabled);
  return (
    <>
      <article className="settings-section panel">
        <div className="settings-section-head"><div><span>공간데이터 연계</span><h3>농식품 팜맵 WMS</h3><p>공식 도메인 인증키로 지도에 팜맵 경계 레이어를 중첩합니다.</p></div><span className={`connection-pill ${configured ? 'connected' : 'demo'}`}><i />{configured ? '설정됨' : '데모 모드'}</span></div>
        <div className="settings-form">
          <div className="form-grid two">
            <div className="form-group"><label htmlFor="farmmap-key">팜맵 API 인증키</label><div className="password-input"><KeyRound size={15} /><input id="farmmap-key" type={showKey ? 'text' : 'password'} value={config.apiKey} onChange={(event) => setConfig({ ...config, apiKey: event.target.value })} placeholder="발급받은 인증키 입력" autoComplete="off" /><button aria-label={showKey ? '인증키 숨기기' : '인증키 보기'} onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><small className="field-help">농식품 팜맵 회원가입 후 서비스 도메인을 등록해 발급합니다.</small></div>
            <div className="form-group"><label htmlFor="farmmap-domain">허용 도메인</label><div className="password-input"><Cloud size={15} /><input id="farmmap-domain" value={config.domain} onChange={(event) => setConfig({ ...config, domain: event.target.value })} placeholder="https://survey.example.go.kr" /></div><small className="field-help">인증키 신청 시 등록한 도메인과 정확히 일치해야 합니다.</small></div>
          </div>
          <div className="form-grid two compact-grid">
            <div className="form-group"><label htmlFor="source-year">팜맵 기준연도</label><select id="source-year" value={config.sourceYear} onChange={(event) => setConfig({ ...config, sourceYear: event.target.value })}><option>2025</option><option>2024</option><option>2023</option></select></div>
            <div className="form-group toggle-field"><label>지도 레이어 사용</label><button className={`toggle ${config.enabled ? 'on' : ''}`} role="switch" aria-checked={config.enabled} onClick={() => setConfig({ ...config, enabled: !config.enabled })}><i /><span>{config.enabled ? '사용' : '사용 안 함'}</span></button></div>
          </div>
          <div className="security-callout"><ShieldCheck size={18} /><div><strong>운영 환경에서는 인증키를 서버에 보관하세요.</strong><p>이 MVP는 연동 확인을 위해 브라우저 localStorage를 사용합니다. 운영 배포 시 BFF 프록시와 비밀 저장소로 이동하고, 키·도메인을 클라이언트 번들에 포함하지 마세요.</p></div></div>
        </div>
        <footer className="settings-actions"><button className="ghost-button danger-text" onClick={onClear}>설정 초기화</button><button className="primary-button" onClick={onSave}><Save size={15} /> 연계 설정 저장</button></footer>
      </article>

      <article className="settings-section panel">
        <div className="settings-section-head"><div><span>원천자료 현황</span><h3>데이터 소스</h3><p>조사 화면에 사용되는 공간·행정자료의 기준연도와 연계 상태입니다.</p></div></div>
        <div className="source-list">
          <SourceRow icon={Map} name="팜맵 공간정보" description="농경지 구획·분류·갱신이력" version="2025" status={configured ? 'connected' : 'demo'} />
          <SourceRow icon={Layers3} name="연속지적도" description="PNU·지목·지적면적" version="2025" status="snapshot" />
          <SourceRow icon={Cloud} name="항공사진" description="현황 판독·시계열 비교" version="2024" status="snapshot" />
          <SourceRow icon={Database} name="행정 조사자료" description="농지대장·직불금·허가이력" version="미연계" status="pending" />
        </div>
      </article>

      <article className="integration-guide">
        <FileKey size={20} />
        <div><strong>권장 운영 연동: SHP 정기 적재 + OpenAPI 보조조회 + WMS 시각화</strong><p>공공데이터포털의 시도별 SHP를 EPSG:5179 원본으로 PostGIS에 버전 적재하고, 팜맵과 지적은 공간 중첩 N:M 관계로 관리하세요. WFS는 공식 문서가 상충하므로 운영기관 확인 전 필수 경로로 의존하지 않습니다.</p></div>
        <a href="https://agis.epis.or.kr/ASD/guide/faq.do?bbsSn=2" target="_blank" rel="noreferrer">공식 FAQ <ChevronRight size={14} /></a>
      </article>
    </>
  );
}

function SourceRow({ icon: Icon, name, description, version, status }: { icon: typeof Map; name: string; description: string; version: string; status: 'connected' | 'demo' | 'snapshot' | 'pending' }) {
  const labels = { connected: '연결됨', demo: '데모', snapshot: '스냅샷', pending: '연계 필요' };
  return <div className="source-row"><i><Icon size={18} /></i><span><strong>{name}</strong><small>{description}</small></span><em>{version}</em><b className={status}><i />{labels[status]}</b><button><Settings2 size={15} /></button></div>;
}

function CampaignSettings({ onSave }: { onSave: () => void }) {
  return <article className="settings-section panel"><div className="settings-section-head"><div><span>활성 캠페인</span><h3>2026 정기 전수조사</h3><p>조사기간과 화면에 표시할 기준 자료·판정 규칙을 설정합니다.</p></div><span className="connection-pill connected"><i />진행 중</span></div><div className="settings-form"><div className="form-grid two"><div className="form-group"><label>기본조사 기간</label><div className="date-range"><input type="date" defaultValue="2026-05-01" /><span>–</span><input type="date" defaultValue="2026-07-31" /></div></div><div className="form-group"><label>심층·현장조사 기간</label><div className="date-range"><input type="date" defaultValue="2026-08-01" /><span>–</span><input type="date" defaultValue="2026-12-31" /></div></div></div><div className="form-grid two"><div className="form-group"><label>조사지침 버전</label><select defaultValue="2026-v1"><option value="2026-v1">2026 시행지침 v1</option></select></div><div className="form-group"><label>질문지 버전</label><select defaultValue="field-v1.2"><option value="field-v1.2">현장조사표 v1.2</option></select></div></div><div className="campaign-rules"><strong>최종 판정 원칙</strong><label><input type="checkbox" defaultChecked /> 검수자 승인 없이 최종 판정 불가</label><label><input type="checkbox" defaultChecked /> 고위험 필지는 GPS와 사진 2장 이상 필수</label><label><input type="checkbox" defaultChecked /> 판정 변경 시 사유와 규칙 버전 기록</label></div></div><footer className="settings-actions"><span>마지막 변경: 2026.08.28 김조사</span><button className="primary-button" onClick={onSave}><Save size={15} /> 캠페인 저장</button></footer></article>;
}

function AccessSettings({ investigators }: { investigators: ReturnType<typeof useSurveyStore>['investigators'] }) {
  return <article className="settings-section panel"><div className="settings-section-head"><div><span>관할 기반 접근제어</span><h3>사용자와 권한</h3><p>업무 역할과 조회 가능한 법정동 범위를 관리합니다.</p></div><button className="primary-button"><UserCog size={15} /> 사용자 추가</button></div><div className="table-wrap"><table className="data-table access-table"><thead><tr><th>사용자</th><th>역할</th><th>소속</th><th>관할</th><th>상태</th><th /></tr></thead><tbody>{investigators.map((person) => <tr key={person.id}><td><div className="table-assignee"><span className="avatar tiny" style={{ background: `${person.color}1a`, color: person.color }}>{person.name.slice(-1)}</span><span><strong>{person.name}</strong><small>{person.phone}</small></span></div></td><td>{person.role === 'reviewer' ? '검수자' : person.role === 'lead' ? '조사반장' : person.role === 'manager' ? '관리자' : '조사자'}</td><td>{person.team}</td><td>{person.coverageAreas.join(', ')}</td><td><span className={`connection-pill mini ${person.status === 'off_duty' ? 'demo' : 'connected'}`}><i />{person.status === 'in_field' ? '현장 조사' : person.status === 'available' ? '활성' : '휴무'}</span></td><td><button className="icon-button subtle"><Settings2 size={15} /></button></td></tr>)}</tbody></table></div><div className="permission-note"><ShieldCheck size={16} /><p>운영 환경에서는 관할지역 row-level security와 소유자 등 민감정보 column masking을 함께 적용해야 합니다.</p></div></article>;
}

function AuditSettings({ activities }: { activities: ReturnType<typeof useSurveyStore>['activities'] }) {
  return <article className="settings-section panel"><div className="settings-section-head"><div><span>변경 추적</span><h3>감사로그</h3><p>배정, 조사, 판정 변경과 데이터 가져오기 기록을 확인합니다.</p></div><button className="secondary-button"><FileKey size={15} /> 로그 내보내기</button></div><div className="audit-list">{activities.slice(0, 12).map((activity) => <div key={activity.id}><i><Activity size={14} /></i><span><strong>{activity.message}</strong><small>{activity.actorId ?? '시스템'} · {activity.parcelId ?? '전체 데이터'}</small></span><time><Clock3 size={12} />{new Date(activity.createdAt).toLocaleString('ko-KR')}</time></div>)}</div></article>;
}
