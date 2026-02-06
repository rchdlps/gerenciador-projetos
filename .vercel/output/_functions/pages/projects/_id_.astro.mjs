import { e as createComponent, k as renderComponent, r as renderTemplate, h as createAstro } from '../../chunks/astro/server_CxIlnfDj.mjs';
import 'piccolore';
import { $ as $$DashboardLayout } from '../../chunks/DashboardLayout_otV0p937.mjs';
import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
import { P as Providers } from '../../chunks/providers_BxSA8Tkj.mjs';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { a as api } from '../../chunks/api-client_QlLf4qLC.mjs';
import { c as cn, B as Button, f as formatBytes } from '../../chunks/auth-client_BChqsPJB.mjs';
import { ChevronUp, ChevronDown, Users, Plus, Pencil, Trash, GripVertical, Upload, FileIcon, Eye, Download, Trash2, Calendar, MoreVertical, AlertTriangle, Loader2, Building2, User, UserCheck, Activity, Layout, CheckCircle2, ArrowLeft, BookOpen, LayoutList, KanbanSquare } from 'lucide-react';
import * as React from 'react';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { C as Card, a as CardHeader, c as CardTitle, b as CardContent } from '../../chunks/card_WfUoKo13.mjs';
import { L as Label, I as Input } from '../../chunks/label_CgPqOaII.mjs';
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle, e as DialogFooter, f as DialogDescription } from '../../chunks/dialog_Dk6F9O1c.mjs';
import { S as Select, a as SelectTrigger, b as SelectValue, c as SelectContent, d as SelectItem } from '../../chunks/select_-SV5s6Gs.mjs';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { B as Badge, D as DropdownMenu, a as DropdownMenuTrigger, b as DropdownMenuContent, d as DropdownMenuItem } from '../../chunks/badge_DVBZiYT8.mjs';
import { createPortal } from 'react-dom';
import { useSensors, useSensor, PointerSensor, KeyboardSensor, DndContext, pointerWithin, DragOverlay, useDroppable, closestCorners } from '@dnd-kit/core';
import { sortableKeyboardCoordinates, SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { T as Textarea } from '../../chunks/textarea_7OXsxx7K.mjs';
import { toast } from 'sonner';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { useDropzone } from 'react-dropzone';
import * as SeparatorPrimitive from '@radix-ui/react-separator';
import { a as auth } from '../../chunks/auth_Cw0vQzQi.mjs';
export { renderers } from '../../renderers.mjs';

const Avatar = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Root,
  {
    ref,
    className: cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className
    ),
    ...props
  }
));
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Image,
  {
    ref,
    className: cn("aspect-square h-full w-full", className),
    ...props
  }
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AvatarPrimitive.Fallback,
  {
    ref,
    className: cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className
    ),
    ...props
  }
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

function Stakeholders({ projectId }) {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", role: "", level: "interessado", email: "" });
  const [activeId, setActiveId] = useState(null);
  const { data: stakeholders, isLoading } = useQuery({
    queryKey: ["stakeholders", projectId],
    queryFn: async () => {
      const res = await api.stakeholders[":projectId"].$get({
        param: { projectId }
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  const createStakeholder = useMutation({
    mutationFn: async () => {
      const res = await api.stakeholders[":projectId"].$post({
        param: { projectId },
        json: newItem
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders", projectId] });
      closeDialog();
    }
  });
  const updateStakeholder = useMutation({
    mutationFn: async () => {
      if (!activeId) return;
      const res = await api.stakeholders[":id"].$put({
        param: { id: activeId },
        json: newItem
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders", projectId] });
      closeDialog();
    }
  });
  const deleteStakeholder = useMutation({
    mutationFn: async (id) => {
      await api.stakeholders[":id"].$delete({ param: { id } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stakeholders", projectId] });
    }
  });
  const openCreateDialog = () => {
    setNewItem({ name: "", role: "", level: "interessado", email: "" });
    setActiveId(null);
    setIsDialogOpen(true);
  };
  const openEditDialog = (stakeholder) => {
    setNewItem({
      name: stakeholder.name,
      role: stakeholder.role,
      level: stakeholder.level,
      email: stakeholder.email || ""
    });
    setActiveId(stakeholder.id);
    setIsDialogOpen(true);
  };
  const closeDialog = () => {
    setIsDialogOpen(false);
    setNewItem({ name: "", role: "", level: "interessado", email: "" });
    setActiveId(null);
  };
  const handleSave = () => {
    if (activeId) {
      updateStakeholder.mutate();
    } else {
      createStakeholder.mutate();
    }
  };
  const getLevelBadge = (level) => {
    const styles = {
      patrocinador: "bg-emerald-100 text-emerald-800",
      gerente: "bg-blue-100 text-blue-800",
      equipe: "bg-yellow-100 text-yellow-800",
      interessado: "bg-red-100 text-red-800"
    };
    return styles[level] || "bg-gray-100";
  };
  if (isLoading) return /* @__PURE__ */ jsx("div", { children: "Loading..." });
  return /* @__PURE__ */ jsxs(Card, { className: "border shadow-none", children: [
    /* @__PURE__ */ jsxs(CardHeader, { className: "bg-primary text-primary-foreground rounded-t-lg items-center flex-row justify-between py-4", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 cursor-pointer", onClick: () => setIsOpen(!isOpen), children: [
        isOpen ? /* @__PURE__ */ jsx(ChevronUp, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(ChevronDown, { className: "h-5 w-5" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx(Users, { className: "h-5 w-5" }),
          /* @__PURE__ */ jsx(CardTitle, { className: "text-lg", children: "Partes Interessadas" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(Dialog, { open: isDialogOpen, onOpenChange: setIsDialogOpen, children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { variant: "secondary", size: "sm", className: "font-semibold shadow-none", onClick: openCreateDialog, children: [
          /* @__PURE__ */ jsx(Plus, { className: "h-4 w-4 mr-1" }),
          " Adicionar"
        ] }) }),
        /* @__PURE__ */ jsxs(DialogContent, { children: [
          /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: activeId ? "Editar Parte Interessada" : "Nova Parte Interessada" }) }),
          /* @__PURE__ */ jsxs("div", { className: "grid gap-4 py-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Nome" }),
              /* @__PURE__ */ jsx(Input, { id: "name", value: newItem.name, onChange: (e) => setNewItem({ ...newItem, name: e.target.value }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "role", children: "Papel / Cargo" }),
              /* @__PURE__ */ jsx(Input, { id: "role", value: newItem.role, onChange: (e) => setNewItem({ ...newItem, role: e.target.value }) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "level", children: "Nível de Envolvimento" }),
              /* @__PURE__ */ jsxs(Select, { value: newItem.level, onValueChange: (val) => setNewItem({ ...newItem, level: val }), children: [
                /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
                /* @__PURE__ */ jsxs(SelectContent, { children: [
                  /* @__PURE__ */ jsx(SelectItem, { value: "patrocinador", children: "Patrocinador" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "gerente", children: "Gerente" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "equipe", children: "Equipe" }),
                  /* @__PURE__ */ jsx(SelectItem, { value: "interessado", children: "Interessado" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
              /* @__PURE__ */ jsx(Label, { htmlFor: "email", children: "Email" }),
              /* @__PURE__ */ jsx(Input, { id: "email", value: newItem.email, onChange: (e) => setNewItem({ ...newItem, email: e.target.value }) })
            ] })
          ] }),
          /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { onClick: handleSave, children: "Salvar" }) })
        ] })
      ] })
    ] }),
    isOpen && /* @__PURE__ */ jsx(CardContent, { className: "p-6", children: !stakeholders || stakeholders.length === 0 ? /* @__PURE__ */ jsxs("div", { className: "text-center py-8 text-muted-foreground", children: [
      /* @__PURE__ */ jsx(Users, { className: "h-10 w-10 mx-auto mb-2 opacity-20" }),
      /* @__PURE__ */ jsx("p", { children: "Nenhuma parte interessada cadastrada." })
    ] }) : /* @__PURE__ */ jsx("div", { className: "grid gap-4", children: stakeholders.map((s) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between p-4 border rounded-lg bg-card hover:border-primary transition-all", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(Avatar, { children: /* @__PURE__ */ jsx(AvatarFallback, { className: "bg-primary text-white font-bold", children: s.name.substring(0, 2).toUpperCase() }) }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { className: "font-semibold text-sm", children: s.name }),
          /* @__PURE__ */ jsx("p", { className: "text-xs text-muted-foreground", children: s.role })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4", children: [
        /* @__PURE__ */ jsx(Badge, { variant: "outline", className: `border-0 uppercase text-[10px] ${getLevelBadge(s.level)}`, children: s.level }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center border rounded-md", children: [
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => openEditDialog(s), className: "h-8 w-8 text-muted-foreground hover:text-primary", children: /* @__PURE__ */ jsx(Pencil, { className: "h-3.5 w-3.5" }) }),
          /* @__PURE__ */ jsx("div", { className: "w-px h-4 bg-border" }),
          /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", onClick: () => deleteStakeholder.mutate(s.id), className: "h-8 w-8 text-muted-foreground hover:text-destructive", children: /* @__PURE__ */ jsx(Trash, { className: "h-3.5 w-3.5" }) })
        ] })
      ] })
    ] }, s.id)) }) })
  ] });
}

