import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro } from '../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../chunks/DashboardLayout_otV0p937.mjs';
import { jsx, jsxs } from 'react/jsx-runtime';
import { P as Providers } from '../chunks/providers_BxSA8Tkj.mjs';
import * as React from 'react';
import { useState } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { a as api } from '../chunks/api-client_QlLf4qLC.mjs';
import { C as Card, a as CardHeader, b as CardContent, c as CardTitle } from '../chunks/card_WfUoKo13.mjs';
import { c as cn, B as Button } from '../chunks/auth-client_BChqsPJB.mjs';
import { I as Input, L as Label } from '../chunks/label_CgPqOaII.mjs';
import * as SheetPrimitive from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';
import { X, Shield, Search, Plus, Building2, MoreHorizontal, Edit, Trash, Activity, LayoutDashboard } from 'lucide-react';
import { B as Badge, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, c as DropdownMenuLabel, d as DropdownMenuItem, e as DropdownMenuSeparator } from '../chunks/badge_DVBZiYT8.mjs';
import { a as auth, d as db, u as users } from '../chunks/auth_Cw0vQzQi.mjs';
import { eq } from 'drizzle-orm';
export { renderers } from '../renderers.mjs';

const Sheet = SheetPrimitive.Root;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Overlay,
  {
    className: cn(
      "fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    ),
    ...props,
    ref
  }
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
      }
    },
    defaultVariants: {
      side: "right"
    }
  }
);
const SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [
  /* @__PURE__ */ jsx(SheetOverlay, {}),
  /* @__PURE__ */ jsxs(
    SheetPrimitive.Content,
    {
      ref,
      className: cn(sheetVariants({ side }), className),
      ...props,
      children: [
        /* @__PURE__ */ jsxs(SheetPrimitive.Close, { className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary", children: [
          /* @__PURE__ */ jsx(X, { className: "h-4 w-4" }),
          /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Close" })
        ] }),
        children
      ]
    }
  )
] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetHeader = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    ),
    ...props
  }
);
SheetHeader.displayName = "SheetHeader";
const SheetFooter = ({
  className,
  ...props
}) => /* @__PURE__ */ jsx(
  "div",
  {
    className: cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    ),
    ...props
  }
);
SheetFooter.displayName = "SheetFooter";
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Title,
  {
    ref,
    className: cn("text-lg font-semibold text-foreground", className),
    ...props
  }
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  SheetPrimitive.Description,
  {
    ref,
    className: cn("text-sm text-muted-foreground", className),
    ...props
  }
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;

