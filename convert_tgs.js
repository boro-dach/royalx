import fs from 'fs';
import zlib from 'zlib';

const buf = fs.readFileSync('C:\\Users\\leont\\Downloads\\emoji_1.tgs');
const data = JSON.parse(zlib.gunzipSync(buf).toString('utf8'));

function shapeToPathD(shape, scale = 1) {
  const v = shape.ks.k.v;
  const i = shape.ks.k.i;
  const o = shape.ks.k.o;
  const c = shape.ks.k.c;
  let d = '';
  for (let idx = 0; idx < v.length; idx++) {
    const pt = [v[idx][0] * scale, v[idx][1] * scale];
    if (idx === 0) {
      d += `M ${pt[0].toFixed(2)} ${pt[1].toFixed(2)} `;
    } else {
      const cp1 = [(v[idx - 1][0] + o[idx - 1][0]) * scale, (v[idx - 1][1] + o[idx - 1][1]) * scale];
      const cp2 = [(v[idx][0] + i[idx][0]) * scale, (v[idx][1] + i[idx][1]) * scale];
      d += `C ${cp1[0].toFixed(2)} ${cp1[1].toFixed(2)}, ${cp2[0].toFixed(2)} ${cp2[1].toFixed(2)}, ${pt[0].toFixed(2)} ${pt[1].toFixed(2)} `;
    }
  }
  if (c && v.length > 0) {
    const lastIdx = v.length - 1;
    const pt0 = [v[0][0] * scale, v[0][0] * scale];
    const cp1 = [(v[lastIdx][0] + o[lastIdx][0]) * scale, (v[lastIdx][1] + o[lastIdx][1]) * scale];
    const cp2 = [(v[0][0] + i[0][0]) * scale, (v[0][1] + i[0][1]) * scale];
    d += `C ${cp1[0].toFixed(2)} ${cp1[1].toFixed(2)}, ${cp2[0].toFixed(2)} ${cp2[1].toFixed(2)}, ${v[0][0] * scale} ${v[0][1] * scale} Z`;
  }
  return d;
}

const scale = 1.3333333333; // 4/3 scale

const items = data.layers[0].shapes[0].it;
const whiteGroup = items[0];
const circleGroup = items[1];

const circlePathD = shapeToPathD(circleGroup.it[0], scale);
const whiteD0 = shapeToPathD(whiteGroup.it[0], scale);
const whiteD1 = shapeToPathD(whiteGroup.it[1], scale);
const whiteD2 = shapeToPathD(whiteGroup.it[2], scale);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <path fill="#009393" d="${circlePathD}" />
  <path fill="#ffffff" d="${whiteD0}" />
  <path fill="#ffffff" d="${whiteD1}" />
  <path fill="#ffffff" d="${whiteD2}" />
</svg>`;

fs.writeFileSync('public/tether-usdt.svg', svg);
console.log('Successfully written public/tether-usdt.svg');
