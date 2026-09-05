// setupProxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/geoserver',
    createProxyMiddleware({
      // Change from http to https
      target: 'https://10.150.16.184',
      changeOrigin: true,
      // Disable SSL certificate verification for self-signed certs
      secure: false,
      pathRewrite: {
        '^/geoserver': '/geoserver',
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      },
      onProxyRes: (proxyRes, req, res) => {
        // Add CORS headers to response
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
        proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept';
      },
      followRedirects: true,
      proxyTimeout: 30000,
      timeout: 30000
    })
  );
};
