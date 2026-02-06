import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_otV0p937.mjs';
import { BookOpen } from 'lucide-react';
export { renderers } from '../renderers.mjs';

const $$KnowledgeAreas = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "\xC1reas de Conhecimento" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="flex flex-col items-center justify-center min-h-[50vh] text-center p-8"> <div class="p-4 bg-slate-100 rounded-full mb-4"> ${renderComponent($$result2, "BookOpen", BookOpen, { "class": "w-12 h-12 text-slate-400" })} </div> <h1 class="text-2xl font-bold text-slate-900">Áreas de Conhecimento</h1> <p class="text-slate-500 mt-2 max-w-md">
Esta funcionalidade está em desenvolvimento. Em breve você poderá gerenciar as áreas de conhecimento dos projetos aqui.
</p> </div> ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/knowledge-areas.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/knowledge-areas.astro";
const $$url = "/knowledge-areas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$KnowledgeAreas,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
