/*
 Script simple que copia los modelos a una carpeta `models-dist/` lista para ser incluida
 en cada servicio si necesitas distribuir solo los modelos.
*/
const fs = require('fs');
const path = require('path');

const modelsDir = path.resolve(__dirname, '..', 'src', 'models');
const outDir = path.resolve(__dirname, '..', 'models-dist');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js'));
for (const f of files) {
  const src = path.join(modelsDir, f);
  const dst = path.join(outDir, f);
  fs.copyFileSync(src, dst);
  console.log(`Copied ${f}`);
}

console.log('Models propagated to models-dist/');
