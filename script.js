const POSTS = window.BIT_HOUSE_POSTS || [];
const STORAGE_KEY = "bithouse-content-calendar-v1";

const defaultState = {
  posts: Object.fromEntries(
    POSTS.map(p => [p.day, {
      status: "planned",
      published: false,
      time: p.time,
      notes: p.notes,
      metrics: { impressions: "", likes: "", replies: "", reposts: "", profileVisits: "", follows: "" }
    }])
  )
};

let state = loadState();
let currentView = "calendar";
let activePostDay = null;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved || !saved.posts) return structuredClone(defaultState);
    return {
      posts: Object.fromEntries(POSTS.map(p => [
        p.day,
        {
          ...defaultState.posts[p.day],
          ...(saved.posts[p.day] || {}),
          metrics: {
            ...defaultState.posts[p.day].metrics,
            ...((saved.posts[p.day] || {}).metrics || {})
          }
        }
      ]))
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getState(post) {
  return state.posts[post.day];
}

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" })
    .format(d).replace(".", "");
}

function formatLongDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric"
  }).format(d);
}

function statusLabel(status) {
  return {
    planned: "Planejado",
    production: "Em produção",
    scheduled: "Agendado",
    published: "Publicado"
  }[status] || "Planejado";
}

function funnelClass(funnel) {
  if (funnel.includes("BOFU")) return "funnel-bofu";
  if (funnel.includes("MOFU")) return "funnel-mofu";
  if (funnel.includes("TOFU")) return "funnel-tofu";
  return "community";
}

function render() {
  updateStats();
  if (currentView === "calendar") renderCalendar();
  if (currentView === "pipeline") renderPipeline();
  if (currentView === "metrics") renderMetrics();
}

function updateStats() {
  const values = POSTS.map(getState);
  const published = values.filter(s => s.published).length;
  const production = values.filter(s => s.status === "production").length;
  const tofu = POSTS.filter(p => p.funnel.includes("TOFU")).length;
  const bofu = POSTS.filter(p => p.funnel.includes("BOFU")).length;
  const pct = Math.round((published / POSTS.length) * 100);

  document.querySelector("#progressText").textContent = pct + "%";
  document.querySelector("#progressBar").style.width = pct + "%";
  document.querySelector("#progressCount").textContent = `${published} de ${POSTS.length} publicados`;

  document.querySelector("#statPublished").textContent = published;
  document.querySelector("#statProduction").textContent = production;
  document.querySelector("#statTofu").textContent = tofu;
  document.querySelector("#statBofu").textContent = bofu;
}

function filters() {
  return {
    search: document.querySelector("#searchInput").value.trim().toLowerCase(),
    status: document.querySelector("#statusFilter").value,
    funnel: document.querySelector("#funnelFilter").value,
    pillar: document.querySelector("#pillarFilter").value
  };
}

function matches(post) {
  const f = filters();
  const s = getState(post);
  const text = [
    post.title, post.pillar, post.funnel, post.format, post.objective,
    post.idea, post.hook, post.caption, post.cta, post.notes
  ].join(" ").toLowerCase();

  if (f.search && !text.includes(f.search)) return false;
  if (f.status !== "all" && s.status !== f.status) return false;
  if (f.funnel !== "all" && !post.funnel.includes(f.funnel)) return false;
  if (f.pillar !== "all" && post.pillar !== f.pillar) return false;
  return true;
}

function renderCalendar() {
  const container = document.querySelector("#calendarView");
  const filtered = POSTS.filter(matches);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty">Nenhum post corresponde aos filtros atuais.</div>`;
    return;
  }

  const weeks = [];
  for (let i = 0; i < filtered.length; i += 7) weeks.push(filtered.slice(i, i + 7));

  container.innerHTML = weeks.map((week, wi) => `
    <section class="week">
      <div class="week-header">
        <div class="week-title">Semana ${wi + 1}</div>
        <div class="week-subtitle">${week.length} publicação${week.length > 1 ? "ões" : ""}</div>
      </div>
      <div class="post-grid">
        ${week.map(renderCard).join("")}
      </div>
    </section>
  `).join("");

  container.querySelectorAll("[data-toggle]").forEach(btn => {
    btn.addEventListener("click", e => {
      e.stopPropagation();
      togglePublished(Number(btn.dataset.toggle));
    });
  });

  container.querySelectorAll("[data-open]").forEach(el => {
    el.addEventListener("click", () => openModal(Number(el.dataset.open)));
  });
}

