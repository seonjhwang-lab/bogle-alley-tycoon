import Phaser from 'phaser';
import { C, CSS, FONT, GAME_H, GAME_W } from '../config/constants';
import type { SoundManager } from '../systems/SoundManager';
import { makeButton, txt } from './Juice';

/**
 * 90년대 만화 감성 대화창: 도트 초상화 + 타이핑 대사 + [영업 시작]
 *   화면 아무 곳 탭 = 타이핑 즉시 완료 → 다음 대사
 */
export type Speaker = 'me' | 'grandma' | 'hsgirl' | 'judo';
export interface StoryLine { who: Speaker; text: string }

const NAME: Record<Speaker, string> = { me: '나 (새 사장)', grandma: '할머니', hsgirl: '여고생 반장', judo: '유도부 주장' };
const TAG: Record<Speaker, number> = { me: C.red, grandma: C.purple, hsgirl: C.pink, judo: C.blue };

export const STORY: Record<string, { title: string; lines: StoryLine[] }> = {
  d1: {
    title: '프롤로그',
    lines: [
      { who: 'me', text: '1999년 봄, 할머니 대신 맡게 된\n학교 앞 작은 분식집 「보글보글」…' },
      { who: 'grandma', text: '허리 나을 때까지만 가게 좀 부탁하마.\n라면은 물 끓을 때 면 넣는 게 제일이여!' },
      { who: 'me', text: '좋아, 오늘부터 내가 사장이다!\n완성된 라면은 원하는 손님에게 직접 건네자!' },
    ],
  },
  d2: {
    title: 'DAY 2',
    lines: [
      { who: 'grandma', text: '대파는 송송 썰고, 계란은 톡!\n재료를 먼저 집고, 넣을 냄비를 콕 찍으렴.' },
      { who: 'me', text: '재료 → 냄비, 완성 냄비 → 손님.\n순서만 지키면 문제없어!' },
    ],
  },
  d3: {
    title: 'DAY 3',
    lines: [
      { who: 'me', text: '오늘은 새로 들인 슬러시 기계랑\n떡볶이 철판을 개시하는 날!' },
      { who: 'grandma', text: '떡볶이는 자주 저어야 윤기가 나는 거여.\n눌어붙으면 휘휘 저어 주고!' },
    ],
  },
  d4: {
    title: 'DAY 4',
    lines: [
      { who: 'grandma', text: '그릇이 모자라면 장사 못 혀.\n설거지 부지런히 하고 어묵 국물도 팔팔!' },
      { who: 'me', text: '어묵탕 개시! 빈 통을 탭하면\n꼬치 3개가 들어가는구나.' },
    ],
  },
  d5: {
    title: 'DAY 5',
    lines: [
      { who: 'me', text: '하교 종소리다… 운동장에서\n애들이 우르르 몰려온다!' },
      { who: 'grandma', text: '고양이 녀석이 또 기웃거리네.\n손질대에 올라오면 쫓아내렴!' },
    ],
  },
  h1: {
    title: '히든 스테이지 · 여고생 군단',
    lines: [
      { who: 'hsgirl', text: '사장님~ 우리 시험 끝났어요!\n치즈라면이랑 떡볶이, 슬러시 세트요!' },
      { who: 'me', text: '세트 러시다… 떡볶이 철판부터\n윤기 나게 데워 두자!' },
    ],
  },
  h2: {
    title: '히든 스테이지 · 유도부 강습',
    lines: [
      { who: 'judo', text: '오스!! 유도부 훈련 끝났습니다!\n라면 두 그릇씩 부탁드립니다!!' },
      { who: 'me', text: '대식가들이다! 같은 손님에게\n라면을 한 그릇씩 두 번 서빙!' },
    ],
  },
  endless: {
    title: '무한 리필 서바이벌',
    lines: [
      { who: 'grandma', text: '이제 너도 어엿한 사장이구나.\n손님이 끝도 없이 올 테니 버텨 보거라!' },
    ],
  },
};

