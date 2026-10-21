import type { PluginHttp, PluginHttpOptions } from '@sp/plugin-api';

export interface RecordedCall {
  method: string;
  url: string;
  body?: unknown;
  options?: PluginHttpOptions;
}

type Handler = (call: RecordedCall) => unknown;

/** PluginHttp stand-in that records calls and answers them with `handler`. */
export const createFakeHttp = (handler: Handler = () => ({})) => {
  const calls: RecordedCall[] = [];
  const respond = async <T>(call: RecordedCall): Promise<T> => {
    calls.push(call);
    return handler(call) as T;
  };
  const http: PluginHttp = {
    get: (url, options) => respond({ method: 'GET', url, options }),
    post: (url, body, options) => respond({ method: 'POST', url, body, options }),
    put: (url, body, options) => respond({ method: 'PUT', url, body, options }),
    patch: (url, body, options) => respond({ method: 'PATCH', url, body, options }),
    delete: (url, options) => respond({ method: 'DELETE', url, options }),
    request: (method, url, body, options) => respond({ method, url, body, options }),
  };
  return { http, calls };
};
