// Snake: a 20x20 grid. The snake speeds up as it eats.
(function () {
  var GRID = 20;
  var START_MS = 140;
  var MIN_MS = 70;

  var canvas = document.getElementById('c');
  var ctx = canvas.getContext('2d');
  var cell = canvas.width / GRID;
  var scoreEl = document.getElementById('score');
  var bestEl = document.getElementById('best');
  var msgEl = document.getElementById('msg');
  var startBtn = document.getElementById('start');
  var boardEl = document.getElementById('board');
  var cfg = window.SNAKE || {};

  var DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  var snake, dir, queue, food, score, timer, running, paused, playedMs, lastStart;
  var best = Number(bestEl.textContent) || 0;

  function color(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function say(text, kind) {
    msgEl.textContent = text;
    msgEl.className = 'overlay-msg' + (kind ? ' ' + kind : '');
  }

  function placeFood() {
    var free = [];
    for (var x = 0; x < GRID; x++) {
      for (var y = 0; y < GRID; y++) {
        if (!snake.some(function (p) { return p[0] === x && p[1] === y; })) free.push([x, y]);
      }
    }
    food = free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  function reset() {
    snake = [[9, 10], [8, 10], [7, 10]];
    dir = 'right';
    queue = [];
    score = 0;
    playedMs = 0;
    scoreEl.textContent = '0';
    placeFood();
    draw();
  }

  function speed() {
    return Math.max(MIN_MS, START_MS - score * 3);
  }

  function draw() {
    var bg = color('--bg'), line = color('--line'), accent = color('--accent'), ok = color('--ok');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = line;
    ctx.lineWidth = 1;
    for (var i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * cell, 0); ctx.lineTo(i * cell, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * cell); ctx.lineTo(canvas.width, i * cell); ctx.stroke();
    }
    if (food) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(food[0] * cell + cell / 2, food[1] * cell + cell / 2, cell * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
    snake.forEach(function (p, i) {
      ctx.fillStyle = ok;
      ctx.globalAlpha = i === 0 ? 1 : 0.75;
      ctx.fillRect(p[0] * cell + 1.5, p[1] * cell + 1.5, cell - 3, cell - 3);
    });
    ctx.globalAlpha = 1;
  }

  function turn(next) {
    var last = queue.length ? queue[queue.length - 1] : dir;
    var a = DIRS[last], b = DIRS[next];
    if (!b || (a[0] + b[0] === 0 && a[1] + b[1] === 0) || next === last) return;
    if (queue.length < 3) queue.push(next);
  }

  function step() {
    if (queue.length) dir = queue.shift();
    var d = DIRS[dir];
    var head = [snake[0][0] + d[0], snake[0][1] + d[1]];
    var eating = food && head[0] === food[0] && head[1] === food[1];
    var body = eating ? snake : snake.slice(0, -1);
    var hitWall = head[0] < 0 || head[1] < 0 || head[0] >= GRID || head[1] >= GRID;
    var hitSelf = body.some(function (p) { return p[0] === head[0] && p[1] === head[1]; });
    if (hitWall || hitSelf) return gameOver();
    snake.unshift(head);
    if (eating) {
      score++;
      scoreEl.textContent = String(score);
      placeFood();
      if (!food) return gameOver(true);
    } else {
      snake.pop();
    }
    draw();
    timer = setTimeout(step, speed());
  }

  function start() {
    reset();
    running = true;
    paused = false;
    lastStart = Date.now();
    startBtn.textContent = 'Pause';
    say('Go!');
    timer = setTimeout(step, speed());
  }

  function togglePause() {
    if (!running) return start();
    paused = !paused;
    if (paused) {
      clearTimeout(timer);
      playedMs += Date.now() - lastStart;
      startBtn.textContent = 'Resume';
      say('Paused. Press Space or Resume to continue.');
    } else {
      lastStart = Date.now();
      startBtn.textContent = 'Pause';
      say('');
      timer = setTimeout(step, speed());
    }
  }

  function gameOver(won) {
    clearTimeout(timer);
    running = false;
    playedMs += Date.now() - lastStart;
    startBtn.textContent = 'Play again';
    draw();
    var text = (won ? 'You filled the board! ' : 'Game over! ') + 'You scored ' + score + '.';
    if (!cfg.loggedIn) {
      if (score > best) { best = score; bestEl.textContent = String(best); }
      return say(text + (score ? ' Log in to save your score.' : ''));
    }
    if (!score) return say(text);
    say(text + ' Saving…');
    fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': cfg.csrf },
      body: JSON.stringify({ score: score, durationMs: playedMs })
    }).then(function (r) { return r.json(); }).then(function (res) {
      if (res.error) return say(text + ' ' + res.error, 'bad');
      best = res.best;
      bestEl.textContent = String(best);
      say(text + (score >= best ? ' New personal best!' : ' Score saved.'), 'ok');
      loadBoard();
    }).catch(function () {
      say(text + ' Couldn’t save your score. Please check your connection.', 'bad');
    });
  }

  function loadBoard() {
    fetch('/api/scores').then(function (r) { return r.json(); }).then(function (res) {
      boardEl.innerHTML = '';
      if (!res.scores || !res.scores.length) {
        boardEl.innerHTML = '<li><span>No scores yet. Be the first!</span><span></span></li>';
        return;
      }
      res.scores.forEach(function (s) {
        var li = document.createElement('li');
        var who = document.createElement('span');
        var pts = document.createElement('span');
        who.textContent = s.player;
        pts.textContent = s.score;
        li.appendChild(who);
        li.appendChild(pts);
        boardEl.appendChild(li);
      });
    }).catch(function () {
      boardEl.innerHTML = '<li><span>Leaderboard unavailable right now.</span><span></span></li>';
    });
  }

  var KEYS = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right'
  };

  document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { e.preventDefault(); togglePause(); return; }
    var next = KEYS[e.key];
    if (!next) return;
    e.preventDefault();
    if (!running) start();
    if (!paused) turn(next);
  });

  startBtn.addEventListener('click', togglePause);

  document.querySelectorAll('.pad button').forEach(function (b) {
    b.addEventListener('click', function () {
      if (!running) start();
      if (!paused) turn(b.getAttribute('data-dir'));
    });
  });

  var touch = null;
  canvas.addEventListener('touchstart', function (e) {
    touch = [e.touches[0].clientX, e.touches[0].clientY];
  }, { passive: true });
  canvas.addEventListener('touchend', function (e) {
    if (!touch) return;
    var dx = e.changedTouches[0].clientX - touch[0];
    var dy = e.changedTouches[0].clientY - touch[1];
    touch = null;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) { if (!running) start(); return; }
    if (!running) start();
    if (!paused) turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', draw);

  reset();
  loadBoard();
})();