export function showStory(scene: Phaser.Scene, key: string, sfx: SoundManager, onDone: () => void, startLabel = '영업 시작') {
  const story = STORY[key];
  if (!story) { onDone(); return; }
  const D = 2500;
  const objs: Phaser.GameObjects.GameObject[] = [];
  const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(o); return o; };

  const dim = add(scene.add.rectangle(0, 0, GAME_W, GAME_H, C.black, 0.7).setOrigin(0, 0).setDepth(D).setInteractive());
  const w = 228, h = 118, x = 6, y = Math.round(GAME_H / 2 - h / 2 + 30);
  add(txt(scene, GAME_W / 2, y - 26, story.title, { font: FONT.bold, size: 12, color: CSS.yellow, stroke: CSS.black, strokeW: 3 }).setOrigin(0.5, 0).setDepth(D + 1));
  const g = add(scene.add.graphics().setDepth(D + 1));
  // 만화 말풍선 박스 (두꺼운 검정 테두리 + 크림 바탕 + 망점 그림자)
  g.fillStyle(C.black).fillRect(x + 3, y + 3, w, h);
  g.fillStyle(C.black).fillRect(x, y, w, h);
  g.fillStyle(C.cream).fillRect(x + 2, y + 2, w - 4, h - 4);
  for (let yy = y + 4; yy < y + h - 4; yy += 4) for (let xx = x + 4 + ((yy / 4) % 2) * 2; xx < x + 76; xx += 4) g.fillStyle(C.tan).fillRect(xx, yy, 1, 1);
  // 초상화 틀
  g.fillStyle(C.black).fillRect(x + 6, y + 8, 68, 68);
  const por = add(scene.add.sprite(x + 8, y + 10, 'portraits').setOrigin(0, 0).setScale(2).setDepth(D + 2));
  const tag = add(scene.add.graphics().setDepth(D + 2));
  const name = add(txt(scene, x + 40, y + 82, '', { font: FONT.body, size: 10, color: CSS.white, stroke: CSS.black, strokeW: 2 }).setOrigin(0.5, 0).setDepth(D + 3));
  const body = add(txt(scene, x + 82, y + 12, '', { font: FONT.body, size: 10, color: CSS.plum }).setDepth(D + 2).setLineSpacing(5)
    .setWordWrapWidth(w - 90, true));
  const next = add(txt(scene, x + w - 8, y + h - 14, '▼', { font: FONT.small, size: 8, color: CSS.redDk }).setOrigin(1, 0).setDepth(D + 2).setVisible(false));
  scene.tweens.add({ targets: next, y: next.y + 2, yoyo: true, repeat: -1, duration: 300 });
  const skip = add(txt(scene, GAME_W - 6, y + h + 8, '건너뛰기 ▶▶', { font: FONT.small, size: 8, color: CSS.grayLt }).setOrigin(1, 0).setDepth(D + 3).setInteractive());

  let idx = -1;
  let shown = 0;
  let full = '';
  let typing: Phaser.Time.TimerEvent | null = null;
  let btn: Phaser.GameObjects.Container | null = null;
  let finished = false;

  const finish = () => {
    if (finished) return;
    finished = true;
    typing?.remove();
    for (const o of objs) o.destroy();
    btn?.destroy();
    onDone();
  };

  const completeLine = () => {
    typing?.remove();
    typing = null;
    body.setText(full);
    por.anims.stop();
    const anim = scene.anims.get(`por_${story.lines[idx].who}`);
    if (anim) por.setFrame(anim.frames[0].textureFrame);
    if (idx >= story.lines.length - 1) {
      next.setVisible(false);
      if (!btn) {
        btn = makeButton(scene, x + 82, y + h - 30, 90, 22, startLabel, { fill: C.green, depth: D + 4, onClick: finish });
      }
    } else next.setVisible(true);
  };

  const showLine = (i: number) => {
    idx = i;
    const line = story.lines[i];
    full = line.text;
    shown = 0;
    body.setText('');
    next.setVisible(false);
    por.play(`por_${line.who}`);
    name.setText(NAME[line.who]);
    tag.clear();
    const tw = Math.ceil(name.width) + 10;
    tag.fillStyle(C.black).fillRect(x + 40 - tw / 2 - 1, y + 80, tw + 2, 16);
    tag.fillStyle(TAG[line.who]).fillRect(x + 40 - tw / 2, y + 81, tw, 14);
    typing = scene.time.addEvent({
      delay: 32, loop: true, callback: () => {
        shown++;
        body.setText(full.slice(0, shown));
        if (shown % 2 === 0 && full[shown - 1] !== ' ') sfx.blip();
        if (shown >= full.length) completeLine();
      },
    });
  };

  const advance = () => {
    if (finished) return;
    if (typing) { completeLine(); return; }
    if (idx < story.lines.length - 1) showLine(idx + 1);
  };
  dim.on('pointerdown', advance);
  skip.on('pointerdown', finish);
  showLine(0);
  (window as unknown as { __story: unknown }).__story = { key, advance, finish };
}
