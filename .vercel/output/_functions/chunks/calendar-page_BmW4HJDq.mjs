import { jsxs, jsx } from 'react/jsx-runtime';
import { useState, useMemo } from 'react';
import { useQueryClient, useQuery, useMutation } from '@tanstack/react-query';
import { a as api } from './api-client_QlLf4qLC.mjs';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ListTodo, Plus, Loader2, CheckCircle2, Circle, Trash2, Pin, Calendar, Clock } from 'lucide-react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth, isToday, subMonths, addMonths } from 'date-fns';
import { c as cn } from './auth-client_BChqsPJB.mjs';
import { D as Dialog, a as DialogTrigger, b as DialogContent, c as DialogHeader, d as DialogTitle } from './dialog_Dk6F9O1c.mjs';
import { P as Providers } from './providers_BxSA8Tkj.mjs';

function CalendarView({ date, setDate, tasks, appointments, showProjectNames }) {
  const [currentMonth, setCurrentMonth] = useState(/* @__PURE__ */ new Date());
  const handlePreviousMonth = () => setCurrentMonth((prev) => subMonths(prev, 1));
  const handleNextMonth = () => setCurrentMonth((prev) => addMonths(prev, 1));
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: ptBR });
    const endDate = endOfWeek(monthEnd, { locale: ptBR });
    return eachDayOfInterval({
      start: startDate,
      end: endDate
    });
  }, [currentMonth]);
  const weekDays = useMemo(() => {
    const start = startOfWeek(/* @__PURE__ */ new Date(), { locale: ptBR });
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(start);
      day.setDate(day.getDate() + i);
      return format(day, "eee", { locale: ptBR });
    });
  }, []);
  const hasTask = (day) => tasks.some((t) => {
    if (!t) return false;
    const targetDate = t.startDate ? new Date(t.startDate) : t.endDate ? new Date(t.endDate) : null;
    return targetDate && isSameDay(targetDate, day);
  });
  const hasAppointment = (day) => appointments.some((a) => a && a.date && isSameDay(new Date(a.date), day));
  return /* @__PURE__ */ jsxs("div", { className: "h-full flex flex-col p-8 w-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-8", children: [
      /* @__PURE__ */ jsx("h3", { className: "text-3xl font-bold text-[#1d4e46] capitalize", children: format(currentMonth, "MMMM yyyy", { locale: ptBR }) }),
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handlePreviousMonth,
            className: "p-2 hover:bg-[#f0fdfa] rounded-lg text-[#1d4e46] transition-colors",
            "aria-label": "Mês anterior",
            children: /* @__PURE__ */ jsx(ChevronLeft, { className: "w-6 h-6" })
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            onClick: handleNextMonth,
            className: "p-2 hover:bg-[#f0fdfa] rounded-lg text-[#1d4e46] transition-colors",
            "aria-label": "Próximo mês",
            children: /* @__PURE__ */ jsx(ChevronRight, { className: "w-6 h-6" })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "flex-1 flex flex-col justify-center", children: [
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 mb-4", children: weekDays.map((day) => /* @__PURE__ */ jsx("div", { className: "text-center text-[#64748b] font-semibold text-lg capitalize py-2", children: day }, day)) }),
      /* @__PURE__ */ jsx("div", { className: "grid grid-cols-7 gap-2 flex-1", children: calendarDays.map((day, idx) => {
        const isSelected = date && isSameDay(day, date);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const isTodayDate = isToday(day);
        const dayHasTask = hasTask(day);
        return /* @__PURE__ */ jsxs(
          "button",
          {
            onClick: () => setDate(day),
            className: cn(
              "relative flex items-center justify-center rounded-2xl transition-all duration-200 aspect-square text-xl",
              !isCurrentMonth && "text-gray-300 opacity-50 bg-transparent hover:bg-transparent cursor-default",
              // Dim outside days
              isCurrentMonth && "text-gray-700 hover:bg-[#f0fdfa] hover:scale-105",
              isSelected && "bg-[#1d4e46] text-white hover:bg-[#1d4e46] hover:scale-100 shadow-[0_10px_15px_-3px_rgba(29,78,70,0.3)]",
              isTodayDate && !isSelected && "text-[#1d4e46] font-extrabold"
            ),
            disabled: !isCurrentMonth,
            children: [
              format(day, "d"),
              isTodayDate && !isSelected && !dayHasTask && /* @__PURE__ */ jsx("div", { className: "absolute bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#1d4e46] rounded-full opacity-60" }),
              dayHasTask && /* @__PURE__ */ jsx("div", { className: cn(
                "absolute top-2 right-2 w-2 h-2 rounded-full",
                isSelected ? "bg-white" : "bg-[#1d4e46] ring-2 ring-white dark:ring-card"
              ) }),
              hasAppointment(day) && /* @__PURE__ */ jsx("div", { className: cn(
                "absolute top-2 right-5 w-2 h-2 rounded-full",
                // Shifted left to avoid overlap if both exist
                isSelected ? "bg-white/80" : "bg-orange-500 ring-2 ring-white dark:ring-card"
              ) })
            ]
          },
          day.toString()
        );
      }) })
    ] })
  ] });
}

