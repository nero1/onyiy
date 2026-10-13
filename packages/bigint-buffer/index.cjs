'use strict';
const { Buffer } = require('buffer');
// Bounded pure JavaScript replacement for the four SDK-used bigint-buffer
// functions. No bindings/node-gyp/native pointer arithmetic is loaded.
const maximum = 65536;
function input(value) {
  if (!(value instanceof Uint8Array) || value.byteLength > maximum) throw new RangeError('Invalid integer buffer');
  return Buffer.from(value);
}
function toBigIntBE(value) {
  const bytes = input(value);
  return bytes.length ? BigInt('0x' + bytes.toString('hex')) : 0n;
}
function toBigIntLE(value) { return toBigIntBE(input(value).reverse()); }
function toBufferBE(value, width) {
  if (typeof value !== 'bigint' || value < 0n || !Number.isSafeInteger(width) || width < 1 || width > maximum) throw new RangeError('Invalid integer width');
  const hex = value.toString(16);
  if (hex.length > width * 2) throw new RangeError('Integer exceeds width');
  const output = Buffer.alloc(width), bytes = Buffer.from(hex.length % 2 ? '0' + hex : hex, 'hex');
  bytes.copy(output, width - bytes.length);
  return output;
}
function toBufferLE(value, width) { return toBufferBE(value, width).reverse(); }
module.exports = { toBigIntBE, toBigIntLE, toBufferBE, toBufferLE };
