/**
 * app.js — Hackify frontend logic
 *
 * Handles: chat messaging, markdown rendering, view switching,
 * sidebar state updates, milestone cards, roadmap phases, pitch sections.
 */

/* ══════════════════════════════════════════════════════════
   Minimal Markdown Renderer
   (No external deps — keeps it self-contained)
══════════════════════════════════════════════════════════ */
function renderMarkdown(text) {
  if (!text) return '';
  let html = text
    // Escape HTML first
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Fenced code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`)
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold / italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Tables (basic)
    .replace(/\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)+)/g, (_, header, rows) => {
      const ths = header.split('|').filter(s => s.trim()).map(s => `<th>${s.trim()}</th>`).join('');
      const trs = rows.trim().split('\n').map(row => {
        const tds = row.split('|').filter(s => s.trim()).map(s => `<td>${s.trim()}</td>`).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    })
    // Unordered lists
    .replace(/^[*\-] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr/>')
    // Line breaks → paragraphs
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

/* ══════════════════════════════════════════════════════════
   DOM refs
══════════════════════════════════════════════════════════ */
const chatThread     = document.getElementById('chat-thread');
const chatForm       = document.getElementById('chat-form');
const chatInput      = document.getElementById('chat-input');
const btnSend        = document.getElementById('btn-send');
const btnReset       = document.getElementById('btn-reset');
const typingIndicator= document.getElementById('typing-indicator');
const welcomeCard    = document.getElementById('welcome-card');
const statusDot      = document.getElementById('status-dot');
const statusLabel    = document.getElementById('status-label');

// Sidebar
const projectEmpty   = document.getElementById('project-empty');
const projectContent = document.getElementById('project-content');
const projectName    = document.getElementById('project-name');
const projectMeta    = document.getElementById('project-meta');
const scopeSection   = document.getElementById('scope-section');
const scopeBadge     = document.getElementById('scope-badge');
const scopeDot       = document.getElementById('scope-dot');
const scopeText      = document.getElementById('scope-text');
const blockersSection= document.getElementById('blockers-section');
const blockersList   = document.getElementById('blockers-list');
const milestoneMiniSection = document.getElementById('milestones-mini-section');
const milestoneMiniList    = document.getElementById('milestone-mini-list');

// Views
const views = document.querySelectorAll('.view');
const navPills = document.querySelectorAll('.nav-pill');

/* ══════════════════════════════════════════════════════════
   View switching
══════════════════════════════════════════════════════════ */
navPills.forEach(pill => {
  pill.addEventListener('click', () => {
    const viewId = `view-${pill.dataset.view}`;
    views.forEach(v => v.classList.remove('view--active'));
    navPills.forEach(p => p.classList.remove('nav-pill--active'));
    document.getElementById(viewId)?.classList.add('view--active');
    pill.classList.add('nav-pill--active');
  });
});

function switchToChat() {
  document.querySelector('[data-view="chat"]').click();
}

/* ══════════════════════════════════════════════════════════
   Textarea auto-grow
══════════════════════════════════════════════════════════ */
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
});

chatInput.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    chatForm.requestSubmit();
  }
});

/* ══════════════════════════════════════════════════════════
   Quick actions & chips — delegate send
══════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const trigger = e.target.closest('[data-prompt]');
  if (!trigger) return;
  const prompt = trigger.dataset.prompt;
  if (prompt) sendMessage(prompt);
});

/* ══════════════════════════════════════════════════════════
   Chat form submit
══════════════════════════════════════════════════════════ */
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  sendMessage(text);
  chatInput.value = '';
  chatInput.style.height = 'auto';
});

/* ══════════════════════════════════════════════════════════
   Core send/receive
══════════════════════════════════════════════════════════ */
async function sendMessage(text) {
  if (btnSend.disabled) return;

  // Switch to chat view
  if (!document.getElementById('view-chat').classList.contains('view--active')) {
    switchToChat();
  }

  // Hide welcome card on first message
  welcomeCard.style.display = 'none';

  // Append user bubble
  appendMessage('user', text);

  // UI state: thinking
  setStatus('thinking');
  showTyping(true);
  btnSend.disabled = true;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 401) {
        appendMessage('bot',
          '## No API Key Set\n\n' +
          'Hackify needs an AI key. Set **one** of these as an environment variable:\n\n' +
          '| Provider | Variable | Free? |\n' +
          '|----------|----------|-------|\n' +
          '| Groq | `GROQ_API_KEY` | ✅ Yes |\n' +
          '| Google Gemini | `GEMINI_API_KEY` | ✅ Yes |\n' +
          '| OpenAI | `OPENAI_API_KEY` | Paid |\n' +
          '| GitHub Models | `GITHUB_TOKEN` | ✅ Yes |\n\n' +
          'Restart the server after setting a key, then refresh this page.'
        );
      } else {
        appendMessage('bot', `⚠️ Error: ${data.error || 'Something went wrong.'}`);
      }
      setStatus('error');
    } else {
      appendMessage('bot', data.response);
      setStatus('ready');
      if (data.state) updateSidebar(data.state);
    }
  } catch (err) {
    appendMessage('bot', `⚠️ Network error: ${err.message}`);
    setStatus('error');
  } finally {
    showTyping(false);
    btnSend.disabled = false;
    chatInput.focus();
  }
}

/* ══════════════════════════════════════════════════════════
   Append message bubble
══════════════════════════════════════════════════════════ */
function appendMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message message--${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message__avatar';
  avatar.setAttribute('aria-hidden', 'true');

  if (role === 'bot') {
    avatar.innerHTML = `<svg width="16" height="16" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="6" fill="#008060"/>
      <path d="M8 14.5L12.5 19L20 10" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  } else {
    avatar.textContent = 'You';
  }

  const bubble = document.createElement('div');
  bubble.className = 'message__bubble';

  if (role === 'bot') {
    bubble.innerHTML = renderMarkdown(content);
  } else {
    bubble.textContent = content;
  }

  div.appendChild(avatar);
  div.appendChild(bubble);
  chatThread.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  chatThread.scrollTo({ top: chatThread.scrollHeight, behavior: 'smooth' });
}

