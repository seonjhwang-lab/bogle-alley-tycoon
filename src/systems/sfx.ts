import { SoundManager } from './SoundManager';

/** 씬이 바뀌어도 같은 오디오 컨텍스트를 쓰도록 하나만 만든다 */
export const sfx = new SoundManager();
