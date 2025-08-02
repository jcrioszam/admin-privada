const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Solo usar proxy en desarrollo
  if (process.env.NODE_ENV === 'development') {
    app.use(
      '/api',
      createProxyMiddleware({
        target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
        changeOrigin: true,
        pathRewrite: {
          '^/api': '', // remove /api prefix
        },
      })
    );
  }
}; 