function OrgManager() {
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [secretario, setSecretario] = useState("");
  const [secretariaAdjunta, setSecretariaAdjunta] = useState("");
  const [diretoriaTecnica, setDiretoriaTecnica] = useState("");
  const { data: organizations, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.organizations.$get();
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    }
  });
  const createOrg = useMutation({
    mutationFn: async () => {
      const res = await api.organizations.$post({
        json: { name, code, secretario, secretariaAdjunta, diretoriaTecnica }
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      resetForm();
    }
  });
  const updateOrg = useMutation({
    mutationFn: async (vars) => {
      const res = await api.organizations[":id"].$put({
        param: { id: vars.id },
        json: {
          name: vars.name,
          code: vars.code,
          secretario: vars.secretario,
          secretariaAdjunta: vars.secretariaAdjunta,
          diretoriaTecnica: vars.diretoriaTecnica
        }
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      resetForm();
    }
  });
  function resetForm() {
    setIsSheetOpen(false);
    setEditingId(null);
    setName("");
    setCode("");
    setSecretario("");
    setSecretariaAdjunta("");
    setDiretoriaTecnica("");
  }
  function handleEdit(org) {
    setEditingId(org.id);
    setName(org.name);
    setCode(org.code);
    setSecretario(org.secretario || "");
    setSecretariaAdjunta(org.secretariaAdjunta || "");
    setDiretoriaTecnica(org.diretoriaTecnica || "");
    setIsSheetOpen(true);
  }
  function handleCreate() {
    setEditingId(null);
    setName("");
    setCode("");
    setSecretario("");
    setSecretariaAdjunta("");
    setDiretoriaTecnica("");
    setIsSheetOpen(true);
  }
  const filteredOrgs = organizations?.filter(
    (org) => org.name.toLowerCase().includes(searchTerm.toLowerCase()) || org.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (isLoading) return /* @__PURE__ */ jsx("div", { children: "Carregando..." });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8 max-w-7xl mx-auto p-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pb-6 border-b border-slate-200", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsxs("h2", { className: "text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 bg-blue-100 rounded-lg", children: /* @__PURE__ */ jsx(Shield, { className: "h-6 w-6 text-blue-700" }) }),
          "Gestão de Secretarias"
        ] }),
        /* @__PURE__ */ jsx("p", { className: "text-slate-500 mt-2 max-w-lg", children: "Gerencie as unidades orçamentárias e configure permissões de acesso." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 w-full sm:w-auto", children: [
        /* @__PURE__ */ jsxs("div", { className: "relative w-full sm:w-64", children: [
          /* @__PURE__ */ jsx(Search, { className: "absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" }),
          /* @__PURE__ */ jsx(
            Input,
            {
              placeholder: "Buscar secretaria...",
              className: "pl-9 bg-white border-slate-200",
              value: searchTerm,
              onChange: (e) => setSearchTerm(e.target.value)
            }
          )
        ] }),
        /* @__PURE__ */ jsxs(Sheet, { open: isSheetOpen, onOpenChange: setIsSheetOpen, children: [
          /* @__PURE__ */ jsxs(Button, { onClick: handleCreate, className: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm", children: [
            /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
            " Nova Secretaria"
          ] }),
          /* @__PURE__ */ jsxs(SheetContent, { children: [
            /* @__PURE__ */ jsxs(SheetHeader, { children: [
              /* @__PURE__ */ jsx(SheetTitle, { children: editingId ? "Editar Secretaria" : "Nova Secretaria" }),
              /* @__PURE__ */ jsx(SheetDescription, { children: editingId ? "Atualize os dados da unidade orçamentária abaixo." : "Preencha os dados para cadastrar uma nova unidade orçamentária." })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "space-y-6 py-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Nome da Secretaria" }),
                /* @__PURE__ */ jsx(Input, { id: "name", value: name, onChange: (e) => setName(e.target.value), placeholder: "Ex: Secretaria de Saúde" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "code", children: "Sigla / Código" }),
                /* @__PURE__ */ jsx(Input, { id: "code", value: code, onChange: (e) => setCode(e.target.value), placeholder: "Ex: SMS" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "secretario", children: "Secretário(a)" }),
                /* @__PURE__ */ jsx(Input, { id: "secretario", value: secretario, onChange: (e) => setSecretario(e.target.value), placeholder: "Nome do Secretário(a)" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "secretariaAdjunta", children: "Secretário(a) Adjunto(a)" }),
                /* @__PURE__ */ jsx(Input, { id: "secretariaAdjunta", value: secretariaAdjunta, onChange: (e) => setSecretariaAdjunta(e.target.value), placeholder: "Nome do Secretário(a) Adjunto(a)" })
              ] }),
              /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                /* @__PURE__ */ jsx(Label, { htmlFor: "diretoriaTecnica", children: "Diretor(a) Técnico(a)" }),
                /* @__PURE__ */ jsx(Input, { id: "diretoriaTecnica", value: diretoriaTecnica, onChange: (e) => setDiretoriaTecnica(e.target.value), placeholder: "Nome do Diretor(a) Técnico(a)" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs(SheetFooter, { children: [
              /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setIsSheetOpen(false), children: "Cancelar" }),
              /* @__PURE__ */ jsx(
                Button,
                {
                  onClick: () => editingId ? updateOrg.mutate({ id: editingId, name, code, secretario, secretariaAdjunta, diretoriaTecnica }) : createOrg.mutate(),
                  disabled: createOrg.isPending || updateOrg.isPending,
                  className: "bg-blue-600 hover:bg-blue-700 text-white",
                  children: createOrg.isPending || updateOrg.isPending ? "Salvando..." : editingId ? "Salvar Alterações" : "Criar Secretaria"
                }
              )
            ] })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredOrgs?.map((org) => /* @__PURE__ */ jsxs(Card, { className: "group hover:shadow-lg transition-all duration-300 border-slate-200 bg-white", children: [
      /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center justify-between space-y-0 pb-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ jsx("div", { className: "h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100", children: /* @__PURE__ */ jsx(Building2, { className: "h-5 w-5 text-slate-400" }) }),
          /* @__PURE__ */ jsx("div", { children: /* @__PURE__ */ jsx(Badge, { variant: "secondary", className: "bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium", children: org.code }) })
        ] }),
        /* @__PURE__ */ jsxs(DropdownMenu, { children: [
          /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "ghost", className: "h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity", children: [
            /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Open menu" }),
            /* @__PURE__ */ jsx(MoreHorizontal, { className: "h-4 w-4 text-slate-400" })
          ] }) }),
          /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
            /* @__PURE__ */ jsx(DropdownMenuLabel, { children: "Ações" }),
            /* @__PURE__ */ jsxs(DropdownMenuItem, { onClick: () => handleEdit(org), children: [
              /* @__PURE__ */ jsx(Edit, { className: "mr-2 h-4 w-4" }),
              " Editar"
            ] }),
            /* @__PURE__ */ jsx(DropdownMenuSeparator, {}),
            /* @__PURE__ */ jsxs(DropdownMenuItem, { className: "text-red-600", children: [
              /* @__PURE__ */ jsx(Trash, { className: "mr-2 h-4 w-4" }),
              " Excluir"
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(CardContent, { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-lg font-bold text-slate-900 line-clamp-2 min-h-[3.5rem] mb-2", children: org.name }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-slate-400 font-mono", children: [
          "ID: ",
          org.id.slice(0, 8),
          "..."
        ] })
      ] })
    ] }, org.id)) }),
    filteredOrgs?.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12", children: [
      /* @__PURE__ */ jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4", children: /* @__PURE__ */ jsx(Building2, { className: "h-8 w-8 text-slate-400" }) }),
      /* @__PURE__ */ jsx("h3", { className: "text-lg font-medium text-slate-900", children: "Nenhuma secretaria encontrada" }),
      /* @__PURE__ */ jsx("p", { className: "text-slate-500 mt-1", children: "Tente buscar por outro termo ou adicione uma nova." })
    ] })
  ] });
}

