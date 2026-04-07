const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// ─── 팀 설정 ──────────────────────────────────────────────
const TEAMS = [
  { id: 'team1', name: '🔴 레드팀', color: '#FF4757' },
  { id: 'team2', name: '🔵 블루팀', color: '#1E90FF' },
  { id: 'team3', name: '🟢 그린팀', color: '#2ED573' },
  { id: 'team4', name: '🟡 옐로팀', color: '#FFA502' },
];

const DEFAULT_TARGET = 1000;

// ─── 게임 상태 ─────────────────────────────────────────────
let gameState = {
  status: 'waiting',   // waiting | playing | finished
  target: DEFAULT_TARGET,
  teams: Object.fromEntries(
    TEAMS.map(t => [t.id, { id: t.id, name: t.name, color: t.color, count: 0, players: 0 }])
  ),
  winner: null,
  teamList: TEAMS,
};

// socketId → { teamId, name }
let playerMap = {};

// ─── 헬퍼 ─────────────────────────────────────────────────
function resetGame() {
  gameState.status = 'waiting';
  gameState.winner = null;
  for (const id in gameState.teams) {
    gameState.teams[id].count = 0;
  }
}

function getSnapshot() {
  return {
    status: gameState.status,
    target: gameState.target,
    teams: gameState.teams,
    winner: gameState.winner,
    teamList: gameState.teamList,
  };
}

// ─── 소켓 이벤트 ───────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // 접속 즉시 현재 상태 전송
  socket.emit('game_state', getSnapshot());

  // 팀 입장
  socket.on('join_team', ({ teamId, playerName }) => {
    if (!gameState.teams[teamId]) return;

    // 기존 팀에서 제거
    if (playerMap[socket.id]) {
      const prev = playerMap[socket.id].teamId;
      gameState.teams[prev].players = Math.max(0, gameState.teams[prev].players - 1);
      socket.leave(prev);
    }

    playerMap[socket.id] = { teamId, name: playerName || '익명' };
    gameState.teams[teamId].players++;
    socket.join(teamId);

    socket.emit('joined', { teamId, playerName: playerName || '익명' });
    io.emit('game_state', getSnapshot());

    console.log(`  ${playerName} → ${teamId}`);
  });

  // 터치 이벤트
  socket.on('touch', () => {
    if (gameState.status !== 'playing') return;

    const player = playerMap[socket.id];
    if (!player) return;

    const team = gameState.teams[player.teamId];
    team.count++;

    // 승리 조건 체크
    if (team.count >= gameState.target && gameState.status === 'playing') {
      gameState.status = 'finished';
      gameState.winner = player.teamId;
    }

    io.emit('score_update', {
      teams: gameState.teams,
      status: gameState.status,
      winner: gameState.winner,
    });
  });

  // ─── 관리자 이벤트 ───────────────────────────────────────
  socket.on('admin_start', () => {
    if (gameState.status === 'waiting') {
      gameState.status = 'playing';
      io.emit('game_state', getSnapshot());
      console.log('[ADMIN] 게임 시작');
    }
  });

  socket.on('admin_reset', () => {
    resetGame();
    io.emit('game_state', getSnapshot());
    console.log('[ADMIN] 게임 리셋');
  });

  socket.on('admin_set_target', ({ target }) => {
    const val = parseInt(target);
    if (!isNaN(val) && val > 0) {
      gameState.target = val;
      io.emit('game_state', getSnapshot());
      console.log(`[ADMIN] 목표 변경 → ${val}`);
    }
  });

  // 연결 해제
  socket.on('disconnect', () => {
    const player = playerMap[socket.id];
    if (player && gameState.teams[player.teamId]) {
      gameState.teams[player.teamId].players = Math.max(
        0, gameState.teams[player.teamId].players - 1
      );
      io.emit('game_state', getSnapshot());
    }
    delete playerMap[socket.id];
    console.log(`[-] ${socket.id}`);
  });
});

// ─── 서버 시작 ────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Touch Racing server running on port ${PORT}`);
  console.log(`   Player : http://localhost:${PORT}/player.html`);
  console.log(`   Admin  : http://localhost:${PORT}/admin.html`);
});
