// artifact 빌드 전용: Phaser를 CDN(UMD 전역)에서 받아 번들 크기를 줄인다.
const P = (window as unknown as { Phaser: typeof import('phaser') }).Phaser;
export default P;
