import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  ChevronDown,
  ClipboardCheck,
  Cloud,
  FileSearch,
  HelpCircle,
  LayoutDashboard,
  Map,
  Menu,
  Settings,
  ShieldCheck,
  Sprout,
  X,
} from 'lucide-react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/', label: '현황 대시보드', icon: LayoutDashboard, end: true },
  { to: '/map', label: '조사대상 지도', icon: Map },
  { to: '/queue', label: '조사 업무', icon: ClipboardCheck, badge: '7' },
  { to: '/review', label: '검수함', icon: FileSearch, badge: '3' },
  { to: '/reports', label: '통계·내보내기', icon: BarChart3 },
];

const pageTitles: Record<string, { title: string; eyebrow: string }> = {
  '/': { title: '조사 운영 현황', eyebrow: '2026 농지 전수조사' },
  '/map': { title: '조사대상 지도', eyebrow: '팜맵·지적 통합조회' },
  '/queue': { title: '조사 업무', eyebrow: '담당 필지 관리' },
  '/review': { title: '검수함', eyebrow: '제출자료 품질검수' },
  '/reports': { title: '통계·내보내기', eyebrow: '조사 성과 분석' },
  '/settings': { title: '연계 및 운영 설정', eyebrow: '시스템 관리' },
};

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [noticeOpen, setNoticeOpen] = useState(false);
  const location = useLocation();
  const page = useMemo(() => pageTitles[location.pathname] ?? pageTitles['/'], [location.pathname]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`}>
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <Sprout size={21} strokeWidth={2.4} />
          </div>
          <div>
            <strong>필드체크</strong>
            <span>농지 전수조사</span>
          </div>
          <button className="icon-button mobile-only" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="campaign-card">
          <div className="campaign-icon"><ShieldCheck size={17} /></div>
          <div>
            <span>활성 조사</span>
            <strong>2026 정기 전수조사</strong>
          </div>
          <ChevronDown size={16} />
        </div>

        <nav className="main-nav" aria-label="주 메뉴">
          <p className="nav-label">업무</p>
          {navItems.map(({ to, label, icon: Icon, badge, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
              {badge && <small>{badge}</small>}
            </NavLink>
          ))}
          <p className="nav-label nav-label-spaced">관리</p>
          <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            <Settings size={19} strokeWidth={2} />
            <span>연계·운영 설정</span>
          </NavLink>
        </nav>

        <div className="sidebar-foot">
          <a className="help-link" href="https://agis.epis.or.kr/ASD/guide/faq.do?bbsSn=2" target="_blank" rel="noreferrer">
            <HelpCircle size={18} />
            팜맵 연계 도움말
          </a>
          <div className="user-card">
            <div className="avatar">김</div>
            <div>
              <strong>김조사</strong>
              <span>세종시 조사관리자</span>
            </div>
            <ChevronDown size={16} />
          </div>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" aria-label="메뉴 닫기" onClick={() => setSidebarOpen(false)} />}

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-title">
            <button className="icon-button menu-button" aria-label="메뉴 열기" onClick={() => setSidebarOpen(true)}>
              <Menu size={21} />
            </button>
            <div>
              <span>{page.eyebrow}</span>
              <h1>{page.title}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <button className="source-status" onClick={() => setNoticeOpen(!noticeOpen)}>
              <Cloud size={16} />
              <span><b>자료 기준</b> 팜맵 2025 · 항공 2024</span>
              <i aria-label="정상 연계" />
            </button>
            <button className="icon-button notification-button" aria-label="알림" onClick={() => setNoticeOpen(!noticeOpen)}>
              <Bell size={20} />
              <span>3</span>
            </button>
          </div>
          {noticeOpen && (
            <div className="notification-popover">
              <div className="popover-head">
                <strong>알림</strong>
                <button onClick={() => setNoticeOpen(false)}>모두 읽음</button>
              </div>
              <div className="notification-row new">
                <span className="notice-dot amber" />
                <div><strong>검수 반려 1건</strong><p>금남면 영대리 104-2 사진 보완 필요</p><time>12분 전</time></div>
              </div>
              <div className="notification-row new">
                <span className="notice-dot green" />
                <div><strong>현장조사 동기화 완료</strong><p>오지훈 조사자 제출 3건</p><time>34분 전</time></div>
              </div>
              <div className="notification-row">
                <span className="notice-dot blue" />
                <div><strong>팜맵 스냅샷 정상</strong><p>2025 필지 경계 기준 자료</p><time>오늘 08:10</time></div>
              </div>
            </div>
          )}
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
