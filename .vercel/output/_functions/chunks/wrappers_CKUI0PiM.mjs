import { jsxs, jsx } from 'react/jsx-runtime';
import { P as Providers } from './providers_BxSA8Tkj.mjs';
import { useState } from 'react';
import { B as Button, a as authClient } from './auth-client_BChqsPJB.mjs';
import { L as Label, I as Input } from './label_CgPqOaII.mjs';
import './card_WfUoKo13.mjs';
import { Loader2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const signIn = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    await authClient.signIn.email({
      email,
      password
    }, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (ctx) => {
        setError(ctx.error.message);
        toast.error("Erro ao entrar", {
          description: ctx.error.message || "Verifique suas credenciais e tente novamente."
        });
        setLoading(false);
      }
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Acesso ao Sistema" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Entre com suas credenciais institucionais" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: signIn, className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "E-mail Institucional" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "email",
              type: "email",
              placeholder: "usuario@cuiaba.mt.gov.br",
              className: "pl-10 h-11",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              disabled: loading,
              required: true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-3 text-muted-foreground", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }),
            /* @__PURE__ */ jsx("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Senha" }),
          /* @__PURE__ */ jsx("a", { href: "#", className: "text-xs text-primary hover:underline font-medium", children: "Esqueceu?" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password",
              type: "password",
              className: "pl-10 h-11",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              disabled: loading,
              required: true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-3 text-muted-foreground", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }),
            /* @__PURE__ */ jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
          ] }) })
        ] })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "p-3 text-sm text-red-500 bg-red-50 rounded-md flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
          /* @__PURE__ */ jsx("line", { x1: "12", x2: "12", y1: "8", y2: "12" }),
          /* @__PURE__ */ jsx("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })
        ] }),
        error
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full h-11 text-base shadow-lg shadow-primary/20", disabled: loading, children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Entrar"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "text-center text-sm", children: [
      "Não possui acesso?",
      " ",
      /* @__PURE__ */ jsx("a", { href: "/register", className: "text-primary font-semibold hover:underline", children: "Solicitar Cadastro" })
    ] })
  ] });
}

function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const signUp = async (e) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    await authClient.signUp.email({
      email,
      password,
      name
    }, {
      onSuccess: () => {
        window.location.href = "/";
      },
      onError: (ctx) => {
        setError(ctx.error.message);
        setLoading(false);
      }
    });
  };
  return /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
    /* @__PURE__ */ jsxs("div", { className: "space-y-2 text-center", children: [
      /* @__PURE__ */ jsx("h1", { className: "text-2xl font-bold tracking-tight text-foreground", children: "Novo Cadastro" }),
      /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Crie sua credencial de acesso" })
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: signUp, className: "space-y-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Nome Completo" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "name",
              type: "text",
              placeholder: "João Silva",
              className: "pl-10 h-11",
              value: name,
              onChange: (e) => setName(e.target.value),
              disabled: loading,
              required: true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-3 text-muted-foreground", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" }),
            /* @__PURE__ */ jsx("circle", { cx: "12", cy: "7", r: "4" })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "E-mail" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "email",
              type: "email",
              placeholder: "nome@empresa.com",
              className: "pl-10 h-11",
              value: email,
              onChange: (e) => setEmail(e.target.value),
              disabled: loading,
              required: true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-3 text-muted-foreground", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("rect", { width: "20", height: "16", x: "2", y: "4", rx: "2" }),
            /* @__PURE__ */ jsx("path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
        /* @__PURE__ */ jsx(Label, { htmlFor: "password", children: "Senha" }),
        /* @__PURE__ */ jsxs("div", { className: "relative", children: [
          /* @__PURE__ */ jsx(
            Input,
            {
              id: "password",
              type: "password",
              className: "pl-10 h-11",
              value: password,
              onChange: (e) => setPassword(e.target.value),
              disabled: loading,
              required: true
            }
          ),
          /* @__PURE__ */ jsx("div", { className: "absolute left-3 top-3 text-muted-foreground", children: /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("rect", { width: "18", height: "11", x: "3", y: "11", rx: "2", ry: "2" }),
            /* @__PURE__ */ jsx("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })
          ] }) })
        ] })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "p-3 text-sm text-red-500 bg-red-50 rounded-md flex items-center gap-2", children: [
        /* @__PURE__ */ jsxs("svg", { xmlns: "http://www.w3.org/2000/svg", width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
          /* @__PURE__ */ jsx("line", { x1: "12", x2: "12", y1: "8", y2: "12" }),
          /* @__PURE__ */ jsx("line", { x1: "12", x2: "12.01", y1: "16", y2: "16" })
        ] }),
        error
      ] }),
      /* @__PURE__ */ jsxs(Button, { type: "submit", className: "w-full h-11 text-base shadow-lg shadow-primary/20", disabled: loading, children: [
        loading && /* @__PURE__ */ jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }),
        "Criar Conta"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "text-center text-sm", children: [
      "Já tem cadastro?",
      " ",
      /* @__PURE__ */ jsx("a", { href: "/login", className: "text-primary font-semibold hover:underline", children: "Entrar" })
    ] })
  ] });
}