function ScrumbanBoard({ projectId }) {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const { data: serverColumns = [], isLoading } = useQuery({
    queryKey: ["board", projectId],
    queryFn: async () => {
      const res = await api.board[":projectId"].$get({ param: { projectId } });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  const reorderTasks = useMutation({
    mutationFn: async (items) => {
      await api.board.reorder.$patch({
        json: { items }
      });
    },
    onMutate: async (newItems) => {
      await queryClient.cancelQueries({ queryKey: ["board", projectId] });
      const previousBoard = queryClient.getQueryData(["board", projectId]);
      queryClient.setQueryData(["board", projectId], (old = []) => {
        const newColumns = old.map((col) => ({
          ...col,
          cards: [...col.cards]
          // shallow copy
        }));
        newItems.forEach((item) => {
          newColumns.forEach((c) => {
            c.cards = c.cards.filter((card) => card.id !== item.id);
          });
        });
        newItems.forEach((item) => {
          newColumns.find((c) => c.id === item.status);
        });
        return newColumns;
      });
      return { previousBoard };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(["board", projectId], context?.previousBoard);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board", projectId] });
    }
  });
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    for (const col of serverColumns) {
      const card = col.cards.find((c) => c.id === active.id);
      if (card) {
        setActiveCard(card);
        return;
      }
    }
  };
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId2 = String(active.id);
    const overId = String(over.id);
    const sourceColumn = serverColumns.find((col) => col.cards.some((c) => c.id === activeId2));
    const destColumn = serverColumns.find((col) => col.id === overId) || serverColumns.find((col) => col.cards.some((c) => c.id === overId));
    if (!sourceColumn || !destColumn) return;
    if (sourceColumn.id === destColumn.id) return;
    queryClient.setQueryData(["board", projectId], (old = []) => {
      const newColumns = JSON.parse(JSON.stringify(old));
      const sourceColIdx = newColumns.findIndex((c) => c.id === sourceColumn.id);
      const destColIdx = newColumns.findIndex((c) => c.id === destColumn.id);
      const sourceCards = newColumns[sourceColIdx].cards;
      const destCards = newColumns[destColIdx].cards;
      const oldIndex = sourceCards.findIndex((c) => c.id === activeId2);
      const cardToMove = sourceCards[oldIndex];
      sourceCards.splice(oldIndex, 1);
      let newIndex;
      if (destColumn.id === overId) {
        newIndex = destCards.length;
      } else {
        const overIndex = destCards.findIndex((c) => c.id === overId);
        const isBelow = over && active.rect.current.translated && active.rect.current.translated.top > over.rect.top + over.rect.height;
        const modifier = isBelow ? 1 : 0;
        newIndex = overIndex >= 0 ? overIndex + modifier : destCards.length;
      }
      cardToMove.status = destColumn.id;
      destCards.splice(newIndex, 0, cardToMove);
      return newColumns;
    });
  };
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveCard(null);
    if (!over) return;
    const activeId2 = String(active.id);
    const overId = String(over.id);
    const currentColumns = queryClient.getQueryData(["board", projectId]) || [];
    const sourceColumn = currentColumns.find((col) => col.cards.some((c) => c.id === activeId2));
    const destColumn = currentColumns.find((col) => col.id === overId) || currentColumns.find((col) => col.cards.some((c) => c.id === overId));
    if (!sourceColumn || !destColumn) return;
    const newColumns = JSON.parse(JSON.stringify(currentColumns));
    const sourceColIdx = newColumns.findIndex((c) => c.id === sourceColumn.id);
    const destColIdx = newColumns.findIndex((c) => c.id === destColumn.id);
    const sourceCards = newColumns[sourceColIdx].cards;
    const destCards = newColumns[destColIdx].cards;
    const oldIndex = sourceCards.findIndex((c) => c.id === activeId2);
    const cardToMove = sourceCards[oldIndex];
    if (sourceColumn.id === destColumn.id) {
      const overIndex = destCards.findIndex((c) => c.id === overId);
      if (oldIndex !== overIndex && overIndex !== -1) {
        const [removed] = destCards.splice(oldIndex, 1);
        destCards.splice(overIndex, 0, removed);
        queryClient.setQueryData(["board", projectId], newColumns);
      }
    } else {
      sourceCards.splice(oldIndex, 1);
      let newIndex;
      if (destColumn.id === overId) {
        newIndex = destCards.length;
      } else {
        const overIndex = destCards.findIndex((c) => c.id === overId);
        newIndex = overIndex >= 0 ? overIndex : destCards.length;
      }
      cardToMove.status = destColumn.id;
      destCards.splice(newIndex, 0, cardToMove);
      queryClient.setQueryData(["board", projectId], newColumns);
    }
    const updates = [];
    const columnsToUpdate = /* @__PURE__ */ new Set([sourceColumn.id, destColumn.id]);
    newColumns.forEach((col) => {
      if (columnsToUpdate.has(col.id)) {
        col.cards.forEach((card, index) => {
          updates.push({
            id: card.id,
            status: col.id,
            order: index
          });
        });
      }
    });
    await reorderTasks.mutateAsync(updates);
  };
  if (isLoading) return /* @__PURE__ */ jsx("div", { children: "Carregando Quadro..." });
  return /* @__PURE__ */ jsxs("div", { className: "space-y-4 py-6", children: [
    /* @__PURE__ */ jsx("div", { className: "flex items-center justify-between", children: /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-foreground", children: "Quadro Scrumban" }) }),
    /* @__PURE__ */ jsxs(
      DndContext,
      {
        sensors,
        collisionDetection: pointerWithin,
        onDragStart: handleDragStart,
        onDragOver: handleDragOver,
        onDragEnd: handleDragEnd,
        children: [
          /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pb-6 min-h-[500px]", children: serverColumns.map((col) => /* @__PURE__ */ jsx(BoardColumn, { column: col }, col.id)) }),
          typeof document !== "undefined" && createPortal(
            /* @__PURE__ */ jsx(DragOverlay, { children: activeCard ? /* @__PURE__ */ jsx("div", { className: "bg-card p-3 rounded-lg shadow-xl border-2 border-primary rotate-2 w-80 opacity-90 cursor-grabbing z-[9999]", children: /* @__PURE__ */ jsx("div", { className: "flex justify-between items-start mb-2", children: /* @__PURE__ */ jsx("span", { className: "text-sm font-medium text-foreground", children: activeCard.title || activeCard.content }) }) }) : null }),
            document.body
          )
        ]
      }
    )
  ] });
}
function BoardColumn({ column }) {
  const { setNodeRef } = useDroppable({ id: column.id });
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ref: setNodeRef,
      className: "flex flex-col h-full bg-muted/30 rounded-xl border max-h-[700px]",
      children: [
        /* @__PURE__ */ jsxs("div", { className: `p-4 font-bold border-b rounded-t-xl bg-muted/50 sticky top-0 flex justify-between items-center ${column.id === "done" ? "text-green-700 dark:text-green-400" : "text-foreground"}`, children: [
          column.name,
          /* @__PURE__ */ jsx("span", { className: "text-xs bg-background border px-2 py-0.5 rounded-full text-muted-foreground", children: column.cards.length })
        ] }),
        /* @__PURE__ */ jsx(SortableContext, { items: column.cards.map((c) => c.id), strategy: verticalListSortingStrategy, children: /* @__PURE__ */ jsxs("div", { className: "p-3 flex-1 overflow-y-auto space-y-3", id: column.id, children: [
          column.cards.map((card) => /* @__PURE__ */ jsx(SortableCard, { card }, card.id)),
          column.cards.length === 0 && /* @__PURE__ */ jsx("div", { className: "h-20 flex items-center justify-center text-xs text-muted-foreground border-2 border-dashed rounded opacity-50", children: "Arraste tarefas aqui" })
        ] }) })
      ]
    }
  );
}
function SortableCard({ card }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };
  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };
  return /* @__PURE__ */ jsxs("div", { ref: setNodeRef, style, ...attributes, ...listeners, className: "bg-card p-3 rounded-lg shadow-sm border hover:border-primary cursor-grab group relative transition-all hover:shadow-md", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start mb-2", children: [
      /* @__PURE__ */ jsx("p", { className: "text-sm font-medium text-foreground line-clamp-2", children: card.title || card.content }),
      /* @__PURE__ */ jsx("div", { className: "absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity", children: /* @__PURE__ */ jsx(GripVertical, { className: "w-3 h-3 text-muted-foreground" }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mt-3", children: [
      /* @__PURE__ */ jsx("div", { className: `text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${priorityColors[card.priority] || "bg-gray-100"}`, children: card.priority }),
      card.assignee && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", title: card.assignee.name, children: [
        /* @__PURE__ */ jsxs(Avatar, { className: "h-5 w-5", children: [
          /* @__PURE__ */ jsx(AvatarImage, { src: card.assignee.image }),
          /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[9px] bg-primary text-primary-foreground", children: card.assignee.name.substring(0, 2).toUpperCase() })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "text-[10px] text-muted-foreground truncate max-w-[80px]", children: card.assignee.name })
      ] })
    ] })
  ] });
}

