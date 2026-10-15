import { ApiRouter, type HttpRequest, type HttpResponse } from '../../server/router.js';
import { loadEnv } from '../../server/env.js';

const env = loadEnv();
const router = new ApiRouter(env);

export async function handler(event: {
  httpMethod: string;
  path: string;
  headers: Record<string, string | undefined>;
  queryStringParameters?: Record<string, string | undefined> | null;
  body?: string | null;
}): Promise<HttpResponse> {
  const req: HttpRequest = {
    httpMethod: event.httpMethod,
    path: event.path,
    headers: event.headers || {},
    queryStringParameters: event.queryStringParameters,
    body: event.body
  };

  return router.handle(req);
}