function DayTaskList({ date, tasks, projectId }) {
  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [priority, setPriority] = useState("medium");
  const queryClient = useQueryClient();
  const { data: phases = [] } = useQuery({
    queryKey: ["phases", projectId],
    queryFn: async () => {
      const res = await api.phases[":projectId"].$get({ param: { projectId } });
      if (!res.ok) return [];
      return await res.json();
    },
    enabled: isCreating && !!projectId
  });
  const { mutate: createTask, isPending } = useMutation({
    mutationFn: async () => {
      if (!selectedPhaseId) throw new Error("Select a phase");
      const res = await api.tasks.$post({
        json: {
          phaseId: selectedPhaseId,
          title: newTaskTitle,
          startDate: date ? date.toISOString() : void 0,
          endDate: date ? date.toISOString() : void 0,
          priority,
          status: "todo"
        }
      });
      if (!res.ok) throw new Error("Failed to create task");
      return await res.json();
    },
    onSuccess: () => {
      setIsCreating(false);
      setNewTaskTitle("");
      queryClient.invalidateQueries({ queryKey: [projectId ? "board" : "tasks", projectId || "dated"] });
    }
  });
  const { mutate: deleteTask } = useMutation({
    mutationFn: async (id) => {
      const res = await api.tasks[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [projectId ? "board" : "tasks", projectId || "dated"] });
    }
  });
  const handleCreate = (e) => {
    e.preventDefault();
    createTask();
  };
  if (!date) {
    return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border h-full flex flex-col items-center justify-center text-muted-foreground text-center", children: [
      /* @__PURE__ */ jsx("div", { className: "w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4", children: /* @__PURE__ */ jsx(ListTodo, { className: "w-6 h-6 opacity-40" }) }),
      /* @__PURE__ */ jsx("p", { children: "Selecione uma data para ver as tarefas" })
    ] });
  }
  const dayTasks = tasks.filter((t) => {
    if (!t) return false;
    const start = t.startDate ? new Date(t.startDate) : null;
    const end = t.endDate ? new Date(t.endDate) : null;
    return start && isSameDay(start, date) || end && isSameDay(end, date);
  });
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col h-full", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-[#1d4e46] capitalize", children: date ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR }) : "" }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-muted-foreground mt-1", children: [
          dayTasks.length,
          " ",
          dayTasks.length === 1 ? "tarefa agendada" : "tarefas agendadas"
        ] })
      ] }),
      projectId && /* @__PURE__ */ jsxs(Dialog, { open: isCreating, onOpenChange: setIsCreating, children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { className: "p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#1d4e46]", children: /* @__PURE__ */ jsx(Plus, { className: "w-5 h-5" }) }) }),
        /* @__PURE__ */ jsxs(DialogContent, { children: [
          /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsxs(DialogTitle, { children: [
            "Nova Tarefa - ",
            format(date, "dd/MM")
          ] }) }),
          /* @__PURE__ */ jsxs("form", { className: "flex-col flex gap-4 mt-4", onSubmit: handleCreate, children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium leading-none mb-2 block", children: "Fase do Projeto" }),
              /* @__PURE__ */ jsxs(
                "select",
                {
                  value: selectedPhaseId,
                  onChange: (e) => setSelectedPhaseId(e.target.value),
                  className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4e46]",
                  required: true,
                  children: [
                    /* @__PURE__ */ jsx("option", { value: "", children: "Selecione a fase..." }),
                    phases.map((p) => /* @__PURE__ */ jsx("option", { value: p.id, children: p.name }, p.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium leading-none mb-2 block", children: "Título" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  autoFocus: true,
                  value: newTaskTitle,
                  onChange: (e) => setNewTaskTitle(e.target.value),
                  placeholder: "Nome da tarefa",
                  className: "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1d4e46]",
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium leading-none mb-2 block", children: "Prioridade" }),
              /* @__PURE__ */ jsx("div", { className: "flex gap-2", children: ["low", "medium", "high"].map((p) => /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => setPriority(p),
                  className: `flex-1 px-3 py-2 rounded-md text-sm font-medium border capitalize transition-all ${priority === p ? "bg-[#1d4e46] text-white border-[#1d4e46]" : "bg-transparent border-input hover:bg-slate-50"}`,
                  children: p === "low" ? "Baixa" : p === "medium" ? "Média" : "Alta"
                },
                p
              )) })
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "submit",
                disabled: isPending || !selectedPhaseId,
                className: "w-full mt-4 py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm",
                children: [
                  isPending && /* @__PURE__ */ jsx(Loader2, { className: "w-4 h-4 animate-spin" }),
                  "Criar Tarefa"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "flex-1 overflow-auto -mr-2 pr-2", children: dayTasks.length === 0 ? /* @__PURE__ */ jsx("div", { className: "h-full flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl m-2", children: /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Nenhuma tarefa para hoje" }) }) : /* @__PURE__ */ jsx("div", { className: "space-y-1", children: dayTasks.map((task) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-start gap-3 flex-1 min-w-0", children: [
        /* @__PURE__ */ jsx("div", { className: "mt-1", children: task.status === "done" ? /* @__PURE__ */ jsx(CheckCircle2, { className: "w-5 h-5 text-green-500" }) : /* @__PURE__ */ jsx(Circle, { className: "w-5 h-5 text-slate-300 group-hover:text-[#1d4e46] transition-colors" }) }),
        /* @__PURE__ */ jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx("h4", { className: `text-sm font-medium transition-colors ${task.status === "done" ? "text-muted-foreground line-through" : "text-foreground"}`, children: task.title }),
            !projectId && task.projectName && /* @__PURE__ */ jsx("span", { className: "text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[100px]", children: task.projectName })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2 mt-1", children: [
            /* @__PURE__ */ jsx("div", { className: `w-1.5 h-1.5 rounded-full ${task.priority === "high" ? "bg-red-500" : task.priority === "medium" ? "bg-yellow-500" : "bg-slate-400"}` }),
            /* @__PURE__ */ jsx("span", { className: `text-[10px] font-semibold uppercase tracking-wider ${task.priority === "high" ? "text-red-700" : task.priority === "medium" ? "text-yellow-700" : "text-slate-500"}`, children: task.priority === "high" ? "Alta" : task.priority === "medium" ? "Média" : "Baixa" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            deleteTask(task.id);
          },
          className: "opacity-0 group-hover:opacity-100 p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all",
          children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" })
        }
      )
    ] }, task.id)) }) })
  ] });
}

