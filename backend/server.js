const express = require('express');
const { WebSocketServer } = require('ws');
const http = require('http');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── Stability Constants ───────────────────────────────────────────────────────
// FIX: All thresholds tuned to human-scale timing, not machine-scale.

const IDLE_THRESHOLD_MS       = 12000; // FIX: Was 8000 — micro-pauses no longer trigger idle
const ACTIVE_SESSION_LOCK_MS  = 1500;  // FIX: Gap under this is NOT a pause; user is still active
const STATE_COOLDOWN_MS       = 3000;  // FIX: Must stay in new state 3s before emitting transition
const HEARTBEAT_INTERVAL_MS   = 1500;  // FIX: Was 800ms — halved update frequency to reduce flood
const CLICK_WEIGHT            = 0.4;   // FIX: Clicks contribute less than keystrokes (was 1.0)
const SMOOTHING_WINDOW        = 5;     // FIX: Rolling vote over last N classifications before committing

// ─── Cognitive State Classifier ───────────────────────────────────────────────

/**
 * FIX: Classifier now uses more conservative thresholds and a vote buffer.
 * A single spike in typing speed or a click burst no longer flips state.
 * Scoring is weighted — multiple signals must agree before state changes.
 */
function classifyCognitiveState(metrics) {
  const {
    avgTypingSpeed,   // chars per second (rolling 5s)
    hesitationTime,   // ms gap between last two real events (keypresses/clicks)
    clickRate,        // clicks per second (rolling 8s, smoothed)
    errorRate,        // backspace / total keypresses ratio (rolling 8s)
    idleTime,         // ms since ANY interaction (key, click, or move)
  } = metrics;

  // ── IDLE: only trigger after sustained absence, not micro-pauses ──────────
  // FIX: Was 8s. Now 12s + requires clickRate to also be near-zero.
  if (idleTime > IDLE_THRESHOLD_MS && clickRate < 0.05) {
    return { state: 'idle', confidence: 0.9 };
  }

  // ── CONFUSED: requires at least 2 independent slow-signals ───────────────
  // FIX: Each signal threshold raised so noisy inputs don't trigger confusion.
  // hesitationTime now requires 4s (was 3s) — thinking pauses are normal.
  // errorRate threshold raised to 0.35 (was 0.3).
  const confusedScore =
    (avgTypingSpeed < 1.2 && avgTypingSpeed > 0 ? 1 : 0) +  // has typed, but slowly
    (hesitationTime > 4000 ? 1 : 0) +                        // real hesitation, not a reading pause
    (errorRate > 0.35 ? 1 : 0) +                             // high correction rate
    (clickRate < 0.15 && idleTime > 3000 ? 1 : 0);           // not clicking, stalled

  if (confusedScore >= 2) {
    const confidence = Math.min(0.9, 0.45 + confusedScore * 0.15);
    return { state: 'confused', confidence };
  }

  // ── CONFIDENT: requires 3 of 4 positive signals (raised bar from 3/4) ────
  // FIX: clickRate threshold raised to 0.6 to avoid single-click spikes.
  // hesitationTime threshold tightened to 600ms — only truly snappy users.
  const confidentScore =
    (avgTypingSpeed > 4.5 ? 1 : 0) +
    (hesitationTime < 600 && hesitationTime > 0 ? 1 : 0) +
    (errorRate < 0.08 ? 1 : 0) +
    (clickRate > 0.6 ? 1 : 0);

  if (confidentScore >= 3) {
    return { state: 'confident', confidence: Math.min(0.92, 0.5 + confidentScore * 0.12) };
  }

  // ── THINKING: the broad "user is active but deliberate" middle ground ─────
  // FIX: This is now the DEFAULT active state, not 'confident'.
  // Catches reading, planning, moderate typing — most real-world usage.
  if (avgTypingSpeed > 0 || clickRate > 0 || idleTime < 4000) {
    const confidence = hesitationTime > 1500 ? 0.72 : 0.62;
    return { state: 'thinking', confidence };
  }

  // Fallback: borderline idle, not enough signal
  return { state: 'thinking', confidence: 0.5 };
}

// ─── State Smoothing / Vote Buffer ────────────────────────────────────────────