/* ══════════════════════════════════════════════════════════
   Status indicator
══════════════════════════════════════════════════════════ */
function setStatus(state) {
  statusDot.className = `status-dot status-dot--${state}`;
  const labels = { ready: 'Ready', thinking: 'Thinking…', error: 'Error' };
  statusLabel.textContent = labels[state] || state;
}

/* ══════════════════════════════════════════════════════════
   Typing indicator
══════════════════════════════════════════════════════════ */
function showTyping(show) {
  typingIndicator.classList.toggle('hidden', !show);
  if (show) scrollToBottom();
}

/* ══════════════════════════════════════════════════════════
   Reset
══════════════════════════════════════════════════════════ */
btnReset.addEventListener('click', async () => {
  if (!confirm('Reset conversation history?')) return;
  await fetch('/api/reset', { method: 'POST' });
  // Clear chat thread (keep welcome card)
  chatThread.innerHTML = '';
  chatThread.appendChild(welcomeCard);
  welcomeCard.style.display = '';
  setStatus('ready');
  showToast('Conversation reset', 'success');
});

/* ══════════════════════════════════════════════════════════
   Sidebar state updates
══════════════════════════════════════════════════════════ */
function updateSidebar(state) {
  // Project
  if (state.concept) {
    const c = state.concept;
    projectEmpty.classList.add('hidden');
    projectContent.classList.remove('hidden');
    projectName.textContent = c.project_name || 'Unnamed Project';
    projectMeta.innerHTML = [
      c.team_size   ? `👥 ${c.team_size} members`    : '',
      c.duration_hours ? `⏱ ${c.duration_hours}h`   : '',
      c.tech_preferences?.length
        ? `🛠 ${c.tech_preferences.slice(0,2).join(', ')}` : '',
    ].filter(Boolean).map(s => `<span>${s}</span>`).join('');
  }

  // Scope
  if (state.scope_critique) {
    scopeSection.style.display = '';
    // Parse scope verdict from last agent message if available
    // For now, show a generic indicator
    setScopeHealth('yellow');
  }

  // Blockers
  const blockers = state.blockers || [];
  if (blockers.length) {
    blockersSection.style.display = '';
    blockersList.innerHTML = blockers
      .map(b => `<li class="blocker-item">${escHtml(b)}</li>`)
      .join('');
  } else {
    blockersSection.style.display = 'none';
  }

  // Milestones mini
  const milestones = state.milestones || [];
  if (milestones.length) {
    milestoneMiniSection.style.display = '';
    const now = new Date();
    milestoneMiniList.innerHTML = milestones.map(m => {
      const dotClass = getMilestoneDotClass(m, now);
      return `<li class="milestone-mini-item">
        <span class="milestone-mini-dot milestone-mini-dot--${dotClass}"></span>
        <span>${escHtml(m.name)}</span>
      </li>`;
    }).join('');

    // Also refresh milestone grid view
    renderMilestoneGrid(milestones, now);
  }
}

