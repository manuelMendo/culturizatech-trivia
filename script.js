(function(){
  const root = document.getElementById('appRoot');
  const CATEGORIES = ['HISTORIA', 'GEOGRAFÍA', 'GASTRONOMÍA', 'MÚSICA', 'DEPORTE', 'CULTURA Y TRADICIONES'];
  const AVATAR_COLORS = ['#FFB627', '#3B82F6', '#FF4757', '#22C55E', '#A78BFA', '#FB923C'];

  function genCode(){ return String(Math.floor(1000 + Math.random()*9000)); }
  function genId(){ return Math.random().toString(36).slice(2,10); }
  function colorFor(str){
    let h = 0;
    for(let i=0;i<str.length;i++) h = str.charCodeAt(i) + ((h<<5)-h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }
  function initials(name){ return (name||'?').trim().slice(0,2).toUpperCase(); }

  function brandLogoHtml(size){
    return `
      <div class="brand-logo" style="width:${size}px; height:${size}px;">
        <img src="Logo.png" alt="Logo" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
        <div class="fallback" style="display:none; align-items:center; justify-content:center; width:100%; height:100%;">LOGO</div>
      </div>
    `;
  }
  function buntingHtml(){ return ''; }
  function sunWatermarkHtml(){ return ''; }
  function flagChipHtml(){ return ''; }

  // ---------------- STORAGE (FIREBASE REALTIME DATABASE) ----------------
  const firebaseConfig = {
    databaseURL: "https://solverapp-c1677-default-rtdb.firebaseio.com" // <-- TU URL DE FIREBASE
  };
  if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  const db = (typeof firebase !== 'undefined' && firebase.apps.length) ? firebase.database() : null;

  async function sGet(key){
    try{
      if(!db) return null;
      const path = key.replace(/:/g, '/');
      const snapshot = await db.ref(path).once('value');
      if(!snapshot.exists()) return null;
      const val = snapshot.val();
      
      // Corrección de listas vacías borradas por Firebase
      if(val && typeof val === 'object'){
        if(!val.players) val.players = [];
        if(!val.match) val.match = [];
        if(!val.matchScores) val.matchScores = {};
        if(!val.blockedFromBuzzing) val.blockedFromBuzzing = [];
      }
      return val;
    } catch(e){ return null; }
  }

  async function sSet(key, val){
    try{
      if(!db) return false;
      const path = key.replace(/:/g, '/');
      await db.ref(path).set(val);
      return true;
    } catch(e){ return false; }
  }

  async function sList(prefix){
    try{
      if(!db) return [];
      const path = prefix.replace(/:/g, '/').replace(/\/$/, '');
      const snapshot = await db.ref(path).once('value');
      if(!snapshot.exists()) return [];
      const data = snapshot.val();
      return Object.keys(data).map(k => `${prefix}${k}`);
    } catch(e){ return []; }
  }

  // ---------------- AUDIO FX ----------------
  let actx = null;
  function ensureAudio(){ if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return actx; }
  function tone(freq, start, dur, type='sine', vol=0.18){
    const ctx = ensureAudio(); if(!ctx) return;
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = vol;
    o.connect(g); g.connect(ctx.destination);
    const t0 = ctx.currentTime + start; g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function playDing(){ tone(988,0,0.28,'sine',0.2); }
  function playBeep(){ tone(440,0,0.1,'square',0.1); }
  function playError(){ tone(180,0,0.2,'sawtooth',0.2); }
  function playFanfare(){ tone(523,0,0.12,'triangle',0.2); tone(659,0.12,0.12,'triangle',0.2); tone(783,0.24,0.12,'triangle',0.2); tone(1046,0.36,0.4,'triangle',0.25); }

  let cleanupFns = [];
  function clearPolling(){ cleanupFns.forEach(fn=>fn()); cleanupFns = []; }

  function dotsHtml(count, of=3){
    let h = '';
    for(let i=0;i<of;i++) h += `<span class="dot${i<count?' filled':''}"></span>`;
    return h;
  }

  // ---------------- LANDING ----------------
  function renderLanding(){
    clearPolling();
    root.innerHTML = `
      <div class="landing">
        ${buntingHtml()}
        ${sunWatermarkHtml()}
        <div class="landing-badge">
          ${flagChipHtml()}
          <span class="pill pill-gold-outline">Especial Fiestas Patrias · Trivia en vivo</span>
        </div>
        <h1 class="landing-title">Culturizatech</h1>
        <p class="landing-sub">El juego de buzzer para poner a prueba a tus equipos. Crea una sala en la pantalla grande y que todos se unan desde el celular.</p>
        <div class="landing-actions">
          <button class="btn btn-peru" id="hostBtn">🖥️ Crear sala (Host / Pantalla TV)</button>
          <button class="btn btn-ghost" id="playerBtn">📱 Unirme como jugador</button>
        </div>
      </div>
    `;
    document.getElementById('hostBtn').onclick = renderHostConfig;
    document.getElementById('playerBtn').onclick = renderPlayerJoin;
  }

  // ---------------- HOST: CONFIGURACIÓN 12 EQUIPOS ----------------
  function renderHostConfig(){
    clearPolling();
    let inputsHtml = '';
    for(let i=1; i<=12; i++){
      inputsHtml += `<input class="field" id="tName${i}" value="Equipo ${i}" placeholder="Nombre equipo ${i}" />`;
    }
    root.innerHTML = `
      <div class="config-wrap">
        <div class="config-inner">
          <div class="eyebrow">Configuración del torneo</div>
          <h1 class="config-title">Nombra a tus 12 equipos</h1>
          <p class="config-desc">Estos nombres aparecerán en la pantalla TV y en la selección de cada jugador.</p>
          <div class="setup-grid">${inputsHtml}</div>

          <div class="card" style="margin-bottom:24px; display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
            <div>
              <div style="font-weight:800; font-size:14px; margin-bottom:4px;">Preguntas por categoría</div>
              <div style="color:var(--text-muted); font-size:12.5px;">Al elegir una categoría, el juego avanzará solo entre estas preguntas antes de pedir otra.</div>
            </div>
            <input class="field" type="number" id="qPerCat" value="10" min="1" max="20" style="width:90px; text-align:center; font-weight:800; font-size:18px;" />
          </div>

          <button class="btn btn-peru btn-block" id="startHostBtn" style="padding:18px; font-size:16px;">💾 Iniciar torneo y abrir TV</button>
        </div>
      </div>
    `;

    document.getElementById('startHostBtn').onclick = async () => {
      const teams = [];
      for(let i=1; i<=12; i++){
        teams.push(document.getElementById(`tName${i}`).value.trim() || `Equipo ${i}`);
      }
      let qPerCat = parseInt(document.getElementById('qPerCat').value, 10);
      if(!qPerCat || qPerCat < 1) qPerCat = 10;
      if(qPerCat > 20) qPerCat = 20;

      const code = genCode();
      const meta = {
        state: 'LOBBY',
        code: code,
        teams: teams,
        players: [],
        match: [],
        matchScores: {},
        activeCat: null,
        buzzWinner: null,
        buzzTime: null,
        blockedFromBuzzing: [],
        matchWinnerTeam: null,
        roundId: 1,
        questionsPerCategory: qPerCat,
        categoryQuestionIndex: 0
      };
      await sSet(`buzzer:${code}:meta`, meta);
      renderHostTV(code, meta);
    };
  }

  // ---------------- HOST Y TV: PANTALLA DIVIDIDA ----------------
  function renderHostTV(code, initialMeta = null){
    clearPolling();
    root.innerHTML = `
      <div class="app-shell">
        <div class="tv-panel" id="tvScreen"></div>
        <div class="host-panel" id="hostPanel"></div>
      </div>
    `;

    if(initialMeta) {
      updateTVScreen(initialMeta);
      updateHostPanel(initialMeta, code);
    }

    let stopped = false;
    cleanupFns.push(() => { stopped = true; });

    async function poll(){
      if(stopped) return;
      const meta = await sGet(`buzzer:${code}:meta`);
      if(meta){
        updateTVScreen(meta);
        updateHostPanel(meta, code);
        await checkBuzzes(code, meta);
      }
      if(!stopped) setTimeout(poll, 600);
    }
    poll();
  }

  function renderTopbar(meta){
    const showTimer = meta.state === 'ANSWERING';
    let remaining = 5;
    if(showTimer){
      const elapsed = Math.floor((Date.now() - (meta.buzzTime || Date.now())) / 1000);
      remaining = Math.max(0, 5 - elapsed);
    }
    const pct = showTimer ? (remaining/5) : 1;
    const circumference = 2 * Math.PI * 30;
    const dash = circumference * pct;

    return `
      <div class="tv-topbar">
        <span class="pill pill-live"><span class="dot-pulse"></span> EN VIVO</span>
        ${meta.activeCat && meta.state !== 'LOBBY' && meta.state !== 'MATCHUP' ? `
          <div class="tv-round-badge">
            <span class="pill pill-gold-outline">Categoría</span>
            <span class="cat">${meta.activeCat}</span>
          </div>` : `<div></div>`}
        <div class="timer-ring" style="${showTimer ? '' : 'visibility:hidden;'}">
          <svg width="76" height="76" viewBox="0 0 76 76">
            <circle cx="38" cy="38" r="30" fill="none" stroke="#262D48" stroke-width="6"/>
            <circle cx="38" cy="38" r="30" fill="none" stroke="${remaining<=2?'#FF4757':'#FFB627'}" stroke-width="6"
              stroke-dasharray="${circumference}" stroke-dashoffset="${circumference - dash}" stroke-linecap="round"/>
          </svg>
          <div class="center"><span class="val">${remaining}</span><span class="lbl">SEG</span></div>
        </div>
      </div>
    `;
  }

  function renderScoreboard(meta){
    if(!meta.match || meta.match.length === 0 || meta.state === 'LOBBY' || meta.state === 'MATCHUP') return '';
    const teamsHtml = meta.match.map(team => {
      const pts = meta.matchScores[team] || 0;
      return `
        <div class="tv-team-score">
          <span class="name">${team}</span>
          <div class="dots">${dotsHtml(pts,3)}</div>
        </div>
      `;
    }).join('<div class="tv-vs-small">VS</div>');
    return `<div class="tv-scoreboard">${teamsHtml}</div>`;
  }

  function renderPlayersPreview(meta){
    if(!meta.players || meta.players.length === 0) return '';
    const shown = meta.players.slice(-5);
    const cards = shown.map((p) => `
      <div class="phone-mock">
        <div class="code-lbl">SALA: ${meta.code}</div>
        <div class="avatar" style="background:${colorFor(p.group||p.name)};">${initials(p.name)}</div>
        <div class="pname">${p.name}</div>
        <div class="status"><span class="dot"></span> Conectado</div>
      </div>
    `).join('');
    return `
      <div class="tv-players-preview">
        <div class="head">📱 Vista de los jugadores (móvil) · ${(meta.players || []).length} conectados</div>
        <div class="phones-row">${cards}</div>
      </div>
    `;
  }

  function updateTVScreen(meta){
    const tv = document.getElementById('tvScreen');
    let html = buntingHtml();
    html += sunWatermarkHtml();
    html += `
      <div class="tv-brand-row">
        <span class="brand-name">Culturizatech · Fiestas Patrias</span>
      </div>
    `;
    html += renderTopbar(meta);
    html += renderScoreboard(meta);

    const playerList = meta.players || [];

    if(meta.state === 'LOBBY'){
      html += `
        <div class="tv-hero">
          <div class="tv-eyebrow">Torneo oficial</div>
          <div class="tv-title">Culturizatech</div>
          <div class="tv-code">${meta.code}</div>
          <div class="tv-hint">Jugadores conectados: ${playerList.length}</div>
        </div>
        ${renderPlayersPreview(meta)}
      `;
    }
    else if(meta.state === 'MATCHUP'){
      const badges = meta.match.map(t => `<div class="tv-group-badge">${t}</div>`).join('<div class="tv-vs">VS</div>');
      html += `
        <div class="tv-hero">
          <div class="tv-eyebrow">Siguiente duelo · Mejor de 3</div>
          <div class="tv-title">¡Prepárense!</div>
          <div class="tv-matchup">${badges || '<span style="color:var(--text-muted)">Arma el duelo desde el panel →</span>'}</div>
        </div>
        ${renderPlayersPreview(meta)}
      `;
    }
    else if(meta.state === 'CAT_SELECT'){
      html += `
        <div class="tv-hero">
          <div class="tv-eyebrow">Turno de elegir</div>
          <div class="tv-title">¿Qué categoría eligen?</div>
          <div class="tv-cat-grid">${CATEGORIES.map(c => `<div class="tv-cat-chip">${c}</div>`).join('')}</div>
        </div>
      `;
    }
    else if(meta.state === 'READING'){
      html += `
        <div class="tv-hero">
          <div class="tv-question-box">
            <div class="question-progress">📋 Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</div>
            <div class="eyebrow" style="text-align:center; margin-bottom:8px;">Categoría actual</div>
            <div class="tv-q-cat">${meta.activeCat}</div>
            <div class="tv-warning">⚠️ SILENCIO — EL HOST ESTÁ LEYENDO ⚠️</div>
          </div>
        </div>
      `;
    }
    else if(meta.state === 'BUZZING'){
      html += `
        <div class="tv-hero">
          <div class="tv-question-box">
            <div class="question-progress">📋 Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</div>
            <div class="tv-q-cat" style="font-size:30px; color:var(--gold-dim);">${meta.activeCat}</div>
            <div class="tv-go">🔔 ¡PRESIONEN AHORA! 🔔</div>
          </div>
        </div>
      `;
    }
    else if(meta.state === 'ANSWERING'){
      const winnerName = playerList.find(p => p.id === meta.buzzWinner)?.name || 'Jugador';
      const winnerTeam = playerList.find(p => p.id === meta.buzzWinner)?.group || '';
      const elapsed = Math.floor((Date.now() - (meta.buzzTime || Date.now())) / 1000);
      const remaining = Math.max(0, 5 - elapsed);
      html += `
        <div class="tv-hero">
          <div class="tv-question-box">
            <div class="question-progress">📋 Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</div>
            <div class="tv-q-cat" style="font-size:24px; color:var(--gold-dim); margin-bottom:6px;">${meta.activeCat}</div>
            <div class="tv-buzz-winner">🔔 ¡${winnerTeam} (${winnerName})!</div>
            <div class="timer-box">⏱️ ${remaining} SEG</div>
          </div>
        </div>
      `;
    }
    else if(meta.state === 'MATCH_WINNER'){
      html += `
        <div class="tv-hero">
          <div class="tv-eyebrow">Duelo finalizado</div>
          <div class="tv-title" style="color:var(--success);">¡Tenemos ganador!</div>
          <div class="tv-winner-badge">🏆 ${meta.matchWinnerTeam} 🏆</div>
          <div class="tv-hint">Avanza a la siguiente etapa</div>
        </div>
      `;
    }
    if(tv.innerHTML !== html) tv.innerHTML = html;
  }

  // ---- HOST PANEL ----
  let lastHostState = null;
  let lastScoresStr = null;

  function buildLeaderboardHtml(meta){
    if(meta.match && meta.match.length > 0){
      return meta.match.map(t => `
        <div class="lb-item">
          <div class="mid">
            <span>${t}</span>
            <div class="dots">${dotsHtml(meta.matchScores[t] || 0, 3)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:10px;">
            <span class="score-num">${meta.matchScores[t] || 0}</span>
            <button class="btn btn-ghost btn-sm manual-add" data-team="${t}">+1</button>
          </div>
        </div>
      `).join('');
    }
    return `<div style="color:var(--text-muted); font-size:13px; text-align:center; padding:10px 0;">Aún no hay un duelo activo</div>`;
  }

  function bindManualButtons(code){
    document.querySelectorAll('.manual-add').forEach(btn => {
      btn.onclick = async () => {
        const m = await sGet(`buzzer:${code}:meta`);
        const team = btn.dataset.team;
        m.matchScores[team] = (m.matchScores[team] || 0) + 1;
        await sSet(`buzzer:${code}:meta`, m);
      };
    });
  }

  function stepTrackerHtml(state){
    if(state === 'LOBBY' || state === 'MATCHUP') return '';
    const steps = [
      { n:1, lbl:'LEER', match:['READING'] },
      { n:2, lbl:'BUZZERS', match:['BUZZING'] },
      { n:3, lbl:'RESPUESTA', match:['ANSWERING'] },
      { n:4, lbl:'RESULTADO', match:['CAT_SELECT','MATCH_WINNER'] },
    ];
    const activeIdx = steps.findIndex(s => s.match.includes(state));
    return `
      <div class="step-tracker">
        ${steps.map((s,i) => `
          <div class="step-chip ${i===activeIdx?'active':(i<activeIdx?'done':'')}">
            <span class="num">${i<activeIdx?'✓':s.n}</span>
            <span class="lbl">${s.lbl}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  function updateHostPanel(meta, code){
    const panel = document.getElementById('hostPanel');
    const scoresHash = JSON.stringify(meta.matchScores) + meta.state;
    const playerList = meta.players || [];

    if(lastHostState !== meta.state){
      lastHostState = meta.state;
      lastScoresStr = scoresHash;

      let controlsHtml = '';

      if(meta.state === 'LOBBY'){
        controlsHtml = `
          <div class="control-box">
            <h3>Sala abierta</h3>
            <p class="hint">Espera que los jugadores ingresen el código en sus celulares.</p>
            <button class="btn btn-gold btn-block" id="btnToMatchup">Crear primer duelo →</button>
          </div>
        `;
      }
      else if(meta.state === 'MATCHUP' || meta.state === 'MATCH_WINNER'){
        const teamOptions = meta.teams.map(t => `<option value="${t}">${t}</option>`).join('');
        controlsHtml = `
          <div class="control-box">
            <h3>Armar duelo · Mejor de 3</h3>
            <div class="field-stack">
              <select id="p1Select" class="field">${teamOptions}</select>
              <div class="vs-lbl">VS</div>
              <select id="p2Select" class="field">${teamOptions}</select>
              <div class="vs-lbl">VS (3er equipo opcional)</div>
              <select id="p3Select" class="field">
                <option value="">— Ninguno —</option>
                ${teamOptions}
              </select>
            </div>
            <button class="btn btn-gold btn-block" id="btnConfirmMatch" style="margin-top:14px;">Fijar duelo y empezar</button>
          </div>
        `;
        if(meta.state === 'MATCH_WINNER'){
          controlsHtml = `
            <div class="control-box" style="border-color:var(--success); text-align:center;">
              <h3 style="color:var(--success);">¡Duelo terminado!</h3>
              <p class="hint" style="margin-bottom:0;">Ganador: <b style="color:var(--text-primary);">${meta.matchWinnerTeam}</b></p>
            </div>
          ` + controlsHtml;
        }
      }
      else if(meta.state === 'CAT_SELECT'){
        controlsHtml = `
          <div class="control-box">
            <h3>Pregúntales la categoría</h3>
            <p class="hint">Toca la categoría que elijan en voz alta.</p>
            <div class="field-stack">
              ${CATEGORIES.map(c => `<button class="btn btn-ghost cat-btn" data-cat="${c}">${c}</button>`).join('')}
            </div>
          </div>
        `;
      }
      else if(meta.state === 'READING'){
        controlsHtml = `
          <div class="control-box" style="border-color:var(--danger);">
            <span class="question-progress">Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</span>
            <h3 style="color:var(--danger); margin-top:8px;">Paso 1 · Lee la pregunta</h3>
            <p class="hint">Los celulares están bloqueados. Lee tu papel. Al terminar, dales paso.</p>
            <button class="btn btn-gold btn-block" id="btnUnlock">🔊 Desbloquear buzzers</button>
          </div>
        `;
      }
      else if(meta.state === 'BUZZING'){
        controlsHtml = `
          <div class="control-box" style="border-color:var(--success);">
            <span class="question-progress">Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</span>
            <h3 style="color:var(--success); margin-top:8px;">Paso 2 · Esperando…</h3>
            <p class="hint">Si nadie presiona o nadie sabe, avanza a la siguiente pregunta.</p>
            <button class="btn btn-ghost btn-block" id="btnSkip">Nadie supo (siguiente pregunta)</button>
          </div>
        `;
      }
      else if(meta.state === 'ANSWERING'){
        const wTeam = playerList.find(p => p.id === meta.buzzWinner)?.group || '';
        controlsHtml = `
          <div class="control-box">
            <span class="question-progress">Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</span>
            <h3 style="margin-top:8px;">Paso 3 · Juez</h3>
            <p class="hint">Califica la respuesta de <b style="color:var(--text-primary);">${wTeam}</b>.</p>
            <div class="action-row" style="grid-template-columns:1fr 1fr;">
              <button class="btn btn-success" id="btnCorrect" style="flex-direction:row; padding:15px;">✅ Correcto</button>
              <button class="btn btn-danger" id="btnWrong" style="flex-direction:row; padding:15px;">❌ Incorrecto</button>
            </div>
          </div>
        `;
      }

      const winnerTeam = playerList.find(p => p.id === meta.buzzWinner)?.group;
      const winnerName = playerList.find(p => p.id === meta.buzzWinner)?.name;

      panel.innerHTML = `
        <div class="host-topline">
          <div class="title-group">
            <span class="title">👑 PANEL DEL ANFITRIÓN<small>Culturizatech · Fiestas Patrias</small></span>
          </div>
          ${flagChipHtml()}
        </div>

        <div class="room-code-card">
          <div class="lbl">CÓDIGO DE SALA</div>
          <div class="room-code-row">
            <span class="code">${meta.code}</span>
            <button class="copy-btn" id="btnCopyCode" title="Copiar código">⧉</button>
          </div>
          <div class="players-online"><span class="dot"></span> ${playerList.length} jugadores conectados</div>
        </div>

        ${stepTrackerHtml(meta.state)}

        <div class="host-controls" style="display:flex; flex-direction:column; gap:16px;">
          ${controlsHtml}

          ${winnerTeam ? `
            <div class="winner-box">
              <div class="lbl">ÚLTIMO GANADOR DEL BUZZER</div>
              <div class="row">
                <div class="who">
                  <span class="ico">🙋</span>
                  <div>
                    <div class="name">${winnerTeam}</div>
                    <div class="sub">${winnerName || ''}</div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="scoreboard-card">
            <div class="lbl">MARCADOR</div>
            <div id="hostLeaderboard">${buildLeaderboardHtml(meta)}</div>
          </div>

          <div class="bottom-actions">
            ${meta.state !== 'LOBBY' && meta.state !== 'MATCHUP' && meta.state !== 'MATCH_WINNER' ?
              `<button class="btn btn-ghost danger-outline" id="btnBackMatch">⏹ Abortar</button>` :
              `<div></div>`}
            <button class="btn btn-ghost" id="btnConfig">⚙️ Config</button>
            <button class="btn btn-danger" id="btnFinish">🏁 Finalizar</button>
          </div>
        </div>
      `;

      // ==== EVENTOS ====
      bindManualButtons(code);

      document.getElementById('btnCopyCode').onclick = () => {
        navigator.clipboard?.writeText(meta.code).catch(()=>{});
        const b = document.getElementById('btnCopyCode');
        b.textContent = '✓'; setTimeout(() => { b.textContent = '⧉'; }, 1200);
      };

      if(document.getElementById('btnConfig')) document.getElementById('btnConfig').onclick = () => renderHostConfig();
      if(document.getElementById('btnFinish')) document.getElementById('btnFinish').onclick = () => {
        if(confirm('¿Finalizar la partida y volver al inicio?')) renderLanding();
      };

      if(document.getElementById('btnToMatchup')) document.getElementById('btnToMatchup').onclick = () => changeState(code, 'MATCHUP');

      if(document.getElementById('btnConfirmMatch')) document.getElementById('btnConfirmMatch').onclick = async () => {
        const m = await sGet(`buzzer:${code}:meta`);
        const p1 = document.getElementById('p1Select').value;
        const p2 = document.getElementById('p2Select').value;
        const p3 = document.getElementById('p3Select').value;
        let matchTeams = [p1, p2];
        if(p3 && p3 !== p1 && p3 !== p2) matchTeams.push(p3);
        m.match = [...new Set(matchTeams)];
        m.matchScores = {};
        m.match.forEach(t => m.matchScores[t] = 0);
        m.state = 'CAT_SELECT';
        await sSet(`buzzer:${code}:meta`, m);
      };

      document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.onclick = async () => {
          const m = await sGet(`buzzer:${code}:meta`);
          m.activeCat = btn.dataset.cat;
          m.state = 'READING';
          m.roundId += 1;
          m.buzzWinner = null;
          m.blockedFromBuzzing = [];
          m.categoryQuestionIndex = 1;
          await sSet(`buzzer:${code}:meta`, m);
        };
      });

      if(document.getElementById('btnUnlock')) document.getElementById('btnUnlock').onclick = () => { playBeep(); changeState(code, 'BUZZING'); };

      if(document.getElementById('btnSkip')) document.getElementById('btnSkip').onclick = async () => {
        const m = await sGet(`buzzer:${code}:meta`);
        advanceQuestion(m);
        await sSet(`buzzer:${code}:meta`, m);
      };

      if(document.getElementById('btnCorrect')) document.getElementById('btnCorrect').onclick = async () => {
        const m = await sGet(`buzzer:${code}:meta`);
        const wTeam = (m.players || []).find(p => p.id === m.buzzWinner)?.group;
        if(wTeam) {
          m.matchScores[wTeam] = (m.matchScores[wTeam] || 0) + 1;
          playFanfare();
          if(m.matchScores[wTeam] >= 3) {
            m.state = 'MATCH_WINNER';
            m.matchWinnerTeam = wTeam;
            m.buzzWinner = null;
          } else {
            advanceQuestion(m);
            m.buzzWinner = null;
          }
        } else {
          m.buzzWinner = null;
        }
        await sSet(`buzzer:${code}:meta`, m);
      };

      if(document.getElementById('btnWrong')) document.getElementById('btnWrong').onclick = async () => {
        const m = await sGet(`buzzer:${code}:meta`);
        const wTeam = (m.players || []).find(p => p.id === m.buzzWinner)?.group;
        playError();
        if(wTeam && !m.blockedFromBuzzing.includes(wTeam)) m.blockedFromBuzzing.push(wTeam);
        m.state = 'BUZZING';
        m.buzzWinner = null;
        m.roundId += 1;
        await sSet(`buzzer:${code}:meta`, m);
      };

      if(document.getElementById('btnBackMatch')) document.getElementById('btnBackMatch').onclick = () => changeState(code, 'MATCHUP');

    }
    else if (lastScoresStr !== scoresHash) {
      lastScoresStr = scoresHash;
      const lb = document.getElementById('hostLeaderboard');
      if (lb) {
        lb.innerHTML = buildLeaderboardHtml(meta);
        bindManualButtons(code);
      }
    }
  }

  function advanceQuestion(m){
    const total = m.questionsPerCategory || 10;
    if((m.categoryQuestionIndex || 0) >= total){
      m.state = 'CAT_SELECT';
      m.categoryQuestionIndex = 0;
    } else {
      m.categoryQuestionIndex = (m.categoryQuestionIndex || 0) + 1;
      m.state = 'READING';
      m.roundId += 1;
      m.buzzWinner = null;
      m.blockedFromBuzzing = [];
    }
    return m;
  }

  async function changeState(code, state){
    const m = await sGet(`buzzer:${code}:meta`);
    m.state = state;
    await sSet(`buzzer:${code}:meta`, m);
  }

  async function checkBuzzes(code, meta){
    if(meta.state !== 'BUZZING') return;
    const keys = await sList(`buzzer:${code}:buzz:`);
    if(!keys || keys.length === 0) return;

    const entries = [];
    for(const k of keys){
      const v = await sGet(k);
      if(v && v.roundId === meta.roundId) entries.push(v);
    }
    if(entries.length === 0) return;

    entries.sort((a,b) => a.timestamp - b.timestamp);
    const winner = entries[0];

    meta.state = 'ANSWERING';
    meta.buzzWinner = winner.id;
    meta.buzzTime = Date.now();
    playDing();
    await sSet(`buzzer:${code}:meta`, meta);
  }

  // ---------------- PLAYER: JUGADOR MÓVIL ----------------
  async function renderPlayerJoin(){
    clearPolling();
    root.innerHTML = `
      <div class="mobile-view" style="justify-content:center;">
        <h2 style="font-family:var(--font-display); margin-bottom:24px; color:var(--gold); font-size:26px;">Culturizatech</h2>
        <input class="field" id="codeInput" placeholder="Código de la TV (ej. 4821)" inputmode="numeric" maxlength="4" style="text-align:center; font-size:22px; padding:18px; margin-bottom:12px;" />
        <button class="btn btn-ghost btn-block" id="checkCodeBtn" style="padding:18px; margin-bottom:16px; font-size:16px;">Buscar sala</button>
        <div id="playerDetailsForm" style="display:none; width:100%; max-width:360px;">
          <input class="field" id="nameInput" placeholder="Tu nombre o apodo" maxlength="15" style="margin-bottom:10px;" />
          <select class="field" id="groupSelect" style="margin-bottom:18px;"></select>
          <button class="btn btn-gold btn-block" id="joinBtn" style="padding:18px; font-size:18px;">🎮 Entrar al torneo</button>
        </div>
        <div id="errMsg" style="color:var(--danger); margin-top:10px; font-weight:700; text-align:center; font-size:14px;"></div>
      </div>
    `;

    document.getElementById('checkCodeBtn').onclick = async () => {
      const code = document.getElementById('codeInput').value.trim();
      const err = document.getElementById('errMsg');
      if(!code){ err.textContent = 'Ingresa el código'; return; }

      const meta = await sGet(`buzzer:${code}:meta`);
      if(!meta){ err.textContent = 'Sala no encontrada. Revisa la pantalla.'; return; }

      err.textContent = '';
      document.getElementById('checkCodeBtn').style.display = 'none';

      const select = document.getElementById('groupSelect');
      select.innerHTML = meta.teams.map(t => `<option value="${t}">${t}</option>`).join('');
      document.getElementById('playerDetailsForm').style.display = 'block';
    };

    document.getElementById('joinBtn').onclick = async () => {
      const code = document.getElementById('codeInput').value.trim();
      const name = document.getElementById('nameInput').value.trim();
      const group = document.getElementById('groupSelect').value;
      const err = document.getElementById('errMsg');

      if(!name){ err.textContent = 'Ingresa tu nombre'; return; }
      const meta = await sGet(`buzzer:${code}:meta`);
      if(!meta){ err.textContent = 'Error al cargar la sala'; return; }

      if(!meta.players) meta.players = [];

      const id = genId();
      meta.players.push({ id, name, group });
      await sSet(`buzzer:${code}:meta`, meta);
      renderPlayerGame(code, id, name, group);
    };
  }

  function renderPlayerGame(code, id, name, group){
    clearPolling();
    root.innerHTML = `
      <div class="mobile-view" style="padding:20px 18px;">
        <div class="mobile-header">
          <div class="name">${name}</div>
          <div class="group">${group}</div>
        </div>
        <div id="playerStage" class="buzz-stage"></div>
        <button class="btn btn-ghost btn-block" id="leaveBtn" style="margin-top:18px; font-size:13px; padding:12px 20px;">🚪 Cambiar de equipo / salir</button>
      </div>
    `;

    document.getElementById('leaveBtn').onclick = () => { renderPlayerJoin(); };

    let stopped = false;
    cleanupFns.push(() => { stopped = true; });

    async function poll(){
      if(stopped) return;
      const meta = await sGet(`buzzer:${code}:meta`);
      if(meta){
        const stage = document.getElementById('playerStage');
        const isMyTurn = meta.match.includes(group) && meta.state !== 'LOBBY' && meta.state !== 'MATCHUP' && meta.state !== 'MATCH_WINNER';

        if(!isMyTurn){
          let msg = meta.state === 'MATCH_WINNER' ? '¡Duelo terminado!' : 'Descansando…';
          stage.innerHTML = `
            <div class="stage-title" style="color:var(--text-muted); font-size:24px;">${msg}</div>
            <div class="stage-sub">Mirando el duelo:<br><b style="color:var(--text-primary); font-size:18px;">${meta.match.join(' vs ') || 'Nadie aún'}</b></div>
          `;
        }
        else {
          const progressBadge = (meta.questionsPerCategory && meta.state !== 'CAT_SELECT')
            ? `<div class="question-progress">Pregunta ${meta.categoryQuestionIndex} de ${meta.questionsPerCategory}</div>` : '';

          if(meta.state === 'CAT_SELECT'){
            stage.innerHTML = `<div class="stage-title">Dile al host qué categoría eligen</div>`;
          }
          else if(meta.state === 'READING'){
            stage.innerHTML = `
              ${progressBadge}
              <div class="stage-title">¡Escucha al host!</div>
              <div class="stage-locked">🔒</div>
              <div class="stage-sub" style="color:var(--danger); font-weight:700;">Buzzer inactivo…</div>
            `;
          }
          else if(meta.state === 'BUZZING'){
            const isBlockedByRebound = meta.blockedFromBuzzing.includes(group);
            if(isBlockedByRebound){
              stage.innerHTML = `
                <div class="stage-title" style="color:var(--danger);">Bloqueado ❌</div>
                <div class="stage-sub">Tu equipo falló. Es turno del rival (rebote).</div>
              `;
            } else {
              if(!document.getElementById('buzzBtn')){
                stage.innerHTML = `${progressBadge}<button class="buzz-btn" id="buzzBtn">BUZZ</button>`;
                document.getElementById('buzzBtn').onclick = async (e) => {
                  e.target.disabled = true;
                  if(navigator.vibrate) navigator.vibrate([150,50,150]);
                  await sSet(`buzzer:${code}:buzz:${id}`, { id, timestamp: Date.now(), roundId: meta.roundId });
                };
              }
            }
          }
          else if(meta.state === 'ANSWERING'){
            if(meta.buzzWinner === id){
              stage.innerHTML = `
                <div class="stage-title" style="color:var(--success); font-size:36px;">¡RESPONDE!</div>
                <div class="stage-sub" style="font-weight:700;">¡Tienes 5 segundos!</div>
              `;
            } else {
              const winnerTeam = (meta.players || []).find(p => p.id === meta.buzzWinner)?.group || 'Otro equipo';
              stage.innerHTML = `
                <div class="stage-title" style="color:var(--danger);">Tarde</div>
                <div class="stage-sub"><b style="color:var(--text-primary);">${winnerTeam}</b> presionó primero.</div>
              `;
            }
          }
        }
      }
      if(!stopped) setTimeout(poll, 600);
    }
    poll();
  }

  renderLanding();
})();