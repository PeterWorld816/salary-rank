# 내 연봉·자산 상위 몇 %?

지역(시/도)·구(서울)·결혼상태·연령대·성별·기업규모·직종을 고르고 실제 연봉과 순자산을
직접 입력하면, 통계청 공개 데이터 기반 근사치로 소득/자산 백분위와 여러 각도의 비교,
자산증식을 위한 일반적인 제안까지 보여주는 앱.

모든 계산은 100% 로컬(브라우저)에서 실행된다 — API 호출, 백엔드 없음.

---

## 데이터 & 계산 로직

- `data/salary.json` — 연령대/성별/결혼상태/기업규모/직종/지역(17개 시도)/서울 25개 구별
  평균 소득 + 소득 백분위 앵커 테이블. 출처: 통계청 임금근로일자리 소득 결과 기준 근사치.
- `data/networth.json` — 연령대/결혼상태/지역/서울 구별 평균 순자산 + 자산 백분위 앵커
  테이블. 출처: 가계금융복지조사 공표치 기준 근사치.
- `lib/percentileTable.ts` — 소득·자산 공용 log-log 보간 백분위 계산기.
- `lib/salaryCalc.ts` / `lib/netWorthCalc.ts` — 사용자가 입력한 실제 연봉/순자산을
  받아 전체 백분위 + "동일 연령대/직종/지역/구/결혼상태에서는 상위 몇 %?"를 계산.
- `lib/advice.ts` — 소득 백분위 대비 자산 백분위 격차와 연령대를 규칙 기반으로 비교해
  저축률·세제혜택 계좌·부채관리·분산 같은 일반적인 재무 팁을 생성 (특정 상품/종목 추천 아님).

> ⚠️ 지역·구·결혼상태 배율은 이 환경에서 KOSIS 등 공식 통계 API에 직접 접속할 수 없어
> 일반적으로 알려진 패턴 기반으로 만든 근사 보정값이다. 실제 서비스로 키울 때는
> KOSIS API/가계금융복지조사 원자료로 교체하는 걸 권장한다.

---

## 입력 흐름

```
/          → 랜딩, "시작하기" 버튼
/quiz      → 성별 → 연령대 → 결혼상태 → 지역(시/도) → (서울이면 구) →
             기업규모 → 직종 → 연봉 입력 → 순자산 입력
/result?d=<인코딩된 소득 입력>&nw=<순자산>&lang=<ko|en>
             → 소득/자산 백분위, 여러 각도 비교, 자산증식 제안, 공유 카드
/api/og    → 결과 공유용 OG 이미지 생성 (edge)
```

## 구조

```
app/
  page.tsx                  # 랜딩
  quiz/page.tsx              # 다단계 입력 폼 (성별~순자산까지)
  result/
    page.tsx                 # generateMetadata (OG 태그) + ResultClient 렌더
    ResultClient.tsx          # 결과 화면: 소득/자산 백분위, 비교, 제안, 공유
  api/og/route.tsx            # edge OG 이미지 생성
data/
  salary.json                 # 소득 통계 + 지역/구 테이블 (수정 대상)
  networth.json                # 자산 통계 + 지역/구 테이블 (수정 대상)
  jobVibe.ts                    # 직업 MZ 지수 (재미 요소, 통계 아님)
lib/
  salaryCalc.ts / netWorthCalc.ts / percentileTable.ts / advice.ts
  i18n.ts                        # ko/en 카피
components/
  StepSelectCard.tsx / NumberInputCard.tsx   # 입력 폼 단계별 카드
  ResultCard.tsx / DistributionChart.tsx     # 결과 화면 + 공유 카드
```

## Local dev

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deploy (Vercel)

```bash
vercel
```

Set `NEXT_PUBLIC_SITE_URL` in the project's environment variables so OG image URLs resolve
correctly in production (see `.env.local.example`).