function getMilestoneDotClass(m, now) {
  if (m.status === 'done') return 'done';
  if (m.status === 'blocked') return 'blocked';
  if (!m.deadline) return 'ok';
  try {
    const dl = new Date(m.deadline);
    if (dl < now) return 'overdue';
    const created = m.created_at ? new Date(m.created_at) : now;
    const total = dl - created;
    const remaining = dl - now;
    if (total > 0 && remaining / total < 0.25) return 'risk';
    return 'ok';
  } catch { return 'ok'; }
}

function setScopeHealth(level) {
  const configs = {
    green:  { dot: 'green',  text: 'Green — On track' },
    yellow: { dot: 'yellow', text: 'Yellow — Watch scope' },
    red:    { dot: 'red',    text: 'Red — Scope creep!' },
  };
  const c = configs[level] || configs.yellow;
  scopeDot.className = `scope-dot scope-dot--${c.dot}`;
  scopeText.textContent = c.text;
}

/* ══════════════════════════════════════════════════════════
   Milestone grid (Milestones view)
══════════════════════════════════════════════════════════ */
function renderMilestoneGrid(milestones, now) {
  const grid = document.getElementById('milestone-grid');
  if (!milestones.length) return;

  grid.innerHTML = milestones.map(m => {
    const dotClass = getMilestoneDotClass(m, now);
    const statusMap = { done: 'done', overdue: 'overdue', risk: 'risk', ok: 'ok', blocked: 'overdue' };
    const statusLabel = { done: 'Done', overdue: 'Overdue', risk: 'At Risk', ok: 'On Track', blocked: 'Blocked' };
    const s = statusMap[dotClass] || 'ok';

    const deadline = m.deadline
      ? new Date(m.deadline).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })
      : 'No deadline';

    const tasks = (m.tasks || []).slice(0, 4).map(t =>
      `<div class="milestone-task">${escHtml(t)}</div>`
    ).join('');

    return `<div class="milestone-card milestone-card--${s}" role="article" aria-label="${escHtml(m.name)}">
      <span class="milestone-card__status status--${s}">${statusLabel[s]}</span>
      <div class="milestone-card__name">${escHtml(m.name)}</div>
      <div class="milestone-card__owner">👤 ${escHtml(m.owner || 'Team')}</div>
      <div class="milestone-card__deadline">🕐 ${deadline}</div>
      ${tasks ? `<div class="milestone-card__tasks">${tasks}</div>` : ''}
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════
   Roadmap phases renderer
   Called when we detect roadmap content in state
══════════════════════════════════════════════════════════ */
function renderRoadmapFromState(state) {
  if (!state.roadmap) return;
  const phases = state.roadmap.phases || {};
  const container = document.getElementById('roadmap-phases');
  const empty = document.getElementById('roadmap-empty');

  const phaseEntries = Object.entries(phases);
  if (!phaseEntries.length) return;

  container.classList.remove('hidden');
  empty.classList.add('hidden');

  container.innerHTML = phaseEntries.map(([name, hours], i) => `
    <div class="phase-card">
      <div class="phase-card__header">
        <div class="phase-number">${i + 1}</div>
        <span class="phase-name">${escHtml(name)}</span>
        <span class="phase-hours">${hours}h</span>
      </div>
      <div class="phase-card__body">
        <div class="phase-task">
          <div class="phase-task-check"></div>
          <span>Tasks will appear after agent generates roadmap details</span>
        </div>
      </div>
    </div>
  `).join('');

  // Wire up checkboxes
  container.querySelectorAll('.phase-task-check').forEach(chk => {
    chk.addEventListener('click', () => chk.classList.toggle('phase-task-check--done'));
  });
}

/* ══════════════════════════════════════════════════════════
   Pitch sections renderer
══════════════════════════════════════════════════════════ */
function renderPitchFromState(state) {
  if (!state.pitch) return;
  const p = state.pitch;
  const content = document.getElementById('pitch-content');

  const icons = ['🎯', '🔥', '💡', '🎬', '⚙️', '📈', '🙏'];
  const sections = [
    { name: 'Hook',             time: '~10s', body: `Open strong. Make judges lean in.` },
    { name: 'Problem',          time: '~18s', body: `What's broken and who suffers?` },
    { name: 'Solution',         time: '~22s', body: p.one_liner || 'Your solution here.' },
    { name: 'Live Demo',        time: '~42s', body: `Walk through your working product.` },
    { name: 'Tech Stack',       time: '~10s', body: `Briefly mention your stack.` },
    { name: 'Impact & Traction',time: '~12s', body: `Numbers, users, validation.` },
    { name: 'The Ask',          time: '~7s',  body: `What do you want from the judges?` },
  ];

  content.innerHTML = `<div class="pitch-sections">
    ${sections.map((s, i) => `
      <div class="pitch-section-card">
        <div class="pitch-section-card__header">
          <span class="pitch-section-icon">${icons[i]}</span>
          <span class="pitch-section-name">${s.name}</span>
          <span class="pitch-section-time">${s.time}</span>
        </div>
        <div class="pitch-section-card__body">${escHtml(s.body)}</div>
      </div>
    `).join('')}
  </div>`;
}

