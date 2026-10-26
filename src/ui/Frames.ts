import Phaser from 'phaser';

/** Aseprite 태그 이름으로 프레임 키를 찾는다 (예: 'ui_bowl' → '14') */
const cache = new Map<string, string>();

export function frameOf(scene: Phaser.Scene, atlas: string, tag: string, offset = 0): string {
  const k = `${atlas}/${tag}/${offset}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const data = scene.cache.json.get(atlas) as { meta: { frameTags: { name: string; from: number }[] } } | undefined;
  const t = data?.meta.frameTags.find((f) => f.name === tag);
  if (!t) throw new Error(`frame tag not found: ${atlas}/${tag}`);
  const v = String(t.from + offset);
  cache.set(k, v);
  return v;
}

const ATLAS_OF: [RegExp, string][] = [
  [/^ui_/, 'ui_icons'],
  [/^mini_/, 'ui_mini'],
  [/^pot_/, 'pot_modular'],
  [/^(board|egg_basket|cheese_plate|sink)/, 'prep'],
  [/^slush_/, 'slush_machine'],
  [/^(griddle|tteok_|odeng_pot)/, 'frontbar'],
  [/^(arcade|tv)$/, 'props'],
  [/^por_/, 'portraits'],
];

export function atlasOf(tag: string) {
  for (const [re, a] of ATLAS_OF) if (re.test(tag)) return a;
  throw new Error(`unknown atlas for ${tag}`);
}

/** 태그 이름 하나로 이미지 생성 */
export function icon(scene: Phaser.Scene, x: number, y: number, tag: string, offset = 0) {
  const a = atlasOf(tag);
  return scene.add.image(x, y, a, frameOf(scene, a, tag, offset));
}

export function setIcon(img: Phaser.GameObjects.Image, tag: string, offset = 0) {
  const a = atlasOf(tag);
  img.setTexture(a, frameOf(img.scene, a, tag, offset));
  return img;
}
