const fs = require('fs');
const path = require('path');

// Cria SVG do ícone
function createIconSVG(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#2563eb"/>
      <stop offset="100%" style="stop-color:#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="url(#bg)"/>
  <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.35}" fill="white">
    F
  </text>
  <circle cx="${size * 0.72}" cy="${size * 0.28}" r="${size * 0.12}" fill="#10b981"/>
  <text x="${size * 0.72}" y="${size * 0.32}" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" font-size="${size * 0.12}" fill="white">
    AI
  </text>
</svg>`;
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

// Cria diretório se não existir
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Gera os ícones SVG (podem ser convertidos para PNG depois)
sizes.forEach(size => {
  const svg = createIconSVG(size);
  const filename = `icon-${size}x${size}.svg`;
  fs.writeFileSync(path.join(iconsDir, filename), svg);
  console.log(`Criado: ${filename}`);
});

// Cria também um favicon.svg
const favicon = createIconSVG(32);
fs.writeFileSync(path.join(__dirname, 'public', 'favicon.svg'), favicon);
console.log('Criado: favicon.svg');

console.log('\\nÍcones SVG criados! Para converter para PNG, use ferramentas como:');
console.log('- sharp (npm install sharp)');
console.log('- Ou converta online em sites como cloudconvert.com');
