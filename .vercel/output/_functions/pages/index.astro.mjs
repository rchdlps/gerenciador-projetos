import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro } from '../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_otV0p937.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { P as Providers } from '../chunks/providers_BxSA8Tkj.mjs';
import { useState, useEffect } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { a as api } from '../chunks/api-client_QlLf4qLC.mjs';
import { C as Card, a as CardHeader, c as CardTitle, d as CardDescription, b as CardContent, e as CardFooter } from '../chunks/card_WfUoKo13.mjs';
import { B as Button } from '../chunks/auth-client_BChqsPJB.mjs';
import { L as Label, I as Input } from '../chunks/label_CgPqOaII.mjs';
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogFooter } from '../chunks/dialog_Dk6F9O1c.mjs';
import { T as Textarea } from '../chunks/textarea_7OXsxx7K.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../chunks/select_-SV5s6Gs.mjs';
import { Plus, Search, Filter, Folder, Building2, Landmark, ArrowRight } from 'lucide-react';
import { a as auth } from '../chunks/auth_Cw0vQzQi.mjs';
export { renderers } from '../renderers.mjs';

function ProjectList() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selectedOrg, setSelectedOrg] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOrg, setFilterOrg] = useState("all");
  const { data: organizations, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.organizations.$get();
      if (!res.ok) throw new Error("Failed to fetch organizations");
      return res.json();
    }
  });
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.projects.$get();
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    }
  });
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrg) {
      setSelectedOrg(organizations[0].id);
    }
  }, [organizations]);
  const createProject = useMutation({
    mutationFn: async () => {
      if (!selectedOrg) throw new Error("Organization is required");
      const res = await api.projects.$post({
        json: {
          name,
          description: desc,
          organizationId: selectedOrg
        }
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsOpen(false);
      setName("");
      setDesc("");
    }
  });
  const getOrgName = (orgId) => {
    if (!orgId) return "Projetos Pessoais / Legado";
    const org = organizations?.find((o) => o.id === orgId);
    return org ? `${org.code} - ${org.name}` : "Outra Secretaria";
  };
  const filteredProjects = projects?.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(term) || (p.description?.toLowerCase() || "").includes(term);
    const matchesOrg = filterOrg === "all" || filterOrg === "personal" && !p.organizationId || p.organizationId === filterOrg;
    return matchesSearch && matchesOrg;
  });
  const groupedProjects = {};
  if (filteredProjects) {
    filteredProjects.forEach((p) => {
      const orgId = p.organizationId || "personal";
      if (!groupedProjects[orgId]) groupedProjects[orgId] = [];
      groupedProjects[orgId].push(p);
    });
  }
  if (isLoading || isLoadingOrgs) return /* @__PURE__ */ jsx("div", { className: "p-10 text-center text-muted-foreground animate-pulse", children: "Carregando dados..." });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-center justify-between gap-4 border-b pb-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h2", { className: "text-3xl font-bold tracking-tight text-foreground", children: "Projetos" }),
        /* @__PURE__ */ jsx("p", { className: "text-muted-foreground mt-1", children: "Gerencie e acompanhe seus projetos por Secretaria" })
      ] }),
      /* @__PURE__ */ jsxs(Dialog, { open: isOpen, onOpenChange: setIsOpen, children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { className: "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95", children: [
          /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
          " Novo Projeto"
        ] }) }),
        /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-md", children: [
          /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Criar Novo Projeto" }) }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "org", children: "Secretaria / Unidade" }),
              /* @__PURE__ */ jsxs(Select, { value: selectedOrg, onValueChange: setSelectedOrg, children: [
                /* @__PURE__ */ jsx(SelectTrigger, { id: "org", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Selecione a Secretaria" }) }),
                /* @__PURE__ */ jsx(SelectContent, { children: organizations?.map((org) => /* @__PURE__ */ jsxs(SelectItem, { value: org.id, children: [
                  org.code,
                  " - ",
                  org.name
                ] }, org.id)) })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Nome do Projeto" }),
              /* @__PURE__ */ jsx(Input, { id: "name", value: name, onChange: (e) => setName(e.target.value), placeholder: "ex: Implantação de ERP" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "desc", children: "Descrição" }),
              /* @__PURE__ */ jsx(Textarea, { id: "desc", value: desc, onChange: (e) => setDesc(e.target.value), placeholder: "Breve descrição do escopo..." })
            ] })
          ] }),
          /* @__PURE__ */ jsxs(DialogFooter, { children: [
            /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setIsOpen(false), children: "Cancelar" }),
            /* @__PURE__ */ jsx(Button, { onClick: () => createProject.mutate(), disabled: createProject.isPending || !selectedOrg, children: createProject.isPending ? "Criando..." : "Criar Projeto" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row gap-4 bg-muted/20 p-4 rounded-lg border", children: [
      /* @__PURE__ */ jsxs("div", { className: "relative flex-1", children: [
        /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" }),
        /* @__PURE__ */ jsx(
          Input,
          {
            placeholder: "Buscar projetos por nome ou descrição...",
            className: "pl-9 bg-background",
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value)
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { className: "w-full sm:w-[300px]", children: /* @__PURE__ */ jsxs(Select, { value: filterOrg, onValueChange: setFilterOrg, children: [
        /* @__PURE__ */ jsx(SelectTrigger, { className: "bg-background", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 w-full overflow-hidden", children: [
          /* @__PURE__ */ jsx(Filter, { className: "h-4 w-4 text-muted-foreground shrink-0" }),
          /* @__PURE__ */ jsx("span", { className: "truncate", children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Filtrar por Secretaria" }) })
        ] }) }),
        /* @__PURE__ */ jsxs(SelectContent, { children: [
          /* @__PURE__ */ jsx(SelectItem, { value: "all", children: "Todas as Secretarias" }),
          organizations?.map((org) => /* @__PURE__ */ jsxs(SelectItem, { value: org.id, children: [
            org.code,
            " - ",
            org.name
          ] }, org.id))
        ] })
      ] }) })
    ] }),
    Object.keys(groupedProjects).length === 0 ? /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/30", children: [
      /* @__PURE__ */ jsx("div", { className: "w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(Folder, { className: "h-8 w-8 text-muted-foreground" }) }),
      /* @__PURE__ */ jsx("h3", { className: "text-xl font-semibold mb-2", children: "Nenhum projeto encontrado" }),
      /* @__PURE__ */ jsx("p", { className: "text-muted-foreground max-w-sm mb-6", children: "Você não possui projetos nesta secretaria ou ainda não criou nenhum." }),
      /* @__PURE__ */ jsx(Button, { onClick: () => setIsOpen(true), children: "Criar Projeto" })
    ] }) : /* @__PURE__ */ jsx("div", { className: "space-y-12", children: Object.entries(groupedProjects).map(([orgId, orgProjects]) => /* @__PURE__ */ jsxs("div", { className: "space-y-4 animate-in fade-in duration-500", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 border-b-2 border-primary/10 pb-2", children: [
        /* @__PURE__ */ jsx("div", { className: "p-2 bg-primary/10 rounded-lg", children: /* @__PURE__ */ jsx(Building2, { className: "h-6 w-6 text-primary" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-foreground", children: getOrgName(orgId === "personal" ? null : orgId) }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            orgProjects.length,
            " projetos ativos"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: orgProjects.map((project) => /* @__PURE__ */ jsxs(Card, { className: "group relative overflow-hidden transition-all hover:shadow-xl hover:-translate-y-1 border-border/50 bg-card h-full flex flex-col", children: [
        /* @__PURE__ */ jsx("div", { className: "absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" }),
        /* @__PURE__ */ jsxs(CardHeader, { className: "pb-2 flex-grow", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
            /* @__PURE__ */ jsx(CardTitle, { className: "text-lg font-bold group-hover:text-primary transition-colors line-clamp-2", children: project.name }),
            /* @__PURE__ */ jsx(Landmark, { className: "h-4 w-4 text-muted-foreground/50 flex-shrink-0 ml-2" })
          ] }),
          /* @__PURE__ */ jsx(CardDescription, { className: "line-clamp-3 text-sm mt-2", children: project.description })
        ] }),
        /* @__PURE__ */ jsx(CardContent, { className: "pb-2 mt-auto", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center text-xs text-muted-foreground gap-1", children: [
          /* @__PURE__ */ jsx("span", { className: "w-2 h-2 rounded-full bg-green-500 inline-block" }),
          "Ativo",
          /* @__PURE__ */ jsx("span", { className: "mx-2", children: "•" }),
          new Date(project.updatedAt).toLocaleDateString("pt-BR")
        ] }) }),
        /* @__PURE__ */ jsx(CardFooter, { className: "pt-4 border-t border-border/30 bg-muted/20", children: /* @__PURE__ */ jsx(Button, { asChild: true, variant: "ghost", className: "w-full text-xs font-semibold group-hover:text-primary transition-colors justify-between px-0 hover:bg-transparent", children: /* @__PURE__ */ jsxs("a", { href: `/projects/${project.id}`, children: [
          "Acessar Projeto ",
          /* @__PURE__ */ jsx(ArrowRight, { className: "ml-2 h-3 w-3" })
        ] }) }) })
      ] }, project.id)) })
    ] }, orgId)) })
  ] });
}

function DashboardWrapper() {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(ProjectList, {}) });
}

const $$Astro = createAstro();
const $$Index = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Index;
  const session = await auth.api.getSession({ headers: Astro2.request.headers });
  if (!session) {
    return Astro2.redirect("/login");
  }
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Dashboard - Gerenciador de Projetos" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "DashboardWrapper", DashboardWrapper, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/dashboard/wrapper", "client:component-export": "DashboardWrapper" })} ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/index.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/index.astro";
const $$url = "";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    default: $$Index,
    file: $$file,
    url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