const Accordion = AccordionPrimitive.Root;
const AccordionItem = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  AccordionPrimitive.Item,
  {
    ref,
    className: cn("border-b", className),
    ...props
  }
));
AccordionItem.displayName = "AccordionItem";
const AccordionTrigger = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsx(AccordionPrimitive.Header, { className: "flex", children: /* @__PURE__ */ jsxs(
  AccordionPrimitive.Trigger,
  {
    ref,
    className: cn(
      "flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:underline text-left [&[data-state=open]>svg]:rotate-180",
      className
    ),
    ...props,
    children: [
      children,
      /* @__PURE__ */ jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" })
    ]
  }
) }));
AccordionTrigger.displayName = AccordionPrimitive.Trigger.displayName;
const AccordionContent = React.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsx(
  AccordionPrimitive.Content,
  {
    ref,
    className: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down",
    ...props,
    children: /* @__PURE__ */ jsx("div", { className: cn("pb-4 pt-0", className), children })
  }
));
AccordionContent.displayName = AccordionPrimitive.Content.displayName;

const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.List,
  {
    ref,
    className: cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    ),
    ...props
  }
));
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.Trigger,
  {
    ref,
    className: cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    ),
    ...props
  }
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(
  TabsPrimitive.Content,
  {
    ref,
    className: cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    ),
    ...props
  }
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

function FileUpload({ onUpload, className }) {
  const [uploading, setUploading] = useState(false);
  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    setUploading(true);
    try {
      await onUpload(acceptedFiles);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setUploading(false);
    }
  }, [onUpload]);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true
  });
  return /* @__PURE__ */ jsxs(
    "div",
    {
      ...getRootProps(),
      className: cn(
        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors hover:border-primary/50",
        isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25",
        uploading && "opacity-50 cursor-default pointer-events-none",
        className
      ),
      children: [
        /* @__PURE__ */ jsx("input", { ...getInputProps() }),
        /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center gap-2", children: [
          /* @__PURE__ */ jsx("div", { className: "p-2 bg-background rounded-full border shadow-sm", children: uploading ? /* @__PURE__ */ jsx("div", { className: "h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsx(Upload, { className: "h-5 w-5 text-muted-foreground" }) }),
          /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground", children: isDragActive ? /* @__PURE__ */ jsx("p", { className: "font-medium text-primary", children: "Solte os arquivos aqui..." }) : /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("span", { className: "font-semibold text-foreground", children: "Clique para enviar" }),
            " ou arraste e solte",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("span", { className: "text-xs", children: "Imagens, PDF, Docs (max 10MB)" })
          ] }) })
        ] })
      ]
    }
  );
}

function AttachmentList({ attachments, onDelete, isDeleting }) {
  if (attachments.length === 0) {
    return /* @__PURE__ */ jsx("div", { className: "text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-lg border border-dashed", children: "Nenhum anexo encontrado." });
  }
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4", children: attachments.map((file) => {
    const isImage = file.fileType.startsWith("image/");
    return /* @__PURE__ */ jsx(Card, { className: "group relative overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-3", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3", children: [
        /* @__PURE__ */ jsx("div", { className: "h-10 w-10 shrink-0 bg-muted rounded-lg flex items-center justify-center overflow-hidden", children: isImage && file.url ? /* @__PURE__ */ jsx("img", { src: file.url, alt: file.fileName, className: "h-full w-full object-cover" }) : /* @__PURE__ */ jsx(FileIcon, { className: "h-5 w-5 text-muted-foreground" }) }),
        /* @__PURE__ */ jsxs("div", { className: "min-w-0 flex-1", children: [
          /* @__PURE__ */ jsx("p", { className: "text-sm font-medium truncate", title: file.fileName, children: file.fileName }),
          /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground", children: [
            formatBytes(file.fileSize),
            /* @__PURE__ */ jsx("span", { className: "mx-1", children: "•" }),
            new Date(file.createdAt).toLocaleDateString()
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "absolute top-2 right-2 flex gap-1 bg-background/80 backdrop-blur-sm rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity border shadow-sm", children: [
        isImage && file.url && /* @__PURE__ */ jsxs(Dialog, { children: [
          /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", children: /* @__PURE__ */ jsx(Eye, { className: "h-4 w-4" }) }) }),
          /* @__PURE__ */ jsx(DialogContent, { className: "max-w-4xl p-0 overflow-hidden border-none bg-transparent shadow-none", children: /* @__PURE__ */ jsx("img", { src: file.url, alt: file.fileName, className: "w-full h-auto rounded-lg" }) })
        ] }),
        file.url && /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-7 w-7", asChild: true, children: /* @__PURE__ */ jsx("a", { href: file.url, target: "_blank", rel: "noopener noreferrer", download: true, children: /* @__PURE__ */ jsx(Download, { className: "h-4 w-4" }) }) }),
        /* @__PURE__ */ jsx(
          Button,
          {
            variant: "ghost",
            size: "icon",
            className: "h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10",
            onClick: () => onDelete(file.id),
            disabled: isDeleting === file.id,
            children: isDeleting === file.id ? /* @__PURE__ */ jsx("div", { className: "h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" }) : /* @__PURE__ */ jsx(Trash2, { className: "h-4 w-4" })
          }
        )
      ] })
    ] }) }, file.id);
  }) });
}

