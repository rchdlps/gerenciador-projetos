import { renderers } from './renderers.mjs';
import { c as createExports, s as serverEntrypointModule } from './chunks/_@astrojs-ssr-adapter_BUUdOoxL.mjs';
import { manifest } from './manifest_Dkd4OS9I.mjs';

const serverIslandMap = new Map();;

const _page0 = () => import('./pages/_image.astro.mjs');
const _page1 = () => import('./pages/admin.astro.mjs');
const _page2 = () => import('./pages/api/auth/_---all_.astro.mjs');
const _page3 = () => import('./pages/api/_---path_.astro.mjs');
const _page4 = () => import('./pages/calendar.astro.mjs');
const _page5 = () => import('./pages/knowledge-areas.astro.mjs');
const _page6 = () => import('./pages/login.astro.mjs');
const _page7 = () => import('./pages/projects/_id_/calendar.astro.mjs');
const _page8 = () => import('./pages/projects/_id_/knowledge-areas.astro.mjs');
const _page9 = () => import('./pages/projects/_id_.astro.mjs');
const _page10 = () => import('./pages/register.astro.mjs');
const _page11 = () => import('./pages/index.astro.mjs');
const pageMap = new Map([
    ["node_modules/astro/dist/assets/endpoint/generic.js", _page0],
    ["src/pages/admin.astro", _page1],
    ["src/pages/api/auth/[...all].ts", _page2],
    ["src/pages/api/[...path].ts", _page3],
    ["src/pages/calendar.astro", _page4],
    ["src/pages/knowledge-areas.astro", _page5],
    ["src/pages/login.astro", _page6],
    ["src/pages/projects/[id]/calendar.astro", _page7],
    ["src/pages/projects/[id]/knowledge-areas.astro", _page8],
    ["src/pages/projects/[id].astro", _page9],
    ["src/pages/register.astro", _page10],
    ["src/pages/index.astro", _page11]
]);

const _manifest = Object.assign(manifest, {
    pageMap,
    serverIslandMap,
    renderers,
    actions: () => import('./noop-entrypoint.mjs'),
    middleware: () => import('./_noop-middleware.mjs')
});
const _args = {
    "middlewareSecret": "630d0f01-71da-47e8-9344-8ed4cef2b575",
    "skewProtection": false
};
const _exports = createExports(_manifest, _args);
const __astrojsSsrVirtualEntry = _exports.default;
const _start = 'start';
if (Object.prototype.hasOwnProperty.call(serverEntrypointModule, _start)) ;

export { __astrojsSsrVirtualEntry as default, pageMap };
