import { jsx, jsxs } from 'react/jsx-runtime';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster as Toaster$1 } from 'sonner';

function Toaster({ ...props }) {
  return /* @__PURE__ */ jsx(
    Toaster$1,
    {
      theme: "system",
      className: "toaster group",
      toastOptions: {
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
        }
      },
      ...props
    }
  );
}

function Providers({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  return /* @__PURE__ */ jsxs(QueryClientProvider, { client: queryClient, children: [
    children,
    /* @__PURE__ */ jsx(Toaster, {})
  ] });
}

export { Providers as P };
