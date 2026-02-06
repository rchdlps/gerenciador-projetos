import { e as createComponent, k as renderComponent, r as renderTemplate, m as maybeRenderHead } from '../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_otV0p937.mjs';
import { C as CalendarPage } from '../chunks/calendar-page_BmW4HJDq.mjs';
export { renderers } from '../renderers.mjs';

const $$Calendar = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Calend\xE1rio Geral" }, { "default": ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6 animate-in fade-in duration-500"> <div class="flex items-center justify-between"> <div> <h2 class="text-3xl font-bold tracking-tight">
Calendário Consolidado
</h2> <p class="text-muted-foreground">
Visualize todos os prazos e compromissos de todos os seus projetos.
</p> </div> </div> ${renderComponent($$result2, "CalendarPage", CalendarPage, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/calendar/calendar-page", "client:component-export": "CalendarPage" })} </div> ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/calendar.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/calendar.astro";
const $$url = "/calendar";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Calendar,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
