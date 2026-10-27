# 작업 인수인계서 — 보글보글 골목 타이쿤 v3.0

다른 개발자나 AI 도구가 이 저장소를 이어받아 수정할 때 필요한 정보만 모았다.
게임 규칙·조작·별 기준은 `README.md`, 테스트 실행법은 `tests/README.md`를 본다.

## 1. 바로 실행

```bash
npm install
npm run dev              # http://localhost:5173  (?day=3 · ?stage=h1|h2|endless 로 바로 진입)
npm run build:single     # dist-single/index.html — 인터넷 없이 열리는 한 파일
npm run build:artifact   # artifact/bogle_tycoon.html — Phaser를 jsDelivr CDN에서 불러오는 판
npx tsc --noEmit         # 타입 검사 (빌드 명령에도 포함)
```

- 필요: Node 20 이상, Python 3 + Pillow(도트 생성), fontTools(폰트 서브셋).
- `node_modules`, `dist*`, `artifact/`, `tools/out/`는 저장소에 없다. 위 명령으로 다시 만든다.

## 2. 폴더 지도

| 경로 | 역할 |
|---|---|
| `src/config/constants.ts` | 동적 레이아웃(세로 340~520 계산·배분), 조리 타이밍, 가격, 팔레트(Endesga 32), 폰트, 업그레이드 |
| `src/config/days.ts` | 스테이지 설정 d1~d5 · h1 · h2 · endless (시간, 화구 수, 메뉴, 손님 종류, 별 기준, 인트로 문구) |
| `src/scenes/` | `BootScene`(에셋·폰트 로드, 애니 생성) · `TitleScene`(스테이지 선택) · `GameScene`(영업 흐름, 튜토리얼, 매출, 정산) |
| `src/systems/Pot.ts` | 냄비 상태 머신 (LOCKED · EMPTY · HEATING · BOILING · SIMMERING · READY · BURNT) |
| `src/systems/Kitchen.ts` | 냄비 묶음, 손질대(도마·계란·치즈·싱크), 재료 선택 → 냄비 투입, 그릇 |
| `src/systems/Hand.ts` | 2단계 수동 타겟팅의 "손" — 집은 완성품(냄비·슬러시·떡볶이·어묵) → 손님 탭/드래그 |
| `src/systems/Slush.ts` | 슬러시 기계 + 오른쪽 레버(당긴 깊이 = 속도) + 완성 컵 홀더·휴지통 |
| `src/systems/FrontBar.ts` | 전방 매대(떡볶이 철판, 어묵탕) + 소품(TV·오락기) |
| `src/systems/Customers.ts` | 카운터 손님 4칸, 주문 생성, 메뉴별 서빙 판정, 손님 대사 |
| `src/systems/Cat.ts` | 도둑고양이(Day 5) |
| `src/systems/Progress.ts` | 저장 데이터(localStorage 키 `bogle-alley-tycoon-v3`), 별 합계, 히든·무한 해금 |
| `src/systems/SoundManager.ts` | Web Audio로 합성하는 칩튠 효과음 (외부 음원 파일 없음) |
| `src/ui/` | HUD, 주문 카드, 튜토리얼(손가락·스와이프), 팝업(인트로·영수증·상점·일시정지), StoryModal(대화 컷신), Backdrop(높이에 맞춘 배경 조립), Juice(연출), Frames(아이콘 꺼내기) |
| `tools/art_*.py` | 도트 그림 생성기 (시트마다 1개) · `pixel.py`(캔버스 도구) |
| `tools/gen_sprites.py` | art 스크립트 → `public/assets/sprites/*.png + *.json` 패킹 |
| `tools/subset_fonts.py` | 소스에 쓰인 글자만 남겨 갈무리 폰트 서브셋 |
| `tests/` | 헤드리스 브라우저 검증 55항목(`verify.mjs`), 뷰포트, 무작위 연타, 자동 플레이 봇 |

## 3. 화면 문구가 들어 있는 곳

| 문구 | 파일 |
|---|---|
| 스토리 컷신 대사 (프롤로그·각 Day·히든) | `src/ui/StoryModal.ts`의 `STORY` |
| 스테이지 제목·인트로 3줄 | `src/config/days.ts` |
| 손님 도착·반응 대사 | `src/systems/Customers.ts` (`ARRIVE_LINES` 등) |
| 하단 안내 줄, 튜토리얼·가이드 문구 | `src/scenes/GameScene.ts` (`IDLE_TIPS`, `guide(...)`, `leverGuide`) |
| 손질대 이름표 | `src/systems/Kitchen.ts` (`STATION_LABEL`) |
| 업그레이드 이름·설명 | `src/config/constants.ts` (`UPGRADES`) |
| 타이틀 로고·버튼 | `src/scenes/TitleScene.ts` |

**문구를 바꾼 뒤에는 반드시 `npm run fonts`** — 폰트가 서브셋이라 새 글자는 서브셋을 다시 만들기 전까지 화면에 빈칸으로 나온다. 이모지는 픽셀 폰트에 없어 쓰지 않는다.

## 4. 스프라이트 시트 규격 (바꿔 그릴 때 이 구조를 유지)

모든 시트는 **가로 한 줄** 배치, Aseprite JSON(hash) 형식, 프레임 키는 `"0"`, `"1"`, … (Phaser `createFromAseprite`가 이 형식을 요구). 태그 이름이 그대로 애니메이션 키·아이콘 이름으로 쓰이므로 **태그 이름·순서·프레임 수·프레임 크기를 바꾸면 코드가 깨진다.**

