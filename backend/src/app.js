const express = require('express');
const app = express();
const sequelize = require('./database/database');

app.use(express.json());

// Rutas disponibles en la app
const routeMap = {
  accidentes: { path: '/accidentes', file: './routes/accidente' },
  causaAccidente: { path: '/causaAccidente', file: './routes/causaAccidente' },
  comuna: { path: '/comuna', file: './routes/comuna' },
  region: { path: '/region', file: './routes/region' },
  tipoAccidente: { path: '/tipoAccidente', file: './routes/tipoAccidente' },
  tipoZona: { path: '/tipoZona', file: './routes/tipoZona' },
};

// Si se define RESOURCE, solo monta esa ruta; si no, monta todas
const RESOURCE = process.env.RESOURCE;
if (RESOURCE) {
  const r = routeMap[RESOURCE];
  if (!r) {
    console.warn(`RESOURCE=${RESOURCE} no corresponde a una ruta conocida. Montando todas las rutas.`);
    Object.values(routeMap).forEach(rt => app.use(rt.path, require(rt.file)));
  } else {
    app.use(r.path, require(r.file));
    console.log(`Mounted resource route: ${r.path}`);
  }
} else {
  Object.values(routeMap).forEach(rt => app.use(rt.path, require(rt.file)));
}

// Primero authenticate y luego sync (ya manejado en logs si es necesario)
async function connectWithRetries(maxRetries = 12, delayMs = 2000) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      await sequelize.authenticate();
      console.log('Base de datos: autenticación OK');
      await sequelize.sync();
      console.log('Base de datos conectada y sincronizada');
      return;
    } catch (err) {
      attempt += 1;
      console.warn(`DB connect attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt >= maxRetries) {
        console.error('Error al conectar DB después de varios reintentos:', err);
        return;
      }
      // esperar antes del siguiente intento
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
}

// Iniciar conexión con reintentos (útil en Docker cuando la DB tarda en estar lista)
connectWithRetries();

app.get('/', (req, res) => {
  res.send('API de Accidentes Carabineros funcionando');
});

module.exports = app;
