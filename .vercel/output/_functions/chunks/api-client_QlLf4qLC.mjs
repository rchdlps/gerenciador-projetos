import { hc } from 'hono/client';

const client = hc("/");
const api = client.api;

export { api as a };