function TaskDialog({ open, onOpenChange, task, phaseId, projectId }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  const { data: stakeholders } = useQuery({
    queryKey: ["stakeholders", projectId],
    queryFn: async () => {
      const res = await api.stakeholders[":projectId"].$get({
        param: { projectId }
      });
      if (!res.ok) throw new Error();
      return res.json();
    },
    enabled: open
  });
  const { data: attachments = [], refetch: refetchAttachments } = useQuery({
    queryKey: ["attachments", task?.id],
    queryFn: async () => {
      if (!task?.id) return [];
      const res = await api.storage[":entityId"].$get({ param: { entityId: task.id } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!task?.id && open
  });
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [startDate, setStartDate] = useState(task?.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "");
  const [endDate, setEndDate] = useState(task?.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "");
  const [status, setStatus] = useState(task?.status || "todo");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [stakeholderId, setStakeholderId] = useState(task?.stakeholderId || task?.assigneeId || "unassigned");
  useEffect(() => {
    if (open) {
      setTitle(task?.title || "");
      setDescription(task?.description || "");
      setStartDate(task?.startDate ? new Date(task.startDate).toISOString().split("T")[0] : "");
      setEndDate(task?.endDate ? new Date(task.endDate).toISOString().split("T")[0] : "");
      setStatus(task?.status || "todo");
      setPriority(task?.priority || "medium");
      setStakeholderId(task?.stakeholderId || task?.assigneeId || "unassigned");
    }
  }, [open, task]);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (task) {
        const res = await api.tasks[":id"].$patch({
          param: { id: task.id },
          json: {
            title,
            description,
            startDate: startDate || null,
            endDate: endDate || null,
            stakeholderId: stakeholderId === "unassigned" ? null : stakeholderId,
            status,
            priority
          }
        });
        if (!res.ok) throw new Error("Failed to update task");
        toast.success("Tarefa atualizada!");
      } else {
        const res = await api.tasks.$post({
          json: {
            phaseId,
            title,
            description,
            startDate: startDate || void 0,
            endDate: endDate || void 0,
            stakeholderId: stakeholderId === "unassigned" ? void 0 : stakeholderId,
            status,
            priority
          }
        });
        if (!res.ok) throw new Error("Failed to create task");
        toast.success("Tarefa criada!");
      }
      queryClient.invalidateQueries({ queryKey: ["phases", projectId] });
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao salvar tarefa");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };
  const handleUpload = async (files) => {
    if (!task?.id) return;
    for (const file of files) {
      try {
        const initRes = await api.storage["presigned-url"].$post({
          json: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            entityId: task.id,
            entityType: "task"
          }
        });
        if (!initRes.ok) throw new Error("Failed to get upload URL");
        const { url, key } = await initRes.json();
        await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type }
        });
        await api.storage.confirm.$post({
          json: {
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            key,
            entityId: task.id,
            entityType: "task"
          }
        });
        toast.success(`Upload de ${file.name} concluído!`);
      } catch (error) {
        console.error(error);
        toast.error(`Erro ao enviar ${file.name}`);
      }
    }
    refetchAttachments();
  };
  const handleDeleteAttachment = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este anexo?")) return;
    try {
      const res = await api.storage[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Anexo excluído");
      refetchAttachments();
    } catch (error) {
      toast.error("Erro ao excluir anexo");
    }
  };
  return /* @__PURE__ */ jsx(Dialog, { open, onOpenChange, children: /* @__PURE__ */ jsxs(DialogContent, { className: "sm:max-w-[600px] max-h-[85vh] overflow-y-auto", children: [
    /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: task ? "Editar Tarefa" : "Nova Tarefa" }) }),
    /* @__PURE__ */ jsxs(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: [
      task && /* @__PURE__ */ jsxs(TabsList, { className: "grid w-full grid-cols-2", children: [
        /* @__PURE__ */ jsx(TabsTrigger, { value: "details", children: "Detalhes" }),
        /* @__PURE__ */ jsxs(TabsTrigger, { value: "attachments", children: [
          "Anexos (",
          attachments.length,
          ")"
        ] })
      ] }),
      /* @__PURE__ */ jsx(TabsContent, { value: "details", className: "mt-4", children: /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "title", children: "Título" }),
          /* @__PURE__ */ jsx(Input, { id: "title", value: title, onChange: (e) => setTitle(e.target.value), required: true })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "description", children: "Descrição" }),
          /* @__PURE__ */ jsx(Textarea, { id: "description", value: description, onChange: (e) => setDescription(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
          /* @__PURE__ */ jsx(Label, { children: "Responsável (Stakeholder)" }),
          /* @__PURE__ */ jsxs(Select, { value: stakeholderId, onValueChange: setStakeholderId, children: [
            /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, { placeholder: "Sem responsável" }) }),
            /* @__PURE__ */ jsxs(SelectContent, { children: [
              /* @__PURE__ */ jsx(SelectItem, { value: "unassigned", children: "Sem responsável" }),
              stakeholders?.map((s) => /* @__PURE__ */ jsxs(SelectItem, { value: s.id, children: [
                s.name,
                " (",
                s.role,
                ")"
              ] }, s.id))
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "startDate", children: "Início" }),
            /* @__PURE__ */ jsx(Input, { type: "date", id: "startDate", value: startDate, onChange: (e) => setStartDate(e.target.value) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { htmlFor: "endDate", children: "Término" }),
            /* @__PURE__ */ jsx(Input, { type: "date", id: "endDate", value: endDate, onChange: (e) => setEndDate(e.target.value) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-2 gap-4", children: [
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Prioridade" }),
            /* @__PURE__ */ jsxs(Select, { value: priority, onValueChange: setPriority, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "low", children: "Baixa" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "medium", children: "Média" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "high", children: "Alta" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "urgent", children: "Urgente" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsx(Label, { children: "Status" }),
            /* @__PURE__ */ jsxs(Select, { value: status, onValueChange: setStatus, children: [
              /* @__PURE__ */ jsx(SelectTrigger, { children: /* @__PURE__ */ jsx(SelectValue, {}) }),
              /* @__PURE__ */ jsxs(SelectContent, { children: [
                /* @__PURE__ */ jsx(SelectItem, { value: "todo", children: "Não Iniciada" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "in_progress", children: "Em Andamento" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "review", children: "Em Revisão" }),
                /* @__PURE__ */ jsx(SelectItem, { value: "done", children: "Concluída" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(DialogFooter, { children: /* @__PURE__ */ jsx(Button, { type: "submit", disabled: loading, children: loading ? "Salvando..." : "Salvar" }) })
      ] }) }),
      /* @__PURE__ */ jsxs(TabsContent, { value: "attachments", className: "mt-4 space-y-4", children: [
        /* @__PURE__ */ jsx(FileUpload, { onUpload: handleUpload }),
        /* @__PURE__ */ jsx(AttachmentList, { attachments, onDelete: handleDeleteAttachment })
      ] })
    ] })
  ] }) });
}

function TaskItem({ task, phaseId, projectId }) {
  const [open, setOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };
  const priorityColors = {
    low: "bg-blue-100 text-blue-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    urgent: "bg-red-100 text-red-800"
  };
  const statusLabels = {
    todo: "A Fazer",
    in_progress: "Em Andamento",
    review: "Em Revisão",
    done: "Concluído"
  };
  return /* @__PURE__ */ jsxs("div", { ref: setNodeRef, style, ...attributes, children: [
    /* @__PURE__ */ jsx(
      Card,
      {
        className: "mb-2 hover:shadow-md transition-shadow border-l-4 group",
        style: { borderLeftColor: task.status === "done" ? "#10b981" : "#e5e7eb" },
        children: /* @__PURE__ */ jsx(CardContent, { className: "p-4", children: /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-start", children: [
          /* @__PURE__ */ jsx(
            "div",
            {
              ...listeners,
              className: "mr-3 mt-1 cursor-grab text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity",
              children: /* @__PURE__ */ jsx(GripVertical, { className: "h-4 w-4" })
            }
          ),
          /* @__PURE__ */ jsxs(
            "div",
            {
              className: "space-y-1 flex-1 cursor-pointer",
              onClick: () => setOpen(true),
              children: [
                /* @__PURE__ */ jsx("h4", { className: `font-medium ${task.status === "done" ? "line-through text-gray-500" : ""}`, children: task.title }),
                /* @__PURE__ */ jsx("p", { className: "text-sm text-gray-500 line-clamp-1", children: task.description }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-4 text-xs text-gray-500 mt-2", children: [
                  (task.startDate || task.endDate) && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", children: [
                    /* @__PURE__ */ jsx(Calendar, { className: "h-3 w-3" }),
                    /* @__PURE__ */ jsxs("span", { children: [
                      task.startDate ? new Date(task.startDate).toISOString().split("T")[0].split("-").reverse().join("/") : "...",
                      " - ",
                      task.endDate ? new Date(task.endDate).toISOString().split("T")[0].split("-").reverse().join("/") : "..."
                    ] })
                  ] }),
                  task.assignee && /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-1", title: task.assignee.name, children: [
                    /* @__PURE__ */ jsxs(Avatar, { className: "h-5 w-5", children: [
                      /* @__PURE__ */ jsx(AvatarImage, { src: task.assignee.image }),
                      /* @__PURE__ */ jsx(AvatarFallback, { className: "text-[9px] bg-primary text-primary-foreground", children: task.assignee.name.substring(0, 2).toUpperCase() })
                    ] }),
                    /* @__PURE__ */ jsx("span", { className: "text-[10px] hidden sm:inline-block", children: task.assignee.name })
                  ] })
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxs("div", { className: "flex flex-col gap-2 items-end ml-2", children: [
            /* @__PURE__ */ jsx(Badge, { variant: "outline", children: statusLabels[task.status] || task.status }),
            /* @__PURE__ */ jsx("div", { className: `text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${priorityColors[task.priority] || "bg-gray-100"}`, children: task.priority })
          ] })
        ] }) })
      }
    ),
    /* @__PURE__ */ jsx(
      TaskDialog,
      {
        open,
        onOpenChange: setOpen,
        task,
        phaseId,
        projectId
      }
    )
  ] });
}