const Table = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsx(
  "table",
  {
    ref,
    className: cn("w-full caption-bottom text-sm", className),
    ...props
  }
) }));
Table.displayName = "Table";
const TableHeader = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx("thead", { ref, className: cn("[&_tr]:border-b", className), ...props }));
TableHeader.displayName = "TableHeader";
const TableBody = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tbody",
  {
    ref,
    className: cn("[&_tr:last-child]:border-0", className),
    ...props
  }
));
TableBody.displayName = "TableBody";
const TableFooter = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tfoot",
  {
    ref,
    className: cn(
      "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0",
      className
    ),
    ...props
  }
));
TableFooter.displayName = "TableFooter";
const TableRow = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "tr",
  {
    ref,
    className: cn(
      "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
      className
    ),
    ...props
  }
));
TableRow.displayName = "TableRow";
const TableHead = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "th",
  {
    ref,
    className: cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
const TableCell = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "td",
  {
    ref,
    className: cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className),
    ...props
  }
));
TableCell.displayName = "TableCell";
const TableCaption = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  "caption",
  {
    ref,
    className: cn("mt-4 text-sm text-muted-foreground", className),
    ...props
  }
));
TableCaption.displayName = "TableCaption";

function AuditLogsViewer() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await api.admin["audit-logs"].$get();
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    }
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { className: "p-4 text-center", children: "Carregando auditoria..." });
  return /* @__PURE__ */ jsxs(Card, { children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "flex flex-row items-center gap-2", children: [
      /* @__PURE__ */ jsx(Activity, { className: "w-5 h-5 text-primary" }),
      /* @__PURE__ */ jsx(CardTitle, { children: "Logs de Auditoria" })
    ] }),
    /* @__PURE__ */ jsx(CardContent, { children: /* @__PURE__ */ jsxs(Table, { children: [
      /* @__PURE__ */ jsx(TableHeader, { children: /* @__PURE__ */ jsxs(TableRow, { children: [
        /* @__PURE__ */ jsx(TableHead, { children: "Data/Hora" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Usuário" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Ação" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Recurso" }),
        /* @__PURE__ */ jsx(TableHead, { children: "Detalhes" })
      ] }) }),
      /* @__PURE__ */ jsx(TableBody, { children: logs?.map((log) => /* @__PURE__ */ jsxs(TableRow, { className: "text-xs", children: [
        /* @__PURE__ */ jsx(TableCell, { children: new Date(log.createdAt).toLocaleString("pt-BR") }),
        /* @__PURE__ */ jsxs(TableCell, { children: [
          /* @__PURE__ */ jsx("div", { className: "font-medium", children: log.userName }),
          /* @__PURE__ */ jsx("div", { className: "text-muted-foreground", children: log.userEmail })
        ] }),
        /* @__PURE__ */ jsx(TableCell, { children: /* @__PURE__ */ jsx("span", { className: `px-2 py-1 rounded-full text-[10px] font-bold ${log.action === "CREATE" ? "bg-green-100 text-green-700" : log.action === "DELETE" ? "bg-red-100 text-red-700" : log.action === "UPDATE" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"}`, children: log.action }) }),
        /* @__PURE__ */ jsx(TableCell, { children: log.resource }),
        /* @__PURE__ */ jsx(TableCell, { className: "max-w-[200px] truncate", title: log.metadata || "", children: log.metadata ? JSON.stringify(JSON.parse(log.metadata), null, 0) : "-" })
      ] }, log.id)) })
    ] }) })
  ] });
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("orgs");
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-muted p-1 rounded-lg w-max", children: [
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: activeTab === "orgs" ? "default" : "ghost",
          size: "sm",
          onClick: () => setActiveTab("orgs"),
          className: "gap-2",
          children: [
            /* @__PURE__ */ jsx(LayoutDashboard, { className: "w-4 h-4" }),
            "Secretarias"
          ]
        }
      ),
      /* @__PURE__ */ jsxs(
        Button,
        {
          variant: activeTab === "audit" ? "default" : "ghost",
          size: "sm",
          onClick: () => setActiveTab("audit"),
          className: "gap-2",
          children: [
            /* @__PURE__ */ jsx(Activity, { className: "w-4 h-4" }),
            "Auditoria"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsx("div", { className: "animate-in fade-in slide-in-from-bottom-2 duration-300", children: activeTab === "orgs" ? /* @__PURE__ */ jsx(OrgManager, {}) : /* @__PURE__ */ jsx(AuditLogsViewer, {}) })
  ] }) });
}

const $$Astro = createAstro();
const $$Admin = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$Admin;
  const session = await auth.api.getSession({ headers: Astro2.request.headers });
  if (!session) {
    return Astro2.redirect("/login");
  }
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (user?.globalRole !== "super_admin") {
    return Astro2.redirect("/");
  }
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Admin - Gest\xE3o de Secretarias" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "AdminDashboard", AdminDashboard, { "client:load": true, "client:component-hydration": "load", "client:component-path": "@/components/admin/dashboard", "client:component-export": "AdminDashboard" })} ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/admin.astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/admin.astro";
const $$url = "/admin";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$Admin,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
