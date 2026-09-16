// Serves BudgetWidget.html for both GET and POST requests.
// Aspro Cloud sends a POST when loading a dashboard miniapp widget —
// Vercel's static-file handler returns 405 for POST, so we need this proxy.

const fs = require('fs');
const path = require('path');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  // Block only clearly inappropriate methods
  if (req.method === 'DELETE' || req.method === 'PUT' || req.method === 'PATCH') {
    res.statusCode = 405;
    return res.end('Method Not Allowed');
  }

  try {
    const html = fs.readFileSync(
      path.join(process.cwd(), 'BudgetWidget.html'),
      'utf-8'
    );
    res.statusCode = 200;
    return res.end(html);
  } catch (err) {
    res.statusCode = 500;
    return res.end('Error loading widget: ' + err.message);
  }
};