const PHASE_COLORS = [
  { border: "border-l-emerald-500", bar: "bg-emerald-500" },
  { border: "border-l-blue-500", bar: "bg-blue-500" },
  { border: "border-l-indigo-500", bar: "bg-indigo-500" },
  { border: "border-l-violet-500", bar: "bg-violet-500" },
  { border: "border-l-rose-500", bar: "bg-rose-500" },
  { border: "border-l-amber-500", bar: "bg-amber-500" }
];
function PhaseAccordion({ phase, projectId, index }) {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const taskCount = phase.tasks?.length || 0;
  const completedCount = phase.tasks?.filter((t) => t.status === "done").length || 0;
  const progress = taskCount > 0 ? Math.round(completedCount / taskCount * 100) : 0;
  const color = PHASE_COLORS[index % PHASE_COLORS.length];
  const { setNodeRef } = useDroppable({
    id: phase.id
  });
  const taskIds = useMemo(() => phase.tasks?.map((t) => t.id) || [], [phase.tasks]);
  const getPhaseSubtitle = (name) => {
    if (phase.description) return phase.description;
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes("iniciacao")) return "Definição e autorização do projeto";
    if (normalized.includes("planejamento")) return "Definição do escopo, cronograma e recursos";
    if (normalized.includes("execucao")) return "Acompanhamento e ajustes do projeto";
    if (normalized.includes("encerramento")) return "Entrega final e lições aprendidas";
    return phase.description || "";
  };
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState(phase.name);
  const [editDescription, setEditDescription] = useState(phase.description || "");
  const [isEditing, setIsEditing] = useState(false);
  const handleEdit = async () => {
    setIsEditing(true);
    try {
      const res = await api.phases[":id"].$patch({
        param: { id: phase.id },
        json: { name: editName, description: editDescription }
      });
      if (!res.ok) throw new Error("Erro ao editar fase");
      toast.success("Fase atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["phases", projectId] });
      setEditOpen(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsEditing(false);
    }
  };
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await api.phases[":id"].$delete({ param: { id: phase.id } });
      if (!res.ok) {
        if (res.status === 403) throw new Error("Sem permissão. Apenas o Dono ou Super Admin podem excluir.");
        throw new Error("Erro ao excluir fase");
      }
      toast.success("Fase excluída com sucesso");
      queryClient.invalidateQueries({ queryKey: ["phases", projectId] });
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      AccordionItem,
      {
        value: phase.id,
        className: `border rounded-xl px-4 mb-4 bg-white shadow-sm border-l-4 transition-all duration-300 ${color.border}`,
        children: [
          /* @__PURE__ */ jsx(AccordionTrigger, { className: "hover:no-underline py-6", children: /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between w-full pr-4", children: [
            /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-start gap-0.5", children: [
              /* @__PURE__ */ jsx("span", { className: "text-lg font-bold text-gray-800", children: phase.name }),
              /* @__PURE__ */ jsx("span", { className: "text-sm text-gray-500 font-normal", children: getPhaseSubtitle(phase.name) })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-6", children: [
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-end min-w-[120px]", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1", children: "Progresso" }),
                /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-3 w-full", children: [
                  /* @__PURE__ */ jsx("div", { className: "flex-1 bg-gray-100 h-2 rounded-full overflow-hidden", children: /* @__PURE__ */ jsx(
                    "div",
                    {
                      className: `${color.bar} h-2 rounded-full transition-all duration-500`,
                      style: { width: `${progress}%` }
                    }
                  ) }),
                  /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold text-gray-700 min-w-[35px] text-right", children: [
                    progress,
                    "%"
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { className: "h-8 w-px bg-gray-100" }),
              /* @__PURE__ */ jsxs("div", { className: "flex flex-col items-center min-w-[60px]", children: [
                /* @__PURE__ */ jsx("span", { className: "text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1", children: "Tarefas" }),
                /* @__PURE__ */ jsxs("span", { className: "text-sm font-bold text-gray-700", children: [
                  completedCount,
                  "/",
                  taskCount
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsxs(DropdownMenu, { children: [
                /* @__PURE__ */ jsx(DropdownMenuTrigger, { asChild: true, children: /* @__PURE__ */ jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-gray-400 hover:text-gray-600", children: /* @__PURE__ */ jsx(MoreVertical, { className: "h-4 w-4" }) }) }),
                /* @__PURE__ */ jsxs(DropdownMenuContent, { align: "end", children: [
                  /* @__PURE__ */ jsxs(
                    DropdownMenuItem,
                    {
                      className: "cursor-pointer",
                      onClick: () => {
                        setEditName(phase.name);
                        setEditDescription(phase.description || getPhaseSubtitle(phase.name));
                        setEditOpen(true);
                      },
                      children: [
                        /* @__PURE__ */ jsx(Pencil, { className: "mr-2 h-4 w-4" }),
                        "Editar Detalhes"
                      ]
                    }
                  ),
                  /* @__PURE__ */ jsxs(
                    DropdownMenuItem,
                    {
                      className: "text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer",
                      onClick: () => setDeleteOpen(true),
                      children: [
                        /* @__PURE__ */ jsx(Trash, { className: "mr-2 h-4 w-4" }),
                        "Excluir Fase"
                      ]
                    }
                  )
                ] })
              ] }) })
            ] })
          ] }) }),
          /* @__PURE__ */ jsxs(AccordionContent, { className: "pt-2 pb-6 border-t border-gray-50", children: [
            /* @__PURE__ */ jsxs("div", { ref: setNodeRef, className: "space-y-3 min-h-[50px] pt-4", children: [
              /* @__PURE__ */ jsx(SortableContext, { items: taskIds, strategy: verticalListSortingStrategy, children: phase.tasks?.map((task) => /* @__PURE__ */ jsx(TaskItem, { task, phaseId: phase.id, projectId }, task.id)) }),
              taskCount === 0 && /* @__PURE__ */ jsx("div", { className: "text-center py-10 bg-slate-50/50 rounded-lg border border-dashed border-slate-200", children: /* @__PURE__ */ jsx("p", { className: "text-sm text-slate-400 italic font-medium", children: "Nenhuma tarefa nesta fase" }) })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "mt-8 flex justify-center", children: /* @__PURE__ */ jsxs(
              Button,
              {
                variant: "outline",
                size: "sm",
                onClick: () => setCreateOpen(true),
                className: "rounded-full px-6 border-[#1d4e46] text-[#1d4e46] hover:bg-[#1d4e46] hover:text-white transition-all font-semibold",
                children: [
                  /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
                  "Adicionar Tarefa"
                ]
              }
            ) }),
            /* @__PURE__ */ jsx(
              TaskDialog,
              {
                open: createOpen,
                onOpenChange: setCreateOpen,
                phaseId: phase.id,
                projectId
              }
            )
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx(Dialog, { open: editOpen, onOpenChange: setEditOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Editar Fase" }) }),
      /* @__PURE__ */ jsxs("div", { className: "grid gap-4 py-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "edit-name", children: "Nome da Fase" }),
          /* @__PURE__ */ jsx(Input, { id: "edit-name", value: editName, onChange: (e) => setEditName(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "grid gap-2", children: [
          /* @__PURE__ */ jsx(Label, { htmlFor: "edit-desc", children: "Subtítulo (Descrição)" }),
          /* @__PURE__ */ jsx(Input, { id: "edit-desc", value: editDescription, onChange: (e) => setEditDescription(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setEditOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { onClick: handleEdit, disabled: isEditing || !editName, children: isEditing ? "Salvando..." : "Salvar Alterações" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsx(Dialog, { open: deleteOpen, onOpenChange: setDeleteOpen, children: /* @__PURE__ */ jsxs(DialogContent, { children: [
      /* @__PURE__ */ jsxs(DialogHeader, { children: [
        /* @__PURE__ */ jsxs(DialogTitle, { className: "flex items-center gap-2 text-destructive", children: [
          /* @__PURE__ */ jsx(AlertTriangle, { className: "h-5 w-5" }),
          "Excluir Fase"
        ] }),
        /* @__PURE__ */ jsxs(DialogDescription, { children: [
          "Tem certeza que deseja excluir a fase ",
          /* @__PURE__ */ jsx("strong", { children: phase.name }),
          "?",
          /* @__PURE__ */ jsx("br", {}),
          "Todas as tarefas vinculadas a esta fase também serão excluídas permanentemente."
        ] })
      ] }),
      /* @__PURE__ */ jsxs(DialogFooter, { children: [
        /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setDeleteOpen(false), children: "Cancelar" }),
        /* @__PURE__ */ jsx(Button, { variant: "destructive", onClick: handleDelete, disabled: isDeleting, children: isDeleting ? "Excluindo..." : "Excluir Definitivamente" })
      ] })
    ] }) })
  ] });
}

function PhaseList({ projectId }) {
  const queryClient = useQueryClient();
  const [newPhaseOpen, setNewPhaseOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [expandedPhases, setExpandedPhases] = useState([]);
  const { data: phases, isLoading } = useQuery({
    queryKey: ["phases", projectId],
    queryFn: async () => {
      const res = await api.phases[":projectId"].$get({ param: { projectId } });
      if (!res.ok) throw new Error("Failed to fetch phases");
      return await res.json();
    }
  });
  const toggleAll = () => {
    if (!phases) return;
    if (expandedPhases.length > 0) {
      setExpandedPhases([]);
    } else {
      setExpandedPhases(phases.map((p) => p.id));
    }
  };
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );
  const findPhase = (id) => {
    if (!phases) return null;
    return phases.find((p) => p.tasks.some((t) => t.id === id) || p.id === id);
  };
  const handleDragStart = (event) => {
    const { active } = event;
    setActiveId(active.id);
    for (const phase of phases || []) {
      const task = phase.tasks.find((t) => t.id === active.id);
      if (task) {
        setActiveTask(task);
        break;
      }
    }
  };
  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;
    const activeId2 = active.id;
    const overId = over.id;
    const activePhase = findPhase(activeId2);
    const overPhase = findPhase(overId);
    if (!activePhase || !overPhase) return;
    if (activePhase.id !== overPhase.id) ;
  };
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);
    if (!over) return;
    const activeData = active.data.current;
    if (activeData?.type === "phase") {
      if (active.id !== over.id) {
        queryClient.setQueryData(["phases", projectId], (old) => {
          const oldIndex = old.findIndex((p) => p.id === active.id);
          const newIndex = old.findIndex((p) => p.id === over.id);
          const newPhases = arrayMove(old, oldIndex, newIndex);
          const updates = newPhases.map((p, index) => ({
            id: p.id,
            order: index
          }));
          api.phases[":projectId"].reorder.$patch({
            param: { projectId },
            json: { items: updates }
          });
          return newPhases;
        });
      }
      return;
    }
    const activePhase = findPhase(active.id);
    const overPhase = findPhase(over.id);
    if (activePhase && overPhase) {
      queryClient.setQueryData(["phases", projectId], (old) => {
        const newPhases = JSON.parse(JSON.stringify(old));
        const activePhaseIndex = newPhases.findIndex((p) => p.id === activePhase.id);
        const overPhaseIndex = newPhases.findIndex((p) => p.id === overPhase.id);
        const activeTaskIndex = newPhases[activePhaseIndex].tasks.findIndex((t) => t.id === active.id);
        let overTaskIndex = newPhases[overPhaseIndex].tasks.findIndex((t) => t.id === over.id);
        const movedTask = newPhases[activePhaseIndex].tasks[activeTaskIndex];
        newPhases[activePhaseIndex].tasks.splice(activeTaskIndex, 1);
        if (activePhase.id === overPhase.id) {
          if (overTaskIndex === -1) {
            overTaskIndex = newPhases[overPhaseIndex].tasks.length;
          }
          newPhases[overPhaseIndex].tasks.splice(overTaskIndex, 0, movedTask);
        } else {
          let newIndex = overTaskIndex;
          if (overTaskIndex === -1) {
            newIndex = newPhases[overPhaseIndex].tasks.length;
          }
          movedTask.phaseId = overPhase.id;
          newPhases[overPhaseIndex].tasks.splice(newIndex, 0, movedTask);
        }
        const updates = [];
        if (activePhase.id !== overPhase.id) {
          newPhases[activePhaseIndex].tasks.forEach((t, i) => {
            t.order = i;
            updates.push({ id: t.id, phaseId: t.phaseId, order: i });
          });
        }
        newPhases[overPhaseIndex].tasks.forEach((t, i) => {
          t.order = i;
          updates.push({ id: t.id, phaseId: t.phaseId, order: i });
        });
        api.tasks.reorder.$patch({ json: { items: updates } });
        return newPhases;
      });
    }
  };
  const createPhase = async () => {
    if (!newPhaseName.trim()) return;
    setCreating(true);
    try {
      const res = await api.phases[":projectId"].$post({
        param: { projectId },
        json: { name: newPhaseName }
      });
      if (!res.ok) throw new Error("Failed to create phase");
      toast.success("Fase criada com sucesso!");
      setNewPhaseName("");
      setNewPhaseOpen(false);
      queryClient.invalidateQueries({ queryKey: ["phases", projectId] });
    } catch (error) {
      toast.error("Erro ao criar fase");
      console.error(error);
    } finally {
      setCreating(false);
    }
  };
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "flex justify-center p-8", children: /* @__PURE__ */ jsx(Loader2, { className: "animate-spin h-8 w-8 text-primary" }) });
  }
  return /* @__PURE__ */ jsx(
    DndContext,
    {
      sensors,
      collisionDetection: closestCorners,
      onDragStart: handleDragStart,
      onDragOver: handleDragOver,
      onDragEnd: handleDragEnd,
      children: /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex justify-between items-center", children: [
          /* @__PURE__ */ jsx("h2", { className: "text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent", children: "Fases do Projeto" }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            phases && phases.length > 0 && /* @__PURE__ */ jsx(
              Button,
              {
                className: "bg-emerald-600 hover:bg-emerald-700 text-white",
                onClick: toggleAll,
                children: expandedPhases.length > 0 ? "Recolher Tudo" : "Expandir Tudo"
              }
            ),
            /* @__PURE__ */ jsxs(Dialog, { open: newPhaseOpen, onOpenChange: setNewPhaseOpen, children: [
              /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsxs(Button, { className: "bg-emerald-600 hover:bg-emerald-700", children: [
                /* @__PURE__ */ jsx(Plus, { className: "mr-2 h-4 w-4" }),
                "Nova Fase"
              ] }) }),
              /* @__PURE__ */ jsxs(DialogContent, { children: [
                /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Adicionar Nova Fase" }) }),
                /* @__PURE__ */ jsx("div", { className: "space-y-4 py-4", children: /* @__PURE__ */ jsxs("div", { className: "space-y-2", children: [
                  /* @__PURE__ */ jsx(Label, { htmlFor: "name", children: "Nome da Fase" }),
                  /* @__PURE__ */ jsx(
                    Input,
                    {
                      id: "name",
                      value: newPhaseName,
                      onChange: (e) => setNewPhaseName(e.target.value),
                      placeholder: "Ex: Pós-Implementação"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ jsxs(DialogFooter, { children: [
                  /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setNewPhaseOpen(false), children: "Cancelar" }),
                  /* @__PURE__ */ jsx(Button, { onClick: createPhase, disabled: creating || !newPhaseName, children: creating ? "Criando..." : "Criar Fase" })
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(SortableContext, { items: phases?.map((p) => p.id) || [], children: /* @__PURE__ */ jsx(
          Accordion,
          {
            type: "multiple",
            value: expandedPhases,
            onValueChange: setExpandedPhases,
            className: "w-full space-y-4",
            children: phases?.map((phase, index) => /* @__PURE__ */ jsx(SortablePhaseWrapper, { phase, projectId, index, children: /* @__PURE__ */ jsx(
              PhaseAccordion,
              {
                phase,
                projectId,
                index
              }
            ) }, phase.id))
          }
        ) }),
        phases?.length === 0 && /* @__PURE__ */ jsxs("div", { className: "text-center py-12 bg-gray-50 rounded-lg border border-dashed", children: [
          /* @__PURE__ */ jsx("p", { className: "text-gray-500 mb-4", children: "Nenhuma fase definida para este projeto." }),
          /* @__PURE__ */ jsx(Button, { variant: "outline", onClick: () => setNewPhaseOpen(true), children: "Começar definindo as fases" })
        ] }),
        /* @__PURE__ */ jsx(DragOverlay, { children: activeId ? activeTask ? /* @__PURE__ */ jsx("div", { className: "opacity-80 rotate-2 cursor-grabbing", children: /* @__PURE__ */ jsx(TaskItem, { task: activeTask, phaseId: activeTask.phaseId, projectId }) }) : (
          // Overlay for Phase
          /* @__PURE__ */ jsx("div", { className: "bg-white rounded-lg shadow-xl p-4 border-l-4 border-l-emerald-500 opacity-90 cursor-grabbing", children: /* @__PURE__ */ jsx("h3", { className: "font-semibold text-lg", children: phases?.find((p) => p.id === activeId)?.name }) })
        ) : null })
      ] })
    }
  );
}
function SortablePhaseWrapper({ children, phase }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: phase.id,
    data: {
      type: "phase",
      phase
    }
  });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
    position: "relative"
  };
  return /* @__PURE__ */ jsx("div", { ref: setNodeRef, style, ...attributes, children: /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxs("div", { ...listeners, className: "cursor-grab hover:text-emerald-600 px-2 py-4", children: [
      /* @__PURE__ */ jsx("span", { className: "sr-only", children: "Move" }),
      /* @__PURE__ */ jsx("svg", { width: "12", height: "12", viewBox: "0 0 15 15", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: "w-4 h-4 text-slate-400", children: /* @__PURE__ */ jsx("path", { d: "M5.5 2.5C5.5 2.22386 5.27614 2 5 2C4.72386 2 4.5 2.22386 4.5 2.5V12.5C4.5 12.7761 4.72386 13 5 13C5.27614 13 5.5 12.7761 5.5 12.5V2.5ZM10.5 2.5C10.5 2.22386 10.2761 2 10 2C9.72386 2 9.5 2.22386 9.5 2.5V12.5C9.5 12.7761 9.72386 13 10 13C10.2761 13 10.5 12.7761 10.5 12.5V2.5Z", fill: "currentColor", fillRule: "evenodd", clipRule: "evenodd" }) })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1", children })
  ] }) });
}

function TaskStats({ columns, isLoading }) {
  if (isLoading) {
    return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse", children: [...Array(4)].map((_, i) => /* @__PURE__ */ jsx("div", { className: "h-24 bg-muted rounded-lg" }, i)) });
  }
  let total = 0;
  let completed = 0;
  let inProgress = 0;
  let overdue = 0;
  const now = /* @__PURE__ */ new Date();
  columns.forEach((col) => {
    total += col.cards.length;
    if (col.id === "done") {
      completed += col.cards.length;
    } else if (col.id === "in_progress") {
      inProgress += col.cards.length;
    }
    if (col.id !== "done") {
      col.cards.forEach((card) => {
        if (card.endDate) {
          const end = new Date(card.endDate);
          end.setHours(23, 59, 59, 999);
          if (end < now) {
            overdue++;
          }
        }
      });
    }
  });
  const stats = [
    {
      label: "TOTAL DE TAREFAS",
      value: total,
      color: "text-green-600",
      borderColor: "border-green-100"
      // Not used in design but consistent
    },
    {
      label: "CONCLUÍDAS",
      value: completed,
      color: "text-green-600",
      total
    },
    {
      label: "EM ANDAMENTO",
      value: inProgress,
      color: "text-blue-600"
    },
    {
      label: "ATRASADAS",
      value: overdue,
      color: "text-red-500"
    }
  ];
  return /* @__PURE__ */ jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: stats.map((stat, idx) => /* @__PURE__ */ jsx(Card, { className: "shadow-none border rounded-lg", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-4 pt-4", children: [
    /* @__PURE__ */ jsx("div", { className: "text-xs font-semibold text-muted-foreground uppercase mb-1", children: stat.label }),
    /* @__PURE__ */ jsx("div", { className: `text-2xl font-bold ${stat.color}`, children: stat.value }),
    stat.label === "CONCLUÍDAS" && stat.total !== void 0 && stat.total > 0 && /* @__PURE__ */ jsx("div", { className: "w-full h-1.5 bg-muted rounded-full mt-2", children: /* @__PURE__ */ jsx(
      "div",
      {
        className: "h-full bg-green-500 rounded-full transition-all duration-500",
        style: { width: `${stat.value / stat.total * 100}%` }
      }
    ) })
  ] }) }, idx)) });
}

const Separator = React.forwardRef(
  ({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ jsx(
    SeparatorPrimitive.Root,
    {
      ref,
      decorative,
      orientation,
      className: cn(
        "shrink-0 bg-border",
        orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]",
        className
      ),
      ...props
    }
  )
);
Separator.displayName = SeparatorPrimitive.Root.displayName;

function ProjectHeader({ project, organization, stakeholders, totalPhases, completedPhases }) {
  const progressPercentage = totalPhases > 0 ? Math.round(completedPhases / totalPhases * 100) : 0;
  const secretarioName = organization?.secretario || "-";
  const secretariaAdjuntaName = organization?.secretariaAdjunta || "-";
  const diretoriaTecnicaName = organization?.diretoriaTecnica || "-";
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10", children: [
    /* @__PURE__ */ jsx(Card, { className: "lg:col-span-2 bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-xl overflow-hidden", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-8 lg:p-10 space-y-10", children: [
      /* @__PURE__ */ jsxs("div", { className: "space-y-4", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-[0.15em]", children: [
          /* @__PURE__ */ jsx(Building2, { className: "w-4 h-4 text-primary/60" }),
          "Órgão Responsável"
        ] }),
        /* @__PURE__ */ jsx("h2", { className: "text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight", children: organization?.name || "Órgão não definido" })
      ] }),
      /* @__PURE__ */ jsx(Separator, { className: "bg-slate-100" }),
      /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-10", children: [
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]", children: [
            /* @__PURE__ */ jsx(User, { className: "w-3.5 h-3.5" }),
            "Secretário"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "font-bold text-lg text-slate-900 truncate", title: secretarioName, children: secretarioName })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]", children: [
            /* @__PURE__ */ jsx(UserCheck, { className: "w-3.5 h-3.5" }),
            "Secretaria Adjunta"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "font-bold text-lg text-slate-900 truncate", title: secretariaAdjuntaName, children: secretariaAdjuntaName })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "space-y-3", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-[0.15em]", children: [
            /* @__PURE__ */ jsx(Activity, { className: "w-3.5 h-3.5" }),
            "Diretoria Técnica"
          ] }),
          /* @__PURE__ */ jsx("p", { className: "font-bold text-lg text-slate-900 truncate", title: diretoriaTecnicaName, children: diretoriaTecnicaName })
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(Card, { className: "bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl group", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-8", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 text-slate-500 font-bold text-[11px] uppercase tracking-[0.15em]", children: [
            /* @__PURE__ */ jsx(Layout, { className: "w-4 h-4" }),
            "Progresso"
          ] }),
          /* @__PURE__ */ jsxs("span", { className: "text-4xl font-black text-primary tracking-tighter", children: [
            progressPercentage,
            "%"
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "h-4 w-full bg-slate-200 rounded-full overflow-hidden mb-8 shadow-inner", children: /* @__PURE__ */ jsx(
          "div",
          {
            className: "h-full bg-primary rounded-full transition-all duration-1000 ease-out",
            style: { width: `${progressPercentage}%` }
          }
        ) }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between text-xs font-bold text-slate-600 px-1", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 bg-primary rounded-full" }),
            completedPhases,
            " concluídas"
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("div", { className: "w-2.5 h-2.5 bg-slate-300 rounded-full" }),
            totalPhases,
            " fases no projeto"
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { className: "bg-white border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-xl", children: /* @__PURE__ */ jsxs(CardContent, { className: "p-8 flex items-center justify-between", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { className: "text-4xl font-black text-slate-900 tracking-tighter leading-none mb-2", children: [
            completedPhases,
            " / ",
            totalPhases
          ] }),
          /* @__PURE__ */ jsx("div", { className: "text-xs font-bold uppercase tracking-[0.15em] text-slate-500", children: "Fases do Cronograma" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "flex items-center justify-center w-14 h-14 bg-primary/5 rounded-2xl border border-primary/10", children: /* @__PURE__ */ jsx(CheckCircle2, { className: "w-7 h-7 text-primary" }) })
      ] }) })
    ] })
  ] });
}

