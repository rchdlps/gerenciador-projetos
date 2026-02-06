import { e as createComponent, l as renderHead, k as renderComponent, r as renderTemplate } from '../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { S as SignInPage } from '../chunks/wrappers_CKUI0PiM.mjs';
/* empty css                                 */
export { renderers } from '../renderers.mjs';

const $$Login = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="utf-8"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="viewport" content="width=device-width"><title>Login - Gerenciador Projetos</title>${renderHead()}</head> <body> ${renderComponent($$result, "SignInPage", SignInPage, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/auth/wrappers", "client:component-export": "SignInPage" })} </body></html>`;
}, "/home/richard/code/gerenciador-projetos/src/pages/login.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/login.astro";
const $$url = "/login";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
	__proto__: null,
	default: $$Login,
	file: $$file,
	url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
