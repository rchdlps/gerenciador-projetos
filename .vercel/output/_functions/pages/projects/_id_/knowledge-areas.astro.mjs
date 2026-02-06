import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro, m as maybeRenderHead, g as addAttribute } from '../../../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../../../chunks/DashboardLayout_otV0p937.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { P as Providers } from '../../../chunks/providers_BxSA8Tkj.mjs';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { a as api } from '../../../chunks/api-client_QlLf4qLC.mjs';
import '../../../chunks/card_WfUoKo13.mjs';
import { D as Dialog, b as DialogContent, c as DialogHeader, d as DialogTitle } from '../../../chunks/dialog_Dk6F9O1c.mjs';
import { T as Textarea } from '../../../chunks/textarea_7OXsxx7K.mjs';
import { B as Button } from '../../../chunks/auth-client_BChqsPJB.mjs';
import { Loader2, Lightbulb, Puzzle, Target, Calendar, Wallet, Award, Users, MessageSquare, AlertTriangle, ShoppingCart, Users2, Search, Save, ArrowLeft } from 'lucide-react';
import { a as auth } from '../../../chunks/auth_Cw0vQzQi.mjs';
export { renderers } from '../../../renderers.mjs';

const AREAS = [
  { id: "integracao", icon: Puzzle, title: "Integração", desc: "Coordenação de todos os aspectos do projeto" },
  { id: "escopo", icon: Target, title: "Escopo", desc: "Definição e controle do que está incluído no projeto" },
  { id: "cronograma", icon: Calendar, title: "Cronograma", desc: "Gerenciamento de prazos e marcos do projeto" },
  { id: "custos", icon: Wallet, title: "Custos", desc: "Planejamento e controle do orçamento" },
  { id: "qualidade", icon: Award, title: "Qualidade", desc: "Garantia de atendimento aos requisitos" },
  { id: "recursos", icon: Users, title: "Recursos", desc: "Gestão de equipe e recursos físicos" },
  { id: "comunicacao", icon: MessageSquare, title: "Comunicação", desc: "Planejamento e distribuição de informações" },
  { id: "riscos", icon: AlertTriangle, title: "Riscos", desc: "Identificação e mitigação de riscos" },
  { id: "aquisicoes", icon: ShoppingCart, title: "Aquisições", desc: "Compras e contratações necessárias" },
  { id: "partes", icon: Users2, title: "Partes Interessadas", desc: "Engajamento e gerenciamento de stakeholders" }
];
function KnowledgeAreas({ projectId }) {
  const { data: areasData = [], isLoading } = useQuery({
    queryKey: ["knowledge-areas", projectId],
    queryFn: async () => {
      const res = await api["knowledge-areas"][":projectId"].$get({ param: { projectId } });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "flex justify-center p-8", children: /* @__PURE__ */ jsx(Loader2, { className: "animate-spin text-muted-foreground" }) });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "bg-sky-50 border-l-4 border-[#1d4e46] p-4 rounded-r flex gap-3 text-sm text-[#1d4e46] items-start shadow-sm", children: [
      /* @__PURE__ */ jsx(Lightbulb, { className: "w-5 h-5 shrink-0 text-yellow-600 mt-0.5" }),
      /* @__PURE__ */ jsxs("p", { children: [
        /* @__PURE__ */ jsx("span", { className: "font-bold", children: "As 10 Áreas de Conhecimento do PMBOK" }),
        " representam os principais campos de especialização necessários para o gerenciamento eficaz de projetos. Documente aqui as informações específicas de cada área para o seu projeto."
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: AREAS.map((areaDef) => {
      const existingData = areasData.find((a) => a.area === areaDef.id);
      return /* @__PURE__ */ jsx(
        KnowledgeAreaCard,
        {
          projectId,
          areaDef,
          initialContent: existingData?.content || ""
        },
        areaDef.id
      );
    }) })
  ] });
}
function KnowledgeAreaCard({ projectId, areaDef, initialContent }) {
  const queryClient = useQueryClient();
  const Icon = areaDef.icon;
  const [content, setContent] = useState(initialContent);
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async (newContent) => {
      const res = await api["knowledge-areas"][":projectId"][":area"].$put({
        param: { projectId, area: areaDef.id },
        json: { content: newContent }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["knowledge-areas", projectId] });
      setOpen(false);
    }
  });
  const handleSave = () => {
    mutation.mutate(content);
  };
  return /* @__PURE__ */ jsxs(Dialog, { open, onOpenChange: setOpen, children: [
    /* @__PURE__ */ jsx("div", { className: "relative group cursor-pointer", onClick: () => setOpen(true), children: /* @__PURE__ */ jsxs("div", { className: "bg-[#1d4e46] hover:bg-[#256056] text-white rounded-lg p-4 flex items-center justify-between transition-all shadow-md hover:shadow-lg", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-white/10 p-2 rounded-lg", children: /* @__PURE__ */ jsx(Icon, { className: "w-6 h-6 text-white" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "font-bold text-lg", children: areaDef.title }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-white/70", children: areaDef.desc })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx("div", { className: "hidden group-hover:flex items-center px-2 py-1 bg-yellow-500/90 text-black text-[10px] font-bold rounded-full uppercase tracking-wide animate-in fade-in", children: "Clique para abrir" }),
        /* @__PURE__ */ jsx("div", { className: "bg-sky-400/20 p-2 rounded-full group-hover:bg-sky-400/40 transition-colors", children: /* @__PURE__ */ jsx(Search, { className: "w-5 h-5 text-sky-300 group-hover:text-white" }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[700px]", children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2 text-xl", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-primary/10 p-2 rounded", children: /* @__PURE__ */ jsx(Icon, { className: "w-6 h-6 text-primary" }) }),
        areaDef.title
      ] }) }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-4", children: [
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground bg-muted p-3 rounded-md", children: areaDef.desc }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx("label", { className: "text-sm font-semibold", children: "Conteúdo e Definições" }),
          /* @__PURE__ */ jsx(
            Textarea,
            {
              placeholder: `Descreva os detalhes de ${areaDef.title} para este projeto...`,
              className: "min-h-[300px] resize-y",
              value: content,
              onChange: (e) => setContent(e.target.value)
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex justify-end gap-2", children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsxs(Button, { onClick: handleSave, disabled: mutation.isPending, children: [
          mutation.isPending && /* @__PURE__ */ jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }),
          /* @__PURE__ */ jsx(Save, { className: "w-4 h-4 mr-2" }),
          "Salvar Alterações"
        ] })
      ] })
    ] })
  ] });
}

