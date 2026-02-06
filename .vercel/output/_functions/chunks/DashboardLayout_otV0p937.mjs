import { e as createComponent, g as addAttribute, l as renderHead, k as renderComponent, n as renderSlot, r as renderTemplate, h as createAstro } from './astro/server_CxIlnfDj.mjs';
import 'piccolore';
/* empty css                         */
import { jsxs, jsx } from 'react/jsx-runtime';
import { a as authClient, B as Button, c as cn } from './auth-client_BChqsPJB.mjs';
import { LayoutDashboard, Layers, FolderDot, BookOpen, Calendar, ArrowLeft, Building2, Settings } from 'lucide-react';
import { useState, useEffect } from 'react';

function Header() {
  const { data: session } = authClient.useSession();
  return /* @__PURE__ */ jsxs("header", { className: "bg-brand-gradient text-primary-foreground shadow-sm sticky top-0 z-50 relative pb-[5px]", children: [
    /* @__PURE__ */ jsxs("div", { className: "container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "bg-white p-1 rounded-sm w-16 h-16 flex items-center justify-center shadow-lg", children: [
          /* @__PURE__ */ jsx(
            "img",
            {
              src: "/brasao-cuiaba.webp",
              alt: "Brasão Cuiabá",
              className: "w-full h-full object-contain",
              onError: (e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.nextElementSibling?.classList.remove("hidden");
              }
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "hidden text-green-800 font-bold text-xs text-center leading-tight", children: "BRASÃO CUIABÁ" })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h2", { className: "text-sm font-semibold text-white/90 uppercase tracking-wider mb-0.5", children: "Prefeitura Municipal de Cuiabá" }),
          /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold leading-none tracking-tight text-white drop-shadow-md mb-1", children: "Sistema de Gestão de Projetos" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-[10px] md:text-xs font-medium text-white/80 border-t border-white/20 pt-1 mt-1", children: [
            /* @__PURE__ */ jsx("span", { className: "uppercase", children: "Secretaria de Planejamento Estratégico e Orçamento" }),
            /* @__PURE__ */ jsx("span", { className: "hidden md:inline text-gold-400", children: "|" }),
            /* @__PURE__ */ jsx("span", { className: "hidden md:inline", children: "Diretoria Técnica de Governança" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "hidden md:block text-right", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-semibold leading-none text-white", children: session?.user?.name || "Usuário" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-white/70", children: session?.user?.email || "" })
        ] }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "secondary",
            size: "sm",
            className: "font-medium shadow-none hover:bg-white/90 bg-secondary text-secondary-foreground border-none",
            onClick: async () => {
              await authClient.signOut();
              window.location.href = "/login";
            },
            children: "Sair"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 left-0 right-0 h-[5px] bg-brand-stripe" })
  ] });
}

function Sidebar() {
  const [currentPath, setCurrentPath] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);
  const isActive = (path) => currentPath === path;
  const projectMatch = currentPath.match(/\/projects\/([^\/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;
  const getLinkClass = (active, isProjectContext = false) => {
    if (isProjectContext) {
      return cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all group",
        active ? "bg-white text-blue-700 shadow-sm" : "text-slate-600 hover:bg-white hover:text-blue-700 hover:shadow-sm"
      );
    }
    return cn(
      "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors group",
      active ? "bg-primary/10 text-primary font-bold" : "text-foreground/70 hover:bg-accent hover:text-accent-foreground"
    );
  };
  return /* @__PURE__ */ jsxs("aside", { className: "w-64 hidden lg:flex flex-col border-r bg-card/50 backdrop-blur-sm h-[calc(100vh-64px)] sticky top-16", children: [
    /* @__PURE__ */ jsxs("nav", { className: "flex-1 p-4 space-y-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2", children: "Menu Principal" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1", children: [
          /* @__PURE__ */ jsxs("a", { href: "/", className: getLinkClass(isActive("/")), children: [
            /* @__PURE__ */ jsx(LayoutDashboard, { className: cn("w-4 h-4 group-hover:text-primary", isActive("/") ? "text-primary" : "text-muted-foreground") }),
            "Dashboard"
          ] }),
          /* @__PURE__ */ jsxs("a", { href: "/kanban", className: getLinkClass(isActive("/kanban")), children: [
            /* @__PURE__ */ jsx(Layers, { className: cn("w-4 h-4 group-hover:text-primary", isActive("/kanban") ? "text-primary" : "text-muted-foreground") }),
            "Minhas Tarefas"
          ] })
        ] })
      ] }),
      projectId && /* @__PURE__ */ jsxs("div", { className: "animate-in fade-in slide-in-from-left-4 duration-500", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2 px-2 flex items-center justify-between", children: "Contexto do Projeto" }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-1 bg-blue-50/50 p-2 rounded-lg border border-blue-100", children: [
          /* @__PURE__ */ jsxs("a", { href: `/projects/${projectId}`, className: getLinkClass(isActive(`/projects/${projectId}`), true), children: [
            /* @__PURE__ */ jsx(FolderDot, { className: cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}`) ? "text-blue-700" : "text-blue-500") }),
            "Visão Geral"
          ] }),
          /* @__PURE__ */ jsxs("a", { href: `/projects/${projectId}/knowledge-areas`, className: getLinkClass(isActive(`/projects/${projectId}/knowledge-areas`), true), children: [
            /* @__PURE__ */ jsx(BookOpen, { className: cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}/knowledge-areas`) ? "text-blue-700" : "text-slate-400") }),
            "Áreas de Conhecimento"
          ] }),
          /* @__PURE__ */ jsxs("a", { href: `/projects/${projectId}/calendar`, className: getLinkClass(isActive(`/projects/${projectId}/calendar`), true), children: [
            /* @__PURE__ */ jsx(Calendar, { className: cn("w-4 h-4 group-hover:text-blue-700", isActive(`/projects/${projectId}/calendar`) ? "text-blue-700" : "text-slate-400") }),
            "Calendário"
          ] }),
          /* @__PURE__ */ jsx("div", { className: "pt-2 mt-2 border-t border-blue-200/50", children: /* @__PURE__ */ jsxs("a", { href: "/", className: "flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors", children: [
            /* @__PURE__ */ jsx(ArrowLeft, { className: "w-3 h-3" }),
            "Sair do Projeto"
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 flex justify-between items-center bg-slate-100 p-1.5 rounded", children: [
          /* @__PURE__ */ jsx("span", { children: "Unidades (Orgs)" }),
          /* @__PURE__ */ jsx(Building2, { className: "w-3 h-3 text-slate-500" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "space-y-1 mt-2", children: /* @__PURE__ */ jsx("div", { className: "px-3 py-1.5 text-xs text-muted-foreground italic", children: "Selecione no Dashboard" }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2", children: "Administração" }),
        /* @__PURE__ */ jsx("div", { className: "space-y-1", children: /* @__PURE__ */ jsxs("a", { href: "/admin", className: getLinkClass(currentPath.startsWith("/admin")), children: [
          /* @__PURE__ */ jsx(Settings, { className: cn("w-4 h-4 group-hover:text-primary", currentPath.startsWith("/admin") ? "text-primary" : "text-muted-foreground") }),
          "Gestão de Secretarias"
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "p-4 border-t bg-muted/10", children: /* @__PURE__ */ jsx("div", { className: "text-xs text-muted-foreground text-center", children: "© 2026 Prefeitura de Cuiabá" }) })
  ] });
}

const $$Astro = createAstro();
const $$DashboardLayout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$DashboardLayout;
  const { title } = Astro2.props;
  return renderTemplate`<html lang="pt-BR"> <head><meta charset="UTF-8"><meta name="description" content="Sistema de Gestão de Projetos"><meta name="viewport" content="width=device-width"><link rel="icon" type="image/svg+xml" href="/favicon.svg"><meta name="generator"${addAttribute(Astro2.generator, "content")}><title>${title}</title>${renderHead()}</head> <body class="bg-background min-h-screen font-sans antialiased"> ${renderComponent($$result, "Header", Header, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/layout/header", "client:component-export": "Header" })} <div class="flex"> ${renderComponent($$result, "Sidebar", Sidebar, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/layout/sidebar", "client:component-export": "Sidebar" })} <main class="flex-1 container mx-auto max-w-7xl p-6 sm:p-8"> ${renderSlot($$result, $$slots["default"])} </main> </div> </body></html>`;
}, "/home/richard/code/gerenciador-projetos/src/layouts/DashboardLayout.astro", void 0);

export { $$DashboardLayout as $ };