/**
 * FIX: Instead of emitting every classification immediately, we accumulate
 * a rolling window of recent classifications and only commit to the majority.
 * This prevents single-event spikes (one fast click, one slow keystroke) from
 * flipping the visible state.
 */
function getSmoothedState(session, rawState, rawConfidence) {
  // Push new vote
  session.stateVotes.push({ state: rawState, confidence: rawConfidence, ts: Date.now() });

  // Keep only the last N votes
  if (session.stateVotes.length > SMOOTHING_WINDOW) {
    session.stateVotes = session.stateVotes.slice(-SMOOTHING_WINDOW);
  }

  // Count votes
  const counts = {};
  let totalConf = 0;
  for (const v of session.stateVotes) {
    counts[v.state] = (counts[v.state] || 0) + 1;
    totalConf += v.confidence;
  }

  // Pick majority state
  const winner = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const avgConf = totalConf / session.stateVotes.length;

  return { smoothedState: winner, smoothedConfidence: avgConf };
}

// ─── State Cooldown Gate ──────────────────────────────────────────────────────

/**
 * FIX: Even after smoothing, a state must be held for STATE_COOLDOWN_MS
 * before we allow the frontend to transition to it. This eliminates the
 * thinking ↔ idle ↔ confused flickering on burst inputs.
 *
 * Returns true if the state transition is "committed" and should be emitted.
 */
function shouldEmitTransition(session, newState) {
  const now = Date.now();

  if (newState === session.pendingState) {
    // Same pending state — check if it has been stable long enough
    const heldFor = now - session.pendingStateStart;
    if (heldFor >= STATE_COOLDOWN_MS) {
      if (newState !== session.lastEmittedState) {
        session.lastEmittedState = newState;
        return true; // ✅ Commit the transition
      }
      // Already emitted this state — only send metric updates, not state flip
      return true;
    }
    return false; // Still in cooldown
  } else {
    // New candidate state — start cooldown timer
    session.pendingState = newState;
    session.pendingStateStart = now;
    return false; // Don't emit yet; wait for cooldown
  }
}

// ─── Contextual Help Generator ─────────────────────────────────────────────────

const helpMessages = {
  confused: [
    "Looks like things got a bit tricky. Take your time — I'm here to help.",
    "Not sure where to go? Try hovering over highlighted elements for guidance.",
    "Feeling stuck? The blue buttons are your best next steps.",
    "Need a hand? Focus on the glowing elements — they'll guide you forward.",
  ],
  thinking: [
    "Take all the time you need. Good decisions deserve careful thought.",
    "Considering your options? That's smart — no rush here.",
    "Deep in thought? The overview panel on the right might help clarify things.",
  ],
  confident: [
    "You're on fire! Keep going.",
    "Great pace — everything is working smoothly.",
    "Looking great! You clearly know what you're doing.",
  ],
  idle: [
    "Still there? Click anywhere to continue.",
    "Taking a break? We'll be here when you're ready.",
    "Whenever you're ready, just pick up where you left off.",
  ],
};

function generateHelpMessage(state) {
  const messages = helpMessages[state] || helpMessages.idle;
  return messages[Math.floor(Math.random() * messages.length)];
}

// ─── UI Adaptation Rules ───────────────────────────────────────────────────────

// FIX: simplifyLayout now requires confidence > 0.82 (was 0.75) to prevent
// accidental layout flips on borderline confused classifications.
function deriveUIAdaptations(state, confidence) {
  const base = {
    highlightButtons: false,
    showTooltips: false,
    simplifyLayout: false,
    glowIntensity: 0,
    colorScheme: 'default',
    showHelpPanel: false,
  };

  switch (state) {
    case 'confused':
      return {
        ...base,
        highlightButtons: true,
        showTooltips: true,
        simplifyLayout: confidence > 0.82, // FIX: Raised threshold — fewer false simplifications
        glowIntensity: Math.round(confidence * 8), // FIX: Reduced max glow (was *10)
        colorScheme: 'calm',
        showHelpPanel: true,
      };
    case 'thinking':
      return {
        ...base,
        showTooltips: confidence > 0.70, // FIX: Slightly raised (was 0.65)
        glowIntensity: 2,                // FIX: Reduced from 3
        colorScheme: 'focus',
        showHelpPanel: false,
      };
    case 'confident':
      return {
        ...base,
        colorScheme: 'energized',
        glowIntensity: 0,
      };
    case 'idle':
      return {
        ...base,
        highlightButtons: true,
        glowIntensity: 4,              // FIX: Reduced from 5
        colorScheme: 'default',
        showHelpPanel: true,
      };
    default:
      return base;
  }
}

