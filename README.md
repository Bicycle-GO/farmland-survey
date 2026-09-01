# 필드체크 — 팜맵 연계 농지 전수조사

농식품 팜맵을 공간 기준도로 활용해 조사대상 선별부터 담당자 배정, 현장조사, 검수·확정, 통계와 내보내기까지 한 흐름으로 관리하는 실행 가능한 웹 MVP입니다.

> 팜맵과 자동 위험도는 조사 보조자료입니다. 공식 팜맵 안내와 같이 제공 정보에는 법적 효력이 없으며, 최종 판정은 행정자료와 현장 증빙을 검수한 권한자가 확정해야 합니다.

## 구현 범위

- 캠페인 현황, 완료율, 고위험 필지와 최근 활동을 보여주는 대시보드
- 필지 목록·공간 필터·상세정보·조사이력·현장증빙을 결합한 지도 화면
- 담당자 배정 → 현장조사 → 검수요청 → 승인·확정 워크플로
- GPS 정확도, 경작상태, 재배작물, 판정, 메모와 사진 메타데이터를 담는 현장 조사 폼
- PNU 기반 CSV 가져오기, 일괄배정, 결과 CSV 내보내기
- 판정 분포, 읍면별 진척도, 고위험 현황을 보여주는 통계 화면
- 팜맵 WMS 개발 설정, 역할·감사로그·캠페인 설정 화면
- 15개 예시 필지를 이용한 로컬 데모 데이터와 브라우저 저장
- 데스크톱·태블릿·현장용 모바일 반응형 UI

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다. 검증 명령은 다음과 같습니다.

```bash
npm run lint
npm test
npm run build
```

## 팜맵 연계

인증키가 없어도 예시 필지로 전체 업무 흐름을 확인할 수 있습니다. 실제 팜맵 WMS를 겹치려면 `.env.example`을 `.env`로 복사하거나 **운영 설정 → 팜맵 연계**에서 개발용 설정을 입력합니다.

```env
VITE_FARMMAP_API_KEY=발급받은_API_키
VITE_FARMMAP_DOMAIN=http://localhost:5173
VITE_FARMMAP_YEAR=2025
```

현재 MVP는 공식 WMS GetCapabilities 규격과 `farm_map_api` 레이어를 사용하도록 준비되어 있습니다. `VITE_` 변수는 브라우저에 노출되므로 운영 환경에서는 인증키를 프런트엔드에 넣지 말고, 허용 도메인이 고정된 서버 BFF/타일 프록시에서 관리해야 합니다.

## 운영 전 필수 작업

1. API 서버, PostGIS, 원본 증빙용 객체 저장소, 사용자 인증을 연결합니다.
2. 시도별 팜맵 SHP 또는 승인된 OpenAPI를 정기 동기화하고 원본 버전·촬영연도·갱신일을 보존합니다.
3. 팜맵 도형과 지적 PNU를 1:1로 가정하지 않고 중첩률을 가진 N:M 대응표로 관리합니다.
4. 농지대장·농업경영체·인허가 등 권한이 확보된 행정자료를 별도 계층으로 결합합니다.
5. 현장용 PWA 오프라인 큐, 재전송, 사진 해시와 GPS 정확도 검증을 구현합니다.
6. 행 단위 권한, 개인정보 마스킹, 불변 감사로그, 검수·이의처리 절차를 적용합니다.

상세 설계는 [운영 아키텍처](docs/ARCHITECTURE.md)와 [팜맵 연계 가이드](docs/FARMMAP_INTEGRATION.md)를 참고하세요.

## 공식 참고자료

- [농식품 팜맵 서비스](https://agis.epis.or.kr/ASD/main/intro.do)
- [팜맵 활용 및 OpenAPI 안내](https://agis.epis.or.kr/ASD/guide/faq.do?bbsSn=3)
- [팜맵 FAQ](https://agis.epis.or.kr/ASD/guide/faq.do?bbsSn=2)
- [농림축산식품 공공데이터포털 팜맵 OpenAPI](https://www.data.go.kr/data/15057368/openapi.do)
- [2026년 농지이용실태조사 추진계획](https://mafra.go.kr/bbs/home/795/597611/download.do)

## 기술 스택

React, TypeScript, Vite, React Router, React Leaflet, Vitest, Testing Library, ESLint