function renderCard(post) {
  const s = getState(post);
  const today = new Date().toISOString().slice(0,10);
  const isToday = post.date === today;
  return `
    <article class="post-card ${s.published ? "published" : ""} ${isToday ? "today" : ""}" data-open="${post.day}">
      <div class="card-top">
        <div>
          <span class="day-number">DAY ${String(post.day).padStart(2,"0")}</span>
          <span class="date-label">${formatDate(post.date)}</span>
        </div>
        <button class="check ${s.published ? "checked" : ""}" data-toggle="${post.day}" title="Marcar como publicado">
          ${s.published ? "✓" : ""}
        </button>
      </div>

      <h3>${escapeHtml(post.title)}</h3>
      <div class="post-hook">${escapeHtml(post.hook)}</div>

      <div class="meta">
        <span class="badge ${funnelClass(post.funnel)}">${escapeHtml(post.funnel)}</span>
        <span class="badge">${escapeHtml(post.pillar)}</span>
      </div>

      <div class="card-bottom">
        <span class="time">◷ ${escapeHtml(s.time)}</span>
        <span class="status">${statusLabel(s.status)}</span>
        <button class="open-btn" data-open="${post.day}">Detalhes →</button>
      </div>
    </article>
  `;
}

function renderPipeline() {
  const container = document.querySelector("#pipelineView");
  const statuses = ["planned", "production", "scheduled", "published"];
  const labels = {
    planned: "Planejado",
    production: "Em produção",
    scheduled: "Agendado",
    published: "Publicado"
  };

  container.innerHTML = `
    <div class="pipeline">
      ${statuses.map(status => {
        const list = POSTS.filter(p => getState(p).status === status && matches(p));
        return `
          <div class="pipeline-col">
            <div class="pipeline-head">
              <strong>${labels[status]}</strong>
              <span>${list.length}</span>
            </div>
            ${list.length ? list.map(p => `
              <div class="pipeline-item" data-open="${p.day}">
                <h4>Day ${String(p.day).padStart(2,"0")} · ${escapeHtml(p.title)}</h4>
                <p>${escapeHtml(p.funnel)} · ${escapeHtml(p.pillar)}</p>
                <small>${escapeHtml(getState(p).time)}</small>
              </div>
            `).join("") : `<div class="empty">Nenhum post</div>`}
          </div>
        `;
      }).join("")}
    </div>
  `;

  container.querySelectorAll("[data-open]").forEach(el => {
    el.addEventListener("click", () => openModal(Number(el.dataset.open)));
  });
}

function renderMetrics() {
  const container = document.querySelector("#metricsView");
  const published = POSTS.filter(p => getState(p).published);

  const byFunnel = countBy(POSTS, p => p.funnel.split(" / ")[0]);
  const byPillar = countBy(POSTS, p => p.pillar);
  const avg = key => {
    const nums = published.map(p => Number(getState(p).metrics[key]) || 0).filter(n => n > 0);
    return nums.length ? Math.round(nums.reduce((a,b) => a+b,0) / nums.length).toLocaleString("pt-BR") : "—";
  };

  container.innerHTML = `
    <div class="metrics-grid">
      <div class="metric-panel">
        <h3>Distribuição por funil</h3>
        ${metricBars(byFunnel)}
      </div>
      <div class="metric-panel">
        <h3>Distribuição por pilar</h3>
        ${metricBars(byPillar)}
      </div>
      <div class="metric-panel">
        <h3>Média dos publicados</h3>
        <div class="bar-row"><label>Impressões</label><div></div><b>${avg("impressions")}</b></div>
        <div class="bar-row"><label>Curtidas</label><div></div><b>${avg("likes")}</b></div>
        <div class="bar-row"><label>Respostas</label><div></div><b>${avg("replies")}</b></div>
        <div class="bar-row"><label>Reposts</label><div></div><b>${avg("reposts")}</b></div>
        <div class="bar-row"><label>Visitas perfil</label><div></div><b>${avg("profileVisits")}</b></div>
      </div>
    </div>
    <div class="metric-panel">
      <h3>Como usar</h3>
      <p class="metrics-note">
        Depois de publicar, abra o post correspondente e preencha as métricas.
        O painel calcula automaticamente médias dos posts que já têm dados.
        Use os dados para decidir quais pilares, formatos e etapas do funil merecem mais espaço na próxima campanha.
      </p>
    </div>
  `;
}