// ─── Per-client session state ──────────────────────────────────────────────────

const sessions = new Map();

function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      id,
      eventBuffer: [],
      lastEventTime: Date.now(),
      lastMouseMoveTime: Date.now(), // FIX: Separate mouse-move tracking
      lastState: 'thinking',         // FIX: Start as thinking, not idle
      lastEmittedState: 'thinking',
      stateVotes: [],                // FIX: Vote buffer for smoothing
      pendingState: 'thinking',      // FIX: Cooldown gate
      pendingStateStart: Date.now(),
      lastEmitTime: 0,               // FIX: Flood prevention — rate limit per-client
    });
  }
  return sessions.get(id);
}

// ─── Metrics computation from event buffer ─────────────────────────────────────

function computeMetrics(session) {
  const now = Date.now();

  // FIX: Use 8s window for all metrics (was 10s/5s mixed) for consistency
  const recentEvents = session.eventBuffer.filter(e => now - e.ts < 8000);

  const keyEvents   = recentEvents.filter(e => e.type === 'keypress');
  const clickEvents = recentEvents.filter(e => e.type === 'click');
  const backspaceEvents = keyEvents.filter(e => e.key === 'Backspace');

  // FIX: Typing speed uses 6s window, avoids stale key counts inflating speed
  const recentKeys = keyEvents.filter(e => now - e.ts < 6000 && e.key !== 'Backspace');
  const avgTypingSpeed = recentKeys.length / 6;

  // FIX: idleTime — use max of lastEventTime and lastMouseMoveTime so that
  // passive reading (no keys/clicks but mouse present) doesn't trigger idle.
  const lastActivity = Math.max(session.lastEventTime, session.lastMouseMoveTime);
  const idleTime = now - lastActivity;

  // FIX: hesitationTime — only compute from keypress/click pairs, NOT mouse moves.
  // Previously, a mouse move followed by a keypress showed near-0 hesitation.
  let hesitationTime = 0;
  const meaningfulEvents = recentEvents
    .filter(e => e.type === 'keypress' || e.type === 'click')
    .sort((a, b) => b.ts - a.ts);

  if (meaningfulEvents.length >= 2) {
    const gap = meaningfulEvents[0].ts - meaningfulEvents[1].ts;
    // FIX: Ignore gaps under ACTIVE_SESSION_LOCK_MS — they're natural inter-key pauses
    hesitationTime = gap > ACTIVE_SESSION_LOCK_MS ? gap : 0;
  }

  // FIX: Click rate uses 8s window and applies CLICK_WEIGHT to reduce sensitivity
  const recentClicks = clickEvents.filter(e => now - e.ts < 8000);
  const clickRate = (recentClicks.length / 8) * CLICK_WEIGHT;

  // FIX: Error rate smoothed over 8s, minimum 3 keypresses before counting
  const totalKeys8s = keyEvents.filter(e => now - e.ts < 8000).length;
  const backspaces8s = backspaceEvents.filter(e => now - e.ts < 8000).length;
  const errorRate = totalKeys8s >= 3 ? backspaces8s / totalKeys8s : 0;

  return { avgTypingSpeed, hesitationTime, clickRate, errorRate, idleTime };
}

// ─── Outbound message builder ──────────────────────────────────────────────────

