const JSDOMEnvironmentModule = require('jest-environment-jsdom');

const BaseJSDOMEnvironment =
  JSDOMEnvironmentModule.default ?? JSDOMEnvironmentModule;

class GettyJSDOMEnvironment extends BaseJSDOMEnvironment {
  async setup() {
    await super.setup();

    try {
      const { fetch, Headers, Request, Response, FormData, File, Blob } = require('undici');

      if (typeof this.global.fetch === 'undefined') this.global.fetch = fetch;
      if (typeof this.global.Headers === 'undefined') this.global.Headers = Headers;
      if (typeof this.global.Request === 'undefined') this.global.Request = Request;
      if (typeof this.global.Response === 'undefined') this.global.Response = Response;
      if (typeof this.global.FormData === 'undefined') this.global.FormData = FormData;
      if (typeof this.global.File === 'undefined') this.global.File = File;
      if (typeof this.global.Blob === 'undefined') this.global.Blob = Blob;
    } catch {
      // undici not available; assume environment already provides fetch/Response.
    }

    try {
      const { TextEncoder, TextDecoder } = require('node:util');
      if (typeof this.global.TextEncoder === 'undefined') this.global.TextEncoder = TextEncoder;
      if (typeof this.global.TextDecoder === 'undefined') this.global.TextDecoder = TextDecoder;
    } catch {}

    try {
      const web = require('node:stream/web');
      if (typeof this.global.ReadableStream === 'undefined') this.global.ReadableStream = web.ReadableStream;
      if (typeof this.global.WritableStream === 'undefined') this.global.WritableStream = web.WritableStream;
      if (typeof this.global.TransformStream === 'undefined') this.global.TransformStream = web.TransformStream;
    } catch {}
  }
}

module.exports = GettyJSDOMEnvironment;
