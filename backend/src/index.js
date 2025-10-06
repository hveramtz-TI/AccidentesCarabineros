const app = require('./app');

const PORT = process.env.PORT || 3000;
const DEFAULT_HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, () => {
  const addr = server.address();
  // addr.address puede ser '::' o '0.0.0.0' cuando escucha en todas las interfaces
  const host = (addr && (addr.address === '::' || addr.address === '0.0.0.0')) ? DEFAULT_HOST : (addr && addr.address) || DEFAULT_HOST;
  const port = (addr && addr.port) || PORT;
  console.log(`Servidor escuchando en http://${host}:${port}`);
});
