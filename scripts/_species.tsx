// Лист всех видов: стадии 2,3,4 (+цветение). vite-node scripts/_species.tsx out.html
import { renderToStaticMarkup } from 'react-dom/server';
import { writeFileSync } from 'fs';
import { PlantArt } from '../src/ui/art/PlantArt';
import { SPECIES } from '../src/game/species';
const only = process.argv[3]?.split(',');
const list = SPECIES.filter((s) => !only || only.includes(s.id));
const cell = (sp: string, stage: number, bloom = false) => `<div class="c">${renderToStaticMarkup(<PlantArt sp={sp} stage={stage as 2} seed="sheet" blooming={bloom} pot={['terracotta', 'pink', 'mint', 'white'][sp.length % 4]} />)}</div>`;
const rows = list.map((s) => `<div class="r"><b>${s.name}</b>${cell(s.id, 0)}${cell(s.id, 2)}${cell(s.id, 3)}${cell(s.id, 4)}${s.art.flower ? cell(s.id, 4, true) : ''}</div>`).join('');
writeFileSync(process.argv[2], `<style>body{margin:0;background:#efece6;font:12px system-ui}.r{display:flex;align-items:flex-end;gap:4px;padding:2px 8px}.r b{width:90px}.c svg{width:126px;height:180px;overflow:visible}</style>${rows}`);
