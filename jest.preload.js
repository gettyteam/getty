/* eslint-env node */

if (typeof require !== 'undefined') {
  try {
    const { fetch, Headers, Request, Response, FormData, File, Blob } = require('undici');
    if (typeof globalThis.fetch === 'undefined') globalThis.fetch = fetch;
    if (typeof globalThis.Headers === 'undefined') globalThis.Headers = Headers;
    if (typeof globalThis.Request === 'undefined') globalThis.Request = Request;
    if (typeof globalThis.Response === 'undefined') globalThis.Response = Response;
    if (typeof globalThis.FormData === 'undefined') globalThis.FormData = FormData;
    if (typeof globalThis.File === 'undefined') globalThis.File = File;
    if (typeof globalThis.Blob === 'undefined') globalThis.Blob = Blob;
  } catch {
    // undici not available; assume environment already provides fetch/Response.
  }
}

if (typeof require !== 'undefined') {
  try {
    const { TextEncoder, TextDecoder } = require('util');
    if (typeof globalThis.TextEncoder === 'undefined') globalThis.TextEncoder = TextEncoder;
    if (typeof globalThis.TextDecoder === 'undefined') globalThis.TextDecoder = TextDecoder;
  } catch {}

  try {
    const web = require('stream/web');
    if (typeof globalThis.ReadableStream === 'undefined') globalThis.ReadableStream = web.ReadableStream;
    if (typeof globalThis.WritableStream === 'undefined') globalThis.WritableStream = web.WritableStream;
    if (typeof globalThis.TransformStream === 'undefined') globalThis.TransformStream = web.TransformStream;
  } catch {}
}
