const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/geoserver',
    createProxyMiddleware({
      target: 'http://10.150.16.184',
      changeOrigin: true,
      pathRewrite: {
        '^/geoserver': '/geoserver',
      },
      onError: (err, req, res) => {
        console.error('Proxy error:', err);
      }
    })
  );
};