function AppointmentWidget({ projectId }) {
  const [isCreating, setIsCreating] = useState(false);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();
  const { data: appointments = [] } = useQuery({
    queryKey: projectId ? ["appointments", projectId] : ["appointments", "global"],
    queryFn: async () => {
      if (projectId) {
        const res = await api.appointments[":projectId"].$get({ param: { projectId } });
        if (!res.ok) return [];
        return await res.json();
      } else {
        const res = await api.appointments.$get();
        if (!res.ok) return [];
        return await res.json();
      }
    }
  });
  const { mutate: createAppointment, isPending } = useMutation({
    mutationFn: async () => {
      const res = await api.appointments.$post({
        json: {
          projectId,
          description,
          date: new Date(date).toISOString()
        }
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      return await res.json();
    },
    onSuccess: () => {
      setIsCreating(false);
      setDate("");
      setDescription("");
      queryClient.invalidateQueries({ queryKey: ["appointments", projectId] });
    }
  });
  const { mutate: deleteAppointment } = useMutation({
    mutationFn: async (id) => {
      const res = await api.appointments[":id"].$delete({ param: { id } });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", projectId] });
    }
  });
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!date || !description) return;
    createAppointment();
  };
  const nextAppointments = appointments.slice(0, 3);
  return /* @__PURE__ */ jsxs("div", { className: "bg-white dark:bg-card rounded-2xl p-8 shadow-sm border border-border flex flex-col", children: [
    /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between mb-6", children: [
      /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
        /* @__PURE__ */ jsx(Pin, { className: "w-5 h-5 text-[#1d4e46] fill-[#1d4e46] rotate-12" }),
        /* @__PURE__ */ jsx("h3", { className: "text-xl font-bold text-[#1d4e46]", children: "Compromissos" })
      ] }),
      /* @__PURE__ */ jsxs(Dialog, { open: isCreating, onOpenChange: setIsCreating, children: [
        /* @__PURE__ */ jsx(DialogTrigger, { asChild: true, children: /* @__PURE__ */ jsx("button", { className: "p-2 hover:bg-[#f0fdfa] rounded-lg transition-colors text-[#1d4e46]", children: /* @__PURE__ */ jsx(Plus, { className: "w-5 h-5" }) }) }),
        /* @__PURE__ */ jsxs(DialogContent, { children: [
          /* @__PURE__ */ jsx(DialogHeader, { children: /* @__PURE__ */ jsx(DialogTitle, { children: "Novo Compromisso" }) }),
          /* @__PURE__ */ jsxs("form", { className: "space-y-4 mt-4", onSubmit: handleSubmit, children: [
            /* @__PURE__ */ jsxs("div", { className: "relative", children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium leading-none mb-2 block", children: "Data e Hora" }),
              /* @__PURE__ */ jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "datetime-local",
                    value: date,
                    onChange: (e) => setDate(e.target.value),
                    className: "w-full pl-4 pr-10 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground",
                    required: true
                  }
                ),
                /* @__PURE__ */ jsx(Calendar, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("label", { className: "text-sm font-medium leading-none mb-2 block", children: "Descrição" }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  type: "text",
                  placeholder: "Nome do compromisso",
                  value: description,
                  onChange: (e) => setDescription(e.target.value),
                  className: "w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#1d4e46]/20 transition-all text-foreground placeholder:text-muted-foreground",
                  required: true
                }
              )
            ] }),
            /* @__PURE__ */ jsxs(
              "button",
              {
                disabled: isPending,
                type: "submit",
                className: "w-full py-2.5 bg-[#1d4e46] text-white rounded-xl font-medium text-sm hover:bg-[#153a34] transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-4",
                children: [
                  isPending ? /* @__PURE__ */ jsx(Loader2, { className: "w-4 h-4 animate-spin" }) : /* @__PURE__ */ jsx(Plus, { className: "w-4 h-4" }),
                  isPending ? "Adicionando..." : "Adicionar Compromisso"
                ]
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("p", { className: "text-sm text-muted-foreground mb-4 -mt-4 ml-7", children: "Próximos eventos agendados" }),
    /* @__PURE__ */ jsx("div", { className: "space-y-2", children: nextAppointments.length === 0 ? /* @__PURE__ */ jsx("div", { className: "flex flex-col items-center justify-center text-center text-muted-foreground/60 dashed border-2 border-slate-100 rounded-xl m-2 p-8", children: /* @__PURE__ */ jsx("p", { className: "text-sm", children: "Nenhum compromisso próximo" }) }) : nextAppointments.map((apt) => /* @__PURE__ */ jsxs("div", { className: "flex items-center justify-between group p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100", children: [
      /* @__PURE__ */ jsxs("div", { className: "text-sm", children: [
        /* @__PURE__ */ jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx("p", { className: "font-medium text-foreground", children: apt.description }),
          !projectId && apt.projectName && /* @__PURE__ */ jsx("span", { className: "text-[8px] px-1 py-0.5 rounded bg-blue-50 text-blue-600 font-bold uppercase truncate max-w-[80px]", children: apt.projectName })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "text-xs text-[#1d4e46]/40 font-medium capitalize mt-1 flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx(Clock, { className: "w-3 h-3" }),
          format(new Date(apt.date), "dd/MM 'às' HH:mm", { locale: ptBR })
        ] })
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            deleteAppointment(apt.id);
          },
          className: "opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all",
          children: /* @__PURE__ */ jsx(Trash2, { className: "w-4 h-4" })
        }
      )
    ] }, apt.id)) })
  ] });
}

function CalendarPage({ projectId }) {
  return /* @__PURE__ */ jsx(Providers, { children: /* @__PURE__ */ jsx(CalendarPageContent, { projectId }) });
}
function CalendarPageContent({ projectId }) {
  const [date, setDate] = useState(/* @__PURE__ */ new Date());
  const { data: tasks = [] } = useQuery({
    queryKey: projectId ? ["board", projectId] : ["tasks", "dated"],
    queryFn: async () => {
      if (projectId) {
        const res = await api.board[":projectId"].$get({ param: { projectId } });
        if (!res.ok) throw new Error();
        const data = await res.json();
        return data.flatMap((col) => col?.cards || []);
      } else {
        const res = await api.tasks.dated.$get();
        if (!res.ok) return [];
        return await res.json();
      }
    }
  });
  const { data: appointments = [] } = useQuery({
    queryKey: projectId ? ["appointments", projectId] : ["appointments", "global"],
    queryFn: async () => {
      if (projectId) {
        const res = await api.appointments[":projectId"].$get({ param: { projectId } });
        if (!res.ok) return [];
        return await res.json();
      } else {
        const res = await api.appointments.$get();
        if (!res.ok) return [];
        return await res.json();
      }
    }
  });
  return /* @__PURE__ */ jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]", children: [
    /* @__PURE__ */ jsx("div", { className: "md:col-span-2 bg-white dark:bg-card rounded-2xl shadow-sm border p-8 flex flex-col", children: /* @__PURE__ */ jsx(
      CalendarView,
      {
        date,
        setDate,
        tasks,
        appointments,
        showProjectNames: !projectId
      }
    ) }),
    /* @__PURE__ */ jsxs("div", { className: "md:col-span-1 h-full flex flex-col gap-6", children: [
      /* @__PURE__ */ jsx("div", { className: "flex-1 min-h-0", children: /* @__PURE__ */ jsx(
        DayTaskList,
        {
          date,
          tasks,
          projectId
        }
      ) }),
      /* @__PURE__ */ jsx(AppointmentWidget, { projectId })
    ] })
  ] });
}

export { CalendarPage as C };
