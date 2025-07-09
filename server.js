const express = require('express'); 
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Artikel laden
const articles = JSON.parse(fs.readFileSync(path.join(__dirname, 'articles.json')));

// Datenstruktur für Bestellungen
// { id, articleId, timestamp, closed }
let orders = [];

// Hilfsfunktion: Anzahl Bestellungen in Produktion (nicht geschlossen)
function countInProduction() {
  return orders.filter(o => !o.closed).length;
}

// Hilfsfunktion: Anzahl Bestellungen in letzten 10 Sekunden
function countLast10Seconds() {
  const now = Date.now();
  return orders.filter(o => !o.closed && (now - o.timestamp <= 10000)).length;
}

// Zähle offene Bestellungen pro Artikel
function getArticleProductionCount() {
  const countMap = {};
  orders.forEach(order => {
    if (!order.closed) {
      countMap[order.articleId] = (countMap[order.articleId] || 0) + 1;
    }
  });
  return countMap;
}

// Statische Dateien ausliefern
app.use(express.static(path.join(__dirname, 'public')));

app.get('/bestellung', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'bestellung.html'));
});

app.get('/production', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'production.html'));
});

io.on('connection', (socket) => {
  console.log('Neuer Client verbunden');

  // Beim Verbinden die aktuelle Konfiguration + Zustand senden
  socket.emit('config', articles);
  socket.emit('state', {
    orders,
    inProduction: countInProduction(),
    last10sec: countLast10Seconds(),
    articleProductionCount: getArticleProductionCount()
  });

  // Neue Bestellung
  socket.on('newOrder', (articleId) => {
    const order = {
      id: 'order_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      articleId,
      timestamp: Date.now(),
      closed: false
    };
    orders.push(order);
    broadcastState();
  });

  socket.on('closeOrder', (orderId) => {
  const orderIndex = orders.findIndex(o => o.id === orderId);
  if (orderIndex !== -1) {
    orders[orderIndex].closed = true;
    broadcastState();
    console.log(`Order ${orderId} wurde geschlossen.`);

    // Nach 5 Sekunden aus Liste entfernen (statt 10)
    setTimeout(() => {
      const stillExists = orders[orderIndex];
      if (stillExists && stillExists.closed) {
        orders.splice(orderIndex, 1);
        broadcastState();
        console.log(`Order ${orderId} wurde automatisch entfernt.`);
      }
    }, 5000);
  }
});

  function broadcastState() {
    io.emit('state', {
      orders,
      inProduction: countInProduction(),
      last10sec: countLast10Seconds(),
      articleProductionCount: getArticleProductionCount()
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