function AuthLayout({ children, title }) {
  return /* @__PURE__ */ jsxs("div", { className: "min-h-screen bg-muted/20 flex flex-col", children: [
    /* @__PURE__ */ jsxs("header", { className: "bg-brand-gradient text-white shadow-md relative overflow-hidden", children: [
      /* @__PURE__ */ jsx("div", { className: "absolute inset-0 bg-[url('/brasao-cuiaba.png')] opacity-10 bg-center bg-no-repeat bg-contain transform scale-150 pointer-events-none" }),
      /* @__PURE__ */ jsxs("div", { className: "container mx-auto px-4 py-4 flex items-center gap-3 relative z-10", children: [
        /* @__PURE__ */ jsx("div", { className: "bg-white/10 p-2 rounded-lg backdrop-blur-sm", children: /* @__PURE__ */ jsx(Building2, { className: "w-8 h-8 text-secondary" }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("h1", { className: "text-xl font-bold leading-none tracking-tight", children: "Prefeitura de Cuiabá" }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-secondary font-medium tracking-wide border-t border-white/20 mt-1 pt-1 inline-block", children: "Sistema de Governança de Projetos" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "absolute bottom-0 left-0 w-full h-1 bg-brand-stripe" })
    ] }),
    /* @__PURE__ */ jsx("main", { className: "flex-1 flex flex-col items-center justify-center p-4 sm:p-8", children: /* @__PURE__ */ jsxs("div", { className: "w-full max-w-md space-y-6", children: [
      title && /* @__PURE__ */ jsxs("div", { className: "text-center space-y-2", children: [
        /* @__PURE__ */ jsx("h2", { className: "text-2xl font-bold tracking-tight text-brand-dark", children: title }),
        /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground", children: "Acesse sua conta governamental" })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "bg-white rounded-xl shadow-xl border border-border/50 overflow-hidden relative", children: [
        /* @__PURE__ */ jsx("div", { className: "h-1 w-full bg-brand-gradient absolute top-0 left-0" }),
        /* @__PURE__ */ jsx("div", { className: "p-6 sm:p-8", children })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "text-center text-xs text-muted-foreground", children: "© 2026 Secretaria Municipal de Planejamento (SMPO)" })
    ] }) })
  ] });
}

function SignInPage() {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(AuthLayout, { title: "Login", children: /* @__PURE__ */ jsx(SignIn, {}) }) });
}
function SignUpPage() {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(AuthLayout, { title: "Cadastro", children: /* @__PURE__ */ jsx(SignUp, {}) }) });
}

export { SignInPage as S, SignUpPage as a };
