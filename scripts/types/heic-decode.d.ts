/**
 * heic-decode 没有自带类型声明，这里补一个最小可用版本。
 * 只覆盖本项目用到的 `decode({ buffer })` 单图层接口。
 */
declare module "heic-decode" {
  export interface DecodedHeicImage {
    width: number;
    height: number;
    /** RGBA 像素，每像素 4 字节（行优先、无 padding） */
    data: Uint8ClampedArray;
  }

  function decode(options: { buffer: Buffer | Uint8Array }): Promise<DecodedHeicImage>;

  export default decode;
}
