import 'piccolore';
import { o as decodeKey } from './chunks/astro/server_CxIlnfDj.mjs';
import 'clsx';
import { N as NOOP_MIDDLEWARE_FN } from './chunks/astro-designed-error-pages_HJGHN3Y6.mjs';
import 'es-module-lexer';

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/richard/code/gerenciador-projetos/","cacheDir":"file:///home/richard/code/gerenciador-projetos/node_modules/.astro/","outDir":"file:///home/richard/code/gerenciador-projetos/dist/","srcDir":"file:///home/richard/code/gerenciador-projetos/src/","publicDir":"file:///home/richard/code/gerenciador-projetos/public/","buildClientDir":"file:///home/richard/code/gerenciador-projetos/dist/client/","buildServerDir":"file:///home/richard/code/gerenciador-projetos/dist/server/","adapterName":"@astrojs/vercel","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"endpoint","isIndex":false,"route":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"params":[],"component":"node_modules/astro/dist/assets/endpoint/generic.js","pathname":"/_image","prerender":false,"fallbackRoutes":[],"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/admin","isIndex":false,"type":"page","pattern":"^\\/admin\\/?$","segments":[[{"content":"admin","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/admin.astro","pathname":"/admin","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/auth/[...all]","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/auth(?:\\/(.*?))?\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"auth","dynamic":false,"spread":false}],[{"content":"...all","dynamic":true,"spread":true}]],"params":["...all"],"component":"src/pages/api/auth/[...all].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/[...path]","isIndex":false,"type":"endpoint","pattern":"^\\/api(?:\\/(.*?))?\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"...path","dynamic":true,"spread":true}]],"params":["...path"],"component":"src/pages/api/[...path].ts","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/calendar","isIndex":false,"type":"page","pattern":"^\\/calendar\\/?$","segments":[[{"content":"calendar","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/calendar.astro","pathname":"/calendar","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/knowledge-areas","isIndex":false,"type":"page","pattern":"^\\/knowledge-areas\\/?$","segments":[[{"content":"knowledge-areas","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/knowledge-areas.astro","pathname":"/knowledge-areas","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/login","isIndex":false,"type":"page","pattern":"^\\/login\\/?$","segments":[[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/login.astro","pathname":"/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/projects/[id]/calendar","isIndex":false,"type":"page","pattern":"^\\/projects\\/([^/]+?)\\/calendar\\/?$","segments":[[{"content":"projects","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}],[{"content":"calendar","dynamic":false,"spread":false}]],"params":["id"],"component":"src/pages/projects/[id]/calendar.astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/projects/[id]/knowledge-areas","isIndex":false,"type":"page","pattern":"^\\/projects\\/([^/]+?)\\/knowledge-areas\\/?$","segments":[[{"content":"projects","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}],[{"content":"knowledge-areas","dynamic":false,"spread":false}]],"params":["id"],"component":"src/pages/projects/[id]/knowledge-areas.astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/projects/[id]","isIndex":false,"type":"page","pattern":"^\\/projects\\/([^/]+?)\\/?$","segments":[[{"content":"projects","dynamic":false,"spread":false}],[{"content":"id","dynamic":true,"spread":false}]],"params":["id"],"component":"src/pages/projects/[id].astro","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/register","isIndex":false,"type":"page","pattern":"^\\/register\\/?$","segments":[[{"content":"register","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/register.astro","pathname":"/register","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"/_astro/admin.B9x6xhWm.css"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/richard/code/gerenciador-projetos/src/pages/login.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/register.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/admin.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/calendar.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/knowledge-areas.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/projects/[id].astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/projects/[id]/calendar.astro",{"propagation":"none","containsHead":true}],["/home/richard/code/gerenciador-projetos/src/pages/projects/[id]/knowledge-areas.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000noop-middleware":"_noop-middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/admin@_@astro":"pages/admin.astro.mjs","\u0000@astro-page:src/pages/api/auth/[...all]@_@ts":"pages/api/auth/_---all_.astro.mjs","\u0000@astro-page:src/pages/api/[...path]@_@ts":"pages/api/_---path_.astro.mjs","\u0000@astro-page:src/pages/calendar@_@astro":"pages/calendar.astro.mjs","\u0000@astro-page:src/pages/knowledge-areas@_@astro":"pages/knowledge-areas.astro.mjs","\u0000@astro-page:src/pages/login@_@astro":"pages/login.astro.mjs","\u0000@astro-page:src/pages/projects/[id]/calendar@_@astro":"pages/projects/_id_/calendar.astro.mjs","\u0000@astro-page:src/pages/projects/[id]/knowledge-areas@_@astro":"pages/projects/_id_/knowledge-areas.astro.mjs","\u0000@astro-page:src/pages/projects/[id]@_@astro":"pages/projects/_id_.astro.mjs","\u0000@astro-page:src/pages/register@_@astro":"pages/register.astro.mjs","\u0000@astro-page:src/pages/index@_@astro":"pages/index.astro.mjs","\u0000@astrojs-ssr-virtual-entry":"entry.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astro-page:node_modules/astro/dist/assets/endpoint/generic@_@js":"pages/_image.astro.mjs","\u0000@astrojs-ssr-adapter":"_@astrojs-ssr-adapter.mjs","\u0000@astrojs-manifest":"manifest_Dkd4OS9I.mjs","/home/richard/code/gerenciador-projetos/node_modules/astro/dist/assets/services/sharp.js":"chunks/sharp_BbuLSQrV.mjs","@/components/admin/dashboard":"_astro/dashboard.DlS_YCIs.js","@/components/calendar/calendar-page":"_astro/calendar-page.CqKrgBDl.js","@/components/auth/wrappers":"_astro/wrappers.DwZbiY_l.js","@/components/dashboard/knowledge-areas-page":"_astro/knowledge-areas-page.CNiE7hwB.js","@/components/dashboard/project-page":"_astro/project-page.BGx9MBcc.js","@/components/dashboard/wrapper":"_astro/wrapper.eJU538-V.js","@/components/layout/header":"_astro/header.Dtup8zwF.js","@/components/layout/sidebar":"_astro/sidebar.C6-2SAvH.js","@astrojs/react/client.js":"_astro/client.Dhq_i1tP.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/_astro/admin.B9x6xhWm.css","/brasao-cuiaba.webp","/favicon.ico","/favicon.svg","/_astro/auth-client.BSCCAQSx.js","/_astro/badge.Bk1XBo-w.js","/_astro/book-open.CVKhWID-.js","/_astro/building-2.DMSmHH9f.js","/_astro/button.C7nr6ow3.js","/_astro/calendar-page.CqKrgBDl.js","/_astro/calendar.BiE7-zmd.js","/_astro/card.COi6a3zU.js","/_astro/circle.C221g-he.js","/_astro/client.Dhq_i1tP.js","/_astro/createLucideIcon.BT1YvhfI.js","/_astro/dashboard.DlS_YCIs.js","/_astro/dialog.D-fiAzGC.js","/_astro/header.Dtup8zwF.js","/_astro/index.DBb4ffa2.js","/_astro/index.DIfZGIpv.js","/_astro/index.XeJbqeyU.js","/_astro/index.nvHwJhPY.js","/_astro/knowledge-areas-page.CNiE7hwB.js","/_astro/label.CX8mjn5I.js","/_astro/layout-dashboard.D2FpTZ5V.js","/_astro/loader-circle.DlKzBabf.js","/_astro/plus.UANvjMxu.js","/_astro/project-page.BGx9MBcc.js","/_astro/providers.UQtKWlBt.js","/_astro/search.Qw-1NHMa.js","/_astro/select.CmpBYXT0.js","/_astro/sidebar.C6-2SAvH.js","/_astro/textarea.IcwpziPU.js","/_astro/trash-2.P6A86Zrp.js","/_astro/users.q5cPqinq.js","/_astro/utils.BdS-FAhz.js","/_astro/wrapper.eJU538-V.js","/_astro/wrappers.DwZbiY_l.js","/_astro/x.CzxnF3Yo.js"],"buildFormat":"directory","checkOrigin":true,"allowedDomains":[],"serverIslandNameMap":[],"key":"XI6ZmKR8aDpE62b0l0wWoflSm28Fd9GXq4gnNqpTEAw="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