function ProjectDetails({ id }) {
  const [viewMode, setViewMode] = useState("phases");
  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.projects[":id"].$get({ param: { id } });
      if (!res.ok) throw new Error("Not found");
      return res.json();
    }
  });
  const { data: organization } = useQuery({
    queryKey: ["organization", project?.organizationId],
    queryFn: async () => {
      if (!project?.organizationId) return null;
      const res = await api.organizations[":id"].$get({ param: { id: project.organizationId } });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!project?.organizationId
  });
  const { data: stakeholders = [] } = useQuery({
    queryKey: ["stakeholders", id],
    queryFn: async () => {
      const res = await api.stakeholders[":projectId"].$get({
        param: { projectId: id }
      });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  const { data: phases = [] } = useQuery({
    queryKey: ["phases", id],
    queryFn: async () => {
      const res = await api.phases[":projectId"].$get({ param: { projectId: id } });
      if (!res.ok) throw new Error("Failed to fetch phases");
      return await res.json();
    }
  });
  const { data: boardData = [], isLoading: isBoardLoading } = useQuery({
    queryKey: ["board", id],
    queryFn: async () => {
      const res = await api.board[":projectId"].$get({ param: { projectId: id } });
      if (!res.ok) throw new Error();
      return res.json();
    }
  });
  if (isLoading) return /* @__PURE__ */ jsx("div", { children: "Carregando..." });
  if (!project) return /* @__PURE__ */ jsx("div", { children: "Projeto não encontrado" });
  const totalPhases = phases.length;
  const completedPhases = phases.filter(
    (p) => p.tasks && p.tasks.length > 0 && p.tasks.every((t) => t.status === "done")
  ).length;
  return /* @__PURE__ */ jsxs("div", { className: "space-y-8 animate-in fade-in duration-500", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mb-4", children: [
      /* @__PURE__ */ jsx(Button, { variant: "ghost", className: "pl-0 hover:bg-transparent", asChild: true, children: /* @__PURE__ */ jsxs("a", { href: "/", className: "flex items-center gap-2 text-primary font-semibold", children: [
        /* @__PURE__ */ jsx(ArrowLeft, { className: "h-4 w-4" }),
        " Voltar"
      ] }) }),
      /* @__PURE__ */ jsx("div", { className: "flex-1" }),
      /* @__PURE__ */ jsx(Button, { variant: "outline", asChild: true, children: /* @__PURE__ */ jsxs("a", { href: `/projects/${id}/knowledge-areas`, children: [
        /* @__PURE__ */ jsx(BookOpen, { className: "h-4 w-4 mr-2" }),
        "Áreas de Conhecimento"
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      ProjectHeader,
      {
        project,
        organization,
        stakeholders,
        totalPhases,
        completedPhases
      }
    ),
    /* @__PURE__ */ jsx(Stakeholders, { projectId: id }),
    /* @__PURE__ */ jsxs("div", { className: "space-y-6", children: [
      /* @__PURE__ */ jsx(TaskStats, { columns: boardData, isLoading: isBoardLoading }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-foreground", children: viewMode === "phases" ? "Painel de Tarefas" : "Painel de Tarefas" }),
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 bg-muted p-1 rounded-lg", children: [
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: viewMode === "phases" ? "default" : "ghost",
              size: "sm",
              onClick: () => setViewMode("phases"),
              className: "gap-2",
              children: [
                /* @__PURE__ */ jsx(LayoutList, { className: "h-4 w-4" }),
                "Fases"
              ]
            }
          ),
          /* @__PURE__ */ jsxs(
            Button,
            {
              variant: viewMode === "kanban" ? "default" : "ghost",
              size: "sm",
              onClick: () => setViewMode("kanban"),
              className: "gap-2",
              children: [
                /* @__PURE__ */ jsx(KanbanSquare, { className: "h-4 w-4" }),
                "Kanban"
              ]
            }
          )
        ] })
      ] }),
      viewMode === "phases" ? /* @__PURE__ */ jsx(PhaseList, { projectId: id }) : /* @__PURE__ */ jsx(ScrumbanBoard, { projectId: id })
    ] })
  ] });
}

function ProjectPage({ id }) {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(ProjectDetails, { id }) });
}

const $$Astro = createAstro();
const $$id = createComponent(async ($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$Astro, $$props, $$slots);
  Astro2.self = $$id;
  const session = await auth.api.getSession({ headers: Astro2.request.headers });
  if (!session) return Astro2.redirect("/login");
  const { id } = Astro2.params;
  if (!id) return Astro2.redirect("/");
  return renderTemplate`${renderComponent($$result, "DashboardLayout", $$DashboardLayout, { "title": "Detalhes do Projeto" }, { "default": async ($$result2) => renderTemplate` ${renderComponent($$result2, "ProjectPage", ProjectPage, { "client:load": true, "id": id, "client:component-hydration": "load", "client:component-path": "@/components/dashboard/project-page", "client:component-export": "ProjectPage" })} ` })}`;
}, "/home/richard/code/gerenciador-projetos/src/pages/projects/[id].astro", void 0);

const $$file = "/home/richard/code/gerenciador-projetos/src/pages/projects/[id].astro";
const $$url = "/projects/[id]";

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  default: $$id,
  file: $$file,
  url: $$url
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
