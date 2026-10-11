// 段1 ではアダプタの「形」だけを決める。中身を作る段の番号を添えて投げる。
export class PlatformNotReadyError extends Error {
  constructor(feature: string, stage: number) {
    super(`${feature} is implemented in stage ${stage}`);
    this.name = 'PlatformNotReadyError';
  }
}