function buildUpdate(state, confidence, metrics, isStateChange) {
  const adaptations = deriveUIAdaptations(state, confidence);
  // FIX: Only generate new help message on actual state transitions, not metric updates
  const helpMessage = isStateChange ? generateHelpMessage(state) : null;

  return {
    type: 'cognitive_update',
    state,
    confidence: Math.round(confidence * 100),
    metrics: {
      avgTypingSpeed: +metrics.avgTypingSpeed.toFixed(2),
      hesitationTime: Math.round(metrics.hesitationTime),
      clickRate: +metrics.clickRate.toFixed(2),
      errorRate: +metrics.errorRate.toFixed(2),
      idleTime: Math.round(metrics.idleTime),
    },
    adaptations,
    helpMessage,
    timestamp: Date.now(),
  };
}

// ─── WebSocket Handler ─────────────────────────────────────────────────────────

let clientCounter = 0;

wss.on('connection', (ws) => {
  const clientId = `client_${++clientCounter}_${Date.now()}`;
  const session = getSession(clientId);

  console.log(`[WS] Client connected: ${clientId}`);

  ws.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Live Cognitive Interface backend connected.',
  }));

  // FIX: Heartbeat interval increased to 1500ms (was 800ms) to halve WS traffic.
  // Heartbeat only handles idle detection + metric streaming.
  // State transitions happen on-demand via message handler.
  const heartbeat = setInterval(() => {
    if (ws.readyState !== ws.OPEN) return clearInterval(heartbeat);

    const metrics = computeMetrics(session);
    const { state: rawState, confidence: rawConf } = classifyCognitiveState(metrics);
    const { smoothedState, smoothedConfidence } = getSmoothedState(session, rawState, rawConf);

    const committed = shouldEmitTransition(session, smoothedState);
    if (!committed) return; // FIX: Skip emit during cooldown — prevents heartbeat flicker

    const isStateChange = smoothedState !== session.lastState;
    session.lastState = smoothedState;
    session.lastEmitTime = Date.now();

    ws.send(JSON.stringify(buildUpdate(smoothedState, smoothedConfidence, metrics, isStateChange)));
  }, HEARTBEAT_INTERVAL_MS);

  ws.on('message', (raw) => {
    try {
      const event = JSON.parse(raw.toString());
      const now = Date.now();

      // FIX: Mouse moves update activity time but are NOT stored in buffer
      // and do NOT trigger reclassification (they caused state spikes before)
      if (event.type === 'mousemove') {
        session.lastMouseMoveTime = now;
        return; // Early exit — no further processing
      }

      // Update last interaction time for all real events
      session.lastEventTime = now;

      // Store event
      session.eventBuffer.push({ ...event, ts: now });

      // FIX: Buffer capped at 150 events (was 200) — saves memory, older data is stale
      if (session.eventBuffer.length > 150) {
        session.eventBuffer = session.eventBuffer.slice(-150);
      }

      // FIX: Rate-limit on-demand classification to max once per 600ms.
      // Previously every keypress triggered a full classify+emit cycle,
      // flooding the frontend at 10+ updates/second during fast typing.
      const timeSinceLastEmit = now - session.lastEmitTime;
      if (timeSinceLastEmit < 600) return; // FIX: Skip — too soon since last emit

      if (['keypress', 'click', 'hesitation'].includes(event.type)) {
        const metrics = computeMetrics(session);
        const { state: rawState, confidence: rawConf } = classifyCognitiveState(metrics);
        const { smoothedState, smoothedConfidence } = getSmoothedState(session, rawState, rawConf);

        const committed = shouldEmitTransition(session, smoothedState);
        if (!committed) return; // FIX: Respect cooldown gate on event-driven path too

        const isStateChange = smoothedState !== session.lastState;
        session.lastState = smoothedState;
        session.lastEmitTime = now;

        ws.send(JSON.stringify(buildUpdate(smoothedState, smoothedConfidence, metrics, isStateChange)));
      }
    } catch (err) {
      console.error('[WS] Parse error:', err.message);
    }
  });

  ws.on('close', () => {
    clearInterval(heartbeat);
    sessions.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId}`);
  });
});

// ─── REST endpoint: help message on demand ─────────────────────────────────────

app.get('/api/help/:state', (req, res) => {
  const { state } = req.params;
  res.json({ message: generateHelpMessage(state), state });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`\n🧠 LCI Backend running on http://localhost:${PORT}`);
  console.log(`🔌 WebSocket server ready on ws://localhost:${PORT}\n`);
});
