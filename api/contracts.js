// Отдаёт ContractsWidget.html («Исполнение договоров») на GET и POST.
// Аспро Cloud при загрузке виджета рабочего стола шлёт POST — статический хостинг Vercel
// на POST отвечает 405, поэтому нужен этот обработчик (как api/serve.js для Бюджета).
const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (req.method === 'DELETE' || req.method === 'PUT' || req.method === 'PATCH') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }
  try {
    const html = fs.readFileSync(path.join(process.cwd(), 'ContractsWidget.html'), 'utf-8');
    res.statusCode = 200;
    return res.end(html);
  } catch (err) {
    res.statusCode = 500;
    return res.end('Error loading widget: ' + err.message);
  }
};