/* ══════════════════════════════════════════════════════════
   Toast notifications
══════════════════════════════════════════════════════════ */
function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast--${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 200ms ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

/* ══════════════════════════════════════════════════════════
   Utility
══════════════════════════════════════════════════════════ */
function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ══════════════════════════════════════════════════════════
   Init — load existing state on page load
══════════════════════════════════════════════════════════ */
(async function init() {
  setStatus('ready');
  try {
    const res = await fetch('/api/status');
    if (res.ok) {
      const state = await res.json();
      if (Object.keys(state).length) {
        updateSidebar(state);
        renderRoadmapFromState(state);
        renderPitchFromState(state);
      }
    }
  } catch (_) {
    // No state yet — fine
  }
  chatInput.focus();
})();

/* ══════════════════════════════════════════════════════════
   Team size stepper
══════════════════════════════════════════════════════════ */
(function() {
  const teamSize = document.getElementById('team-size');
  const teamMinus = document.getElementById('team-minus');
  const teamPlus = document.getElementById('team-plus');
  if (!teamSize || !teamMinus || !teamPlus) return;

  let size = 4;
  teamMinus.addEventListener('click', () => {
    if (size > 1) { size--; teamSize.textContent = size; }
  });
  teamPlus.addEventListener('click', () => {
    if (size < 20) { size++; teamSize.textContent = size; }
  });
})();

/* ══════════════════════════════════════════════════════════
   Inject team size + duration into prompts
══════════════════════════════════════════════════════════ */
const _originalSendMessage = sendMessage;
window._hackifyOrigSend = sendMessage;
sendMessage = function(text) {
  const teamEl = document.getElementById('team-size');
  const durEl = document.getElementById('hackathon-duration');
  if (teamEl && durEl) {
    const teamCount = teamEl.textContent.trim();
    const duration = durEl.value;
    // Append context if not already present
    if (!text.includes('team of') && !text.includes('Team size:')) {
      text += ` [Team size: ${teamCount}, Duration: ${duration}h]`;
    }
  }
  return _originalSendMessage(text);
};