function KnowledgeAreasPage({ projectId }) {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(KnowledgeAreas, { projectId }) });
}

const $$Astro = createAstro();
const $$KnowledgeAreas = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$KnowledgeAreas;
  const session = await auth.api.getSession({ headers: Astro2.request.headers });
  if (!session) return Astro2.redirect("/login");
  const { id } = Astro2.params;
  if (!id) return Astro2.redirect("/");
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "\xC1reas de Conhecimento" }, { "default": async ($$result2) => renderTemplate` ${maybeRenderHead()}<div class="space-y-6"> <div class="flex items-center gap-2"> ${renderComponent($$result2, "Button", Button, { "variant": "ghost", "class": "pl-0 hover:bg-transparent", "asChild": true }, { "default": async ($$result3) => renderTemplate` <a${addAttribute(`/projects/${id}`, "href")} class="flex items-center gap-2 text-primary font-semibold"> ${renderComponent($$result3, "ArrowLeft", ArrowLeft, { "class": "h-4 w-4" })} Voltar para o Projeto
</a> ` })} </div> <div> <h1 class="text-2xl font-bold tracking-tight text-slate-900">Áreas de Conhecimento</h1> <p class="text-slate-500">Gerencie e documente os aspectos técnicos do projeto.</p> </div> ${renderComponent($$result2, "KnowledgeAreasPage", KnowledgeAreasPage, { "client:load": true, "projectId": id, "client:component-hydration": "load", "client:component-path": "@/components/dashboard/knowledge-areas-page", "client:component-export": "KnowledgeAreasPage" })} </div> ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/projects/[id]/knowledge-areas.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/projects/[id]/knowledge-areas.astro";
const $$url = "/projects/[id]/knowledge-areas";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$KnowledgeAreas,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
