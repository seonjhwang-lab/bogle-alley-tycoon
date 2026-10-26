import Phaser from 'phaser';
import { makeTileTextures } from '../ui/Backdrop';

// 에셋 URL은 Vite가 해석 → 단일 파일 빌드에서도 data URI로 인라인된다
import potPng from '../../public/assets/sprites/pot_modular.png?url';
import potJson from '../../public/assets/sprites/pot_modular.json?url';
import slushPng from '../../public/assets/sprites/slush_machine.png?url';
import slushJson from '../../public/assets/sprites/slush_machine.json?url';
import peepsPng from '../../public/assets/sprites/peeps.png?url';
import peepsJson from '../../public/assets/sprites/peeps.json?url';
import iconsPng from '../../public/assets/sprites/ui_icons.png?url';
import iconsJson from '../../public/assets/sprites/ui_icons.json?url';
import miniPng from '../../public/assets/sprites/ui_mini.png?url';
import miniJson from '../../public/assets/sprites/ui_mini.json?url';
import shopPng from '../../public/assets/sprites/shop_bg.png?url';
import shopJson from '../../public/assets/sprites/shop_bg.json?url';
import kitchenPng from '../../public/assets/sprites/kitchen_bg.png?url';
import kitchenJson from '../../public/assets/sprites/kitchen_bg.json?url';
import prepPng from '../../public/assets/sprites/prep.png?url';
import prepJson from '../../public/assets/sprites/prep.json?url';
import frontPng from '../../public/assets/sprites/frontbar.png?url';
import frontJson from '../../public/assets/sprites/frontbar.json?url';
import propsPng from '../../public/assets/sprites/props.png?url';
import propsJson from '../../public/assets/sprites/props.json?url';
import porPng from '../../public/assets/sprites/portraits.png?url';
import porJson from '../../public/assets/sprites/portraits.json?url';
import g7 from '../../public/fonts/Galmuri7.woff2?url';
import g9 from '../../public/fonts/Galmuri9.woff2?url';
import g11b from '../../public/fonts/Galmuri11-Bold.woff2?url';

const ATLASES: [string, string, string][] = [
  ['pot_modular', potPng, potJson],
  ['slush_machine', slushPng, slushJson],
  ['peeps', peepsPng, peepsJson],
  ['ui_icons', iconsPng, iconsJson],
  ['ui_mini', miniPng, miniJson],
  ['shop_bg', shopPng, shopJson],
  ['kitchen_bg', kitchenPng, kitchenJson],
  ['prep', prepPng, prepJson],
  ['frontbar', frontPng, frontJson],
  ['props', propsPng, propsJson],
  ['portraits', porPng, porJson],
];

/** 반복 재생할 Aseprite 태그 (나머지는 정지 프레임 용도) */
const LOOP = /^(pot_(empty|heating|boiling|simmering|ready|burnt)|slush_(idle|pull|overflow)|kid_|girl_|teacher_|hsgirl_|judo_|cat_|ui_(coin|fire|hand|arrow|fever)|sink_wash|tteok_|odeng_pot|arcade|tv|por_)/;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    const { width, height } = this.scale;
    const bar = this.add.graphics();
    this.load.on('progress', (p: number) => {
      bar.clear();
      bar.fillStyle(0x262b44).fillRect(40, height / 2 - 3, width - 80, 6);
      bar.fillStyle(0xfeae34).fillRect(41, height / 2 - 2, (width - 82) * p, 4);
    });
    for (const [key, png, json] of ATLASES) this.load.aseprite(key, png, json);
  }

  async create() {
    for (const [key] of ATLASES) {
      const anims = this.anims.createFromAseprite(key);
      for (const a of anims) a.repeat = LOOP.test(a.key) ? -1 : 0;
    }
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff).fillRect(0, 0, 1, 1);
    g.generateTexture('px', 1, 1);
    g.destroy();
    makeTileTextures(this);

    const fonts: [string, string][] = [['Galmuri7', g7], ['Galmuri9', g9], ['Galmuri11B', g11b]];
    try {
      await Promise.all(fonts.map(async ([name, url]) => {
        const f = new FontFace(name, `url(${url})`);
        await f.load();
        document.fonts.add(f);
      }));
    } catch (e) {
      console.warn('font load failed', e);
    }
    const q = new URLSearchParams(location.search);
    // 개발·테스트용 바로가기: ?day=3  ?stage=h1|h2|endless
    const day = Number(q.get('day'));
    const stage = q.get('stage');
    if (stage) this.scene.start('Game', { stage });
    else if (day >= 1 && day <= 5) this.scene.start('Game', { stage: `d${day}` });
    else this.scene.start('Title');
  }
}