| 시트 | 프레임 | 크기 | 태그 |
|---|---|---|---|
| frontbar | 11 | 64×32 | griddle, tteok_cook, tteok_glossy, tteok_sticky, tteok_burnt, odeng_pot |
| kitchen_bg | 1 | 240×266 | kitchen_bg |
| peeps | 60 | 16×24 | kid / girl / teacher / hsgirl / judo 각각 _walk(4) _idle(2) _eat(2) _angry(2), cat_walk(4) cat_idle(2) cat_steal(2) cat_flee(2) |
| portraits | 8 | 32×32 | por_me, por_grandma, por_hsgirl, por_judo (각 2프레임) |
| pot_modular | 16 | 48×48 | pot_empty, pot_heating, pot_boiling_gold, pot_boiling, pot_simmering, pot_ready, pot_burnt, pot_topping_egg, pot_topping_scallion, pot_topping_cheese |
| prep | 12 | 56×44 | board_0, board_1, board_2, board_ready, board_chop, egg_basket, cheese_plate, sink_0, sink_1, sink_2, sink_wash |
| props | 12 | 32×32 | arcade(6), tv(6) |
| shop_bg | 1 | 240×128 | shop_bg |
| slush_machine | 13 | 48×64 | slush_idle, slush_pull, slush_overflow, slush_cup(6단계), slush_cup_overflow |
| ui_icons | 47 | 16×16 | ui_coin … ui_fever (전체 목록은 `public/assets/sprites/ui_icons.json`) |
| ui_mini | 7 | 8×8 | mini_ramen, mini_egg, mini_scallion, mini_cheese, mini_slush, mini_heart, mini_perfect |

- 한 번만 재생할지 반복할지는 `src/scenes/BootScene.ts`의 `LOOP` 정규식이 태그 이름으로 정한다. 새 반복 애니를 추가하면 여기에 이름을 넣는다.
- 아이콘은 태그 접두사로 시트를 고른다(`ui_`, `mini_`, `pot_` …) — `src/ui/Frames.ts`.
- 팔레트는 Endesga 32 (`tools/pixel.py`, `constants.ts`의 `C`).

**바꿔 그리는 두 가지 방법**
1. 생성기 수정: `tools/art_*.py`의 그리기 함수를 고치고 `npm run sprites` → PNG·JSON이 같은 구조로 다시 나온다(`tools/preview/`에 확대 미리보기).
2. 외부 도구로 그린 그림 사용: 같은 크기·같은 순서의 가로 시트 PNG를 만들어 `public/assets/sprites/<시트>.png`만 교체한다(JSON은 그대로 둬도 된다 — 프레임 위치·태그가 동일할 때).

PC의 Aseprite 작업 폴더 `aseprite-mcp\workspace\bogle\`에 같은 이름의 `.aseprite`(프레임·태그·프레임 시간 포함)와 `export\`가 있다. 원본을 보존하려면 다른 폴더에 복사해서 작업한다.

## 5. 고칠 때 자주 걸리는 점

- **Phaser 컨테이너에 `setSize`를 쓰지 말 것** — 사용자 지정 터치 영역의 기준점이 크기의 절반만큼 밀려 엉뚱한 곳이 눌린다(냄비 휴지통 오작동의 원인이었음).
- **세로 위치는 숫자로 박지 말고 `constants.ts`의 `LAYOUT`·`POT_CELLS`·`LEVER` 등에서 가져올 것** — 화면 높이가 기기마다 340~520으로 달라진다.
- **`index.html`·`tools/make_artifact.py`의 CSS에 flex 가운데 정렬을 다시 넣지 말 것** — Phaser 자체 정렬과 겹쳐 캔버스가 한쪽으로 밀리고 좌우 여백이 생긴다(v2.2에서 고친 버그).
- 테스트용 속도 조절: `window.__speed = 4` (트윈·타이머·애니 배속).
- 테스트가 읽는 전역: `window.__bogle`(현재 GameScene), `window.__layout`, `window.__titleLayout`, `window.__leverGeo`, `window.__story`, `window.__lastResult`. 이름을 바꾸면 `tests/`도 함께 고친다.
- 저장 데이터 형식을 바꾸면 `Progress.ts`의 이전(마이그레이션) 처리도 맞춘다.

## 6. 검증

```bash
npm run dev &
npm i -D puppeteer-core @sparticuz/chromium        # 또는 로컬 Chrome 경로로 executablePath 교체
node tests/verify.mjs                              # 55항목, 현재 전부 PASS (VP=360x520 으로 화면 크기 변경)
BASE=http://localhost:8822/index.html node tests/verify.mjs   # 빌드본 검증 시
node tests/viewport.mjs http://localhost:5173/ ./shots   # 5개 화면 크기 좌우 여백 측정 + 스크린샷
node tests/stress.mjs                              # 무작위 연타 후 복구
STAGES=d1,d3 node tests/bot.mjs none 0.8 250       # 자동 플레이 매출 (별 기준 보정용)
```

화면 문구를 바꾸면 `verify.mjs`의 문자열 비교 몇 곳(스토리 첫 줄 등)을 함께 고쳐야 할 수 있다.

## 7. 라이선스·출처 메모

- 도트 그림은 모두 `tools/art_*.py`로 이 프로젝트에서 직접 생성한 것이다.
- 폰트: 갈무리(Galmuri), SIL OFL 1.1 (`public/fonts/OFL-Galmuri.md`).
- 효과음: 외부 파일 없이 코드로 합성.
- 다른 회사의 캐릭터·로고·상표를 넣을 경우 그 권리는 이 저장소의 라이선스와 별개이므로, 공개 배포 전에 권리 관계를 따로 확인해야 한다.
