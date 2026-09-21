(() => {
  function postContent(post) {
    const saved = state.posts[post.day] || {};
    return {
      title: saved.title ?? post.title,
      hook: saved.hook ?? post.hook,
      caption: saved.caption ?? post.caption,
      cta: saved.cta ?? post.cta,
      time: saved.time ?? post.time
    };
  }

  const originalRenderCard = renderCard;
  renderCard = function(post) {
    const content = postContent(post);
    const s = getState(post);
    const today = new Date().toISOString().slice(0, 10);
    const isToday = post.date === today;
    return `
      <article class="post-card ${s.published ? "published" : ""} ${isToday ? "today" : ""}" data-open="${post.day}">
        <div class="card-top">
          <div><span class="day-number">DAY ${String(post.day).padStart(2, "0")}</span><span class="date-label">${formatDate(post.date)}</span></div>
          <button class="check ${s.published ? "checked" : ""}" data-toggle="${post.day}" title="Marcar como publicado">${s.published ? "✓" : ""}</button>
        </div>
        <h3>${escapeHtml(content.title)}</h3>
        <div class="post-hook">${escapeHtml(content.hook)}</div>
        <div class="meta"><span class="badge ${funnelClass(post.funnel)}">${escapeHtml(post.funnel)}</span><span class="badge">${escapeHtml(post.pillar)}</span></div>
        <div class="card-bottom"><span class="time">◷ ${escapeHtml(content.time)}</span><span class="status">${statusLabel(s.status)}</span><button class="open-btn" data-open="${post.day}">Editar →</button></div>
      </article>`;
  };

  openModal = function(day) {
    const post = POSTS.find(p => p.day === day);
    if (!post) return;
    activePostDay = day;
    const s = getState(post);
    const content = postContent(post);

    document.querySelector("#modalContent").innerHTML = `
      <div class="modal-title">
        <span class="eyebrow">DAY ${String(post.day).padStart(2,"0")} · ${formatLongDate(post.date)}</span>
        <h2>Edição do post</h2>
      </div>

      <div class="edit-grid content-editor">
        <div class="field full">
          <label>Título do post</label>
          <input id="editTitle" type="text" value="${escapeAttr(content.title)}" />
        </div>

        <div class="field full">
          <label>Hook</label>
          <textarea id="editHook" rows="3">${escapeHtml(content.hook)}</textarea>
        </div>

        <div class="field full">
          <label>Legenda</label>
          <textarea id="editCaption" rows="9">${escapeHtml(content.caption)}</textarea>
        </div>

        <div class="field full">
          <label>CTA</label>
          <textarea id="editCta" rows="3">${escapeHtml(content.cta)}</textarea>
        </div>

        <div class="field">
          <label>Horário</label>
          <input id="editTime" type="time" value="${escapeAttr(content.time)}" />
        </div>

        <div class="field">
          <label>Status</label>
          <select id="editStatus">
            ${["planned","production","scheduled","published"].map(x =>
              `<option value="${x}" ${s.status === x ? "selected" : ""}>${statusLabel(x)}</option>`
            ).join("")}
          </select>
        </div>

        <div class="field full">
          <label>Observações / produção</label>
          <textarea id="editNotes" rows="4">${escapeHtml(s.notes || "")}</textarea>
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
      </div>

      <label class="modal-check">
        <input id="editPublished" type="checkbox" ${s.published ? "checked" : ""} />
        Marcar postagem como publicada
      </label>

      <div class="edit-actions">
        <button class="secondary-btn" data-close="true">Cancelar</button>
        <button class="primary-btn" id="savePostBtn">Salvar alterações</button>
      </div>`;

    document.querySelector("#savePostBtn").addEventListener("click", saveModal);
    document.querySelector("#modal").classList.remove("hidden");
  };

  saveModal = function() {
    const post = POSTS.find(p => p.day === activePostDay);
    if (!post) return;

    const s = getState(post);
    s.title = document.querySelector("#editTitle").value.trim() || post.title;
    s.hook = document.querySelector("#editHook").value;
    s.caption = document.querySelector("#editCaption").value;
    s.cta = document.querySelector("#editCta").value;
    s.time = document.querySelector("#editTime").value || post.time;
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
  };

  // Re-render once so the editor is active without requiring a refresh.
  render();
})();