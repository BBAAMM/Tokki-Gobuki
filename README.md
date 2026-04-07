# 🏎️ Touch Racing

실시간 터치 레이싱 게임. Socket.io 기반으로 팀별 터치 수를 집계해 레이싱 트랙으로 시각화합니다.

---

## 파일 구조

```
touch-racing/
├── server.js           # Express + Socket.io 서버 (게임 로직)
├── package.json
└── public/
    ├── player.html     # 플레이어 모바일 화면
    └── admin.html      # 관리자 레이싱 대형 화면
```

---

## 로컬 실행

```bash
npm install
npm start
# → http://localhost:3000/player.html  (플레이어)
# → http://localhost:3000/admin.html   (관리자)
```

---

## Railway 배포

1. GitHub에 이 폴더를 push
2. [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. 자동 감지 후 배포 완료
4. 생성된 URL 확인:
   - 플레이어: `https://your-app.up.railway.app/player.html`
   - 관리자:   `https://your-app.up.railway.app/admin.html`

> Railway는 Node.js + Socket.io WebSocket을 기본 지원합니다.

---

## 소켓 이벤트 요약

| 방향 | 이벤트 | 설명 |
|------|--------|------|
| Client → Server | `join_team` | 팀 입장 |
| Client → Server | `touch` | 터치 1회 |
| Server → All | `game_state` | 전체 상태 브로드캐스트 |
| Server → All | `score_update` | 터치마다 점수 브로드캐스트 |
| Admin → Server | `admin_start` | 게임 시작 |
| Admin → Server | `admin_reset` | 게임 리셋 |
| Admin → Server | `admin_set_target` | 목표 점수 변경 |

---

## 게임 흐름

1. 관리자가 `admin.html` 접속 → 목표 터치 수 설정
2. 플레이어들이 `player.html` 접속 → 닉네임 입력 → 팀 선택
3. 관리자가 **▶ 시작** 버튼 클릭
4. 플레이어 터치 → 실시간 레이싱 반영
5. 한 팀이 목표 도달 → 자동 종료 + 우승 연출
6. 관리자 **↺ 리셋** → 재시작 가능