function countBy(arr, fn) {
  return arr.reduce((acc, item) => {
    const key = fn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function metricBars(obj) {
  const max = Math.max(...Object.values(obj), 1);
  return Object.entries(obj).map(([key, value]) => `
    <div class="bar-row">
      <label>${escapeHtml(key)}</label>
      <div class="mini-bar"><i style="width:${(value/max)*100}%"></i></div>
      <b>${value}</b>
    </div>
  `).join("");
}

function openModal(day) {
  const post = POSTS.find(p => p.day === day);
  if (!post) return;
  activePostDay = day;
  const s = getState(post);

  document.querySelector("#modalContent").innerHTML = `
    <div class="modal-title">
      <span class="eyebrow">DAY ${String(post.day).padStart(2,"0")} · ${formatLongDate(post.date)}</span>
      <h2>${escapeHtml(post.title)}</h2>
    </div>

    <div class="modal-meta">
      <span class="badge ${funnelClass(post.funnel)}">${escapeHtml(post.funnel)}</span>
      <span class="badge">${escapeHtml(post.pillar)}</span>
      <span class="badge">${escapeHtml(post.format)}</span>
    </div>

    <div class="detail-grid">
      <div class="detail">
        <label>Objetivo</label>
        <p>${escapeHtml(post.objective)}</p>
      </div>
      <div class="detail">
        <label>Ideia do post</label>
        <p>${escapeHtml(post.idea)}</p>
      </div>
      <div class="detail">
        <label>Hook</label>
        <p>${escapeHtml(post.hook)}</p>
      </div>
      <div class="detail">
        <label>CTA</label>
        <p>${escapeHtml(post.cta)}</p>
      </div>
      <div class="detail full">
        <label>Legenda</label>
        <p>${escapeHtml(post.caption)}</p>
      </div>
    </div>

    <div class="edit-grid">
      <div class="field">
        <label>Horário</label>
        <input id="editTime" type="time" value="${escapeAttr(s.time)}" />
      </div>
      <div class="field">
        <label>Status</label>
        <select id="editStatus">
          ${["planned","production","scheduled","published"].map(x => `<option value="${x}" ${s.status===x?"selected":""}>${statusLabel(x)}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Impressões</label>
        <input id="metricImpressions" type="number" min="0" value="${escapeAttr(s.metrics.impressions)}" />
      </div>
      <div class="field">
        <label>Curtidas</label>
        <input id="metricLikes" type="number" min="0" value="${escapeAttr(s.metrics.likes)}" />
      </div>
      <div class="field">
        <label>Respostas</label>
        <input id="metricReplies" type="number" min="0" value="${escapeAttr(s.metrics.replies)}" />
      </div>
      <div class="field">
        <label>Reposts</label>
        <input id="metricReposts" type="number" min="0" value="${escapeAttr(s.metrics.reposts)}" />
      </div>
      <div class="field">
        <label>Visitas ao perfil</label>
        <input id="metricProfileVisits" type="number" min="0" value="${escapeAttr(s.metrics.profileVisits)}" />
      </div>
      <div class="field">
        <label>Novos seguidores</label>
        <input id="metricFollows" type="number" min="0" value="${escapeAttr(s.metrics.follows)}" />
      </div>
      <div class="field full">
        <label>Observações / produção</label>
        <textarea id="editNotes">${escapeHtml(s.notes || "")}</textarea>
      </div>
    </div>

    <label class="modal-check">
      <input id="editPublished" type="checkbox" ${s.published ? "checked" : ""} />
      Marcar postagem como publicada
    </label>

    <div class="edit-actions">
      <button class="secondary-btn" data-close="true">Cancelar</button>
      <button class="primary-btn" id="savePostBtn">Salvar alterações</button>
    </div>
  `;

  document.querySelector("#savePostBtn").addEventListener("click", saveModal);
  document.querySelector("#modal").classList.remove("hidden");
}

function saveModal() {
  const post = POSTS.find(p => p.day === activePostDay);
  const s = getState(post);
  s.time = document.querySelector("#editTime").value || s.time;
  s.status = document.querySelector("#editStatus").value;
  s.published = document.querySelector("#editPublished").checked;
  s.notes = document.querySelector("#editNotes").value;
  s.metrics = {
    impressions: document.querySelector("#metricImpressions").value,
    likes: document.querySelector("#metricLikes").value,
    replies: document.querySelector("#metricReplies").value,
    reposts: document.querySelector("#metricReposts").value,
    profileVisits: document.querySelector("#metricProfileVisits").value,
    follows: document.querySelector("#metricFollows").value
  };
  if (s.published) s.status = "published";
  saveState();
  closeModal();
  render();
  toast("Post atualizado.");
}

function togglePublished(day) {
  const s = state.posts[day];
  s.published = !s.published;
  s.status = s.published ? "published" : "planned";
  saveState();
  render();
  toast(s.published ? "Post marcado como publicado." : "Post voltou para planejado.");
}

function closeModal() {
  document.querySelector("#modal").classList.add("hidden");
  activePostDay = null;
}

function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1800);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[char]));
}
function escapeAttr(value) { return escapeHtml(value); }

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-btn").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    currentView = btn.dataset.view;
    document.querySelectorAll(".view").forEach(x => x.classList.remove("active"));
    document.querySelector("#" + currentView + "View").classList.add("active");
    render();
  });
});

["searchInput","statusFilter","funnelFilter","pillarFilter"].forEach(id => {
  document.querySelector("#" + id).addEventListener("input", render);
  document.querySelector("#" + id).addEventListener("change", render);
});

document.querySelector("#modal").addEventListener("click", e => {
  if (e.target.dataset.close === "true") closeModal();
});

document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
});

document.querySelector("#resetBtn").addEventListener("click", () => {
  if (!confirm("Resetar todo o progresso da campanha? Isso apagará status e métricas salvas neste navegador.")) return;
  state = structuredClone(defaultState);
  saveState();
  render();
  toast("Campanha resetada.");
});

document.querySelector("#todayBtn").addEventListener("click", () => {
  const today = new Date().toISOString().slice(0,10);
  const post = POSTS.find(p => p.date === today);
  if (!post) {
    toast("Hoje não está dentro dos 30 dias da campanha.");
    return;
  }
  openModal(post.day);
});

document.querySelector("#exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bithouse-calendar-progress.json";
  a.click();
  URL.revokeObjectURL(url);
  toast("Progresso exportado.");
});

document.querySelector("#importInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!imported.posts) throw new Error();
      state = loadImported(imported);
      saveState();
      render();
      toast("Progresso importado.");
    } catch {
      alert("Arquivo de progresso inválido.");
    }
    e.target.value = "";
  };
  reader.readAsText(file);
});

function loadImported(imported) {
  return {
    posts: Object.fromEntries(POSTS.map(p => [
      p.day,
      {
        ...defaultState.posts[p.day],
        ...(imported.posts[p.day] || {}),
        metrics: {
          ...defaultState.posts[p.day].metrics,
          ...((imported.posts[p.day] || {}).metrics || {})
        }
      }
    ]))
  };
}

render();
