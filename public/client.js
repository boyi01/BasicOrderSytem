const socket = io();

let articles = [];

// Empfang der Artikelliste
socket.on('config', (data) => {
  console.log("Artikel erhalten:", data);
  articles = data;

  // Initiale UI-Aufbau
  if (typeof onConfigLoaded === 'function') {
    onConfigLoaded(articles);
  }
});

// Empfang von Statusdaten (inkl. Produktion pro Artikel)
socket.on('state', (state) => {
  if (typeof onStateUpdate === 'function') {
    onStateUpdate(state);
  }

  // Aktualisiere Artikelstatus (In Produktion)
  if (state.articleProductionCount && articles.length > 0) {
    articles.forEach(article => {
      const count = state.articleProductionCount[article.id] || 0;
      const statusEl = document.getElementById(`status-${article.id}`);
      if (statusEl) {
        statusEl.textContent = `In Produktion: ${count}`;
      }
    });
  }
});

// Neue Bestellung auslösen
function orderArticle(articleId) {
  socket.emit('newOrder', articleId);
}

// Bestellung schließen (wird ggf. in production.html benötigt)
function closeOrder(orderId) {
  socket.emit('closeOrder', orderId);
}
