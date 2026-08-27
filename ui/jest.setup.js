const { TextEncoder, TextDecoder } = require('util');
const { ReadableStream } = require('stream/web');

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}
if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}
if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}
