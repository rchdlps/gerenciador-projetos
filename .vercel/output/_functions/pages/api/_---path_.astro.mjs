import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { a as auth, d as db, b as auditLogs, u as users, p as projects, m as memberships, c as projectPhases, s as stakeholders, t as tasks, k as knowledgeAreas, o as organizations, e as appointments, f as attachments } from '../../chunks/auth_Cw0vQzQi.mjs';
import { eq, desc, inArray, and, asc, or, isNotNull } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { S3Client, DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export { renderers } from '../../renderers.mjs';

createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });
  if (!session) {
    c.set("user", null);
    c.set("session", null);
  } else {
    c.set("user", session.user);
    c.set("session", session.session);
  }
  await next();
});
const requireAuth = createMiddleware(async (c, next) => {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers
  });
  if (!session) {
    throw new HTTPException(401, { message: "Unauthorized" });
  }
  c.set("user", session.user);
  c.set("session", session.session);
  await next();
});

async function logAction(params) {
  try {
    await db.insert(auditLogs).values({
      id: nanoid(),
      userId: params.userId,
      organizationId: params.organizationId || null,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null
    });
  } catch (error) {
    console.error("Failed to write audit log:", error);
  }
}

const app$a = new Hono();
app$a.use("*", requireAuth);
app$a.get("/", async (c) => {
  const sessionUser = c.get("user");
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
  if (user && user.globalRole === "super_admin") {
    const allProjects = await db.select().from(projects).orderBy(desc(projects.updatedAt));
    return c.json(allProjects);
  }
  const userMemberships = await db.select({ orgId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, sessionUser.id));
  const orgIds = userMemberships.map((m) => m.orgId);
  if (orgIds.length === 0) {
    return c.json([]);
  }
  const userProjects = await db.select().from(projects).where(inArray(projects.organizationId, orgIds)).orderBy(desc(projects.updatedAt));
  return c.json(userProjects);
});
app$a.post(
  "/",
  zValidator("json", z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    organizationId: z.string().min(1)
  })),
  async (c) => {
    const sessionUser = c.get("user");
    const { name, description, organizationId } = c.req.valid("json");
    const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, sessionUser.id),
        eq(memberships.organizationId, organizationId)
      )
    });
    const isSuperAdmin = user && user.globalRole === "super_admin";
    if (!membership && !isSuperAdmin) {
      return c.json({ error: "Forbidden: You do not have access to this organization" }, 403);
    }
    if (membership && membership.role === "viewer" && !isSuperAdmin) {
      return c.json({ error: "Forbidden: Viewers cannot create projects" }, 403);
    }
    const id = nanoid();
    const [newProject] = await db.insert(projects).values({
      id,
      name,
      description,
      userId: sessionUser.id,
      // Creator
      organizationId
    }).returning();
    const standardPhases = [
      "Iniciação",
      "Planejamento",
      "Execução",
      "Monitoramento e Controle",
      "Encerramento"
    ];
    let phaseOrder = 0;
    for (const phaseName of standardPhases) {
      await db.insert(projectPhases).values({
        id: nanoid(),
        projectId: id,
        name: phaseName,
        order: phaseOrder++
      });
    }
    await logAction({
      userId: sessionUser.id,
      organizationId,
      action: "CREATE",
      resource: "PROJECT",
      resourceId: id,
      metadata: { name }
    });
    return c.json(newProject);
  }
);
app$a.get("/:id", async (c) => {
  const sessionUser = c.get("user");
  const id = c.req.param("id");
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return c.json({ error: "Not found" }, 404);
  if (project.organizationId) {
    if (user && user.globalRole === "super_admin") {
      return c.json(project);
    }
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, sessionUser.id),
        eq(memberships.organizationId, project.organizationId)
      )
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  } else {
    if (user && user.globalRole === "super_admin") return c.json(project);
    if (project.userId !== sessionUser.id) return c.json({ error: "Forbidden" }, 403);
  }
  return c.json(project);
});
app$a.get("/:id/members", async (c) => {
  const sessionUser = c.get("user");
  const id = c.req.param("id");
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
  const [project] = await db.select().from(projects).where(eq(projects.id, id));
  if (!project) return c.json({ error: "Not found" }, 404);
  if (!project.organizationId) {
    const [owner] = await db.select().from(users).where(eq(users.id, project.userId));
    return c.json([owner]);
  }
  if (!user || user.globalRole !== "super_admin") {
    const membership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, sessionUser.id),
        eq(memberships.organizationId, project.organizationId)
      )
    });
    if (!membership) return c.json({ error: "Forbidden" }, 403);
  }
  const members = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    image: users.image,
    role: memberships.role
  }).from(memberships).innerJoin(users, eq(users.id, memberships.userId)).where(eq(memberships.organizationId, project.organizationId));
  return c.json(members);
});

const app$9 = new Hono();
const getSession$6 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$9.get("/:projectId", async (c) => {
  const session = await getSession$6(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("projectId");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const projectStakeholders = await db.select().from(stakeholders).where(eq(stakeholders.projectId, projectId));
  return c.json(projectStakeholders);
});
app$9.post(
  "/:projectId",
  zValidator("json", z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    level: z.string().min(1),
    email: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$6(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("projectId");
    const { name, role, level, email } = c.req.valid("json");
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = nanoid();
    const [newStakeholder] = await db.insert(stakeholders).values({
      id,
      projectId,
      name,
      role,
      level,
      email
    }).returning();
    return c.json(newStakeholder);
  }
);
app$9.put(
  "/:id",
  zValidator("json", z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    level: z.string().min(1),
    email: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$6(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const { name, role, level, email } = c.req.valid("json");
    const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id));
    if (!stakeholder) return c.json({ error: "Not found" }, 404);
    const [project] = await db.select().from(projects).where(eq(projects.id, stakeholder.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const [updated] = await db.update(stakeholders).set({ name, role, level, email }).where(eq(stakeholders.id, id)).returning();
    return c.json(updated);
  }
);
app$9.delete("/:id", async (c) => {
  const session = await getSession$6(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const [stakeholder] = await db.select().from(stakeholders).where(eq(stakeholders.id, id));
  if (!stakeholder) return c.json({ error: "Not found" }, 404);
  const [project] = await db.select().from(projects).where(eq(projects.id, stakeholder.projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  await db.delete(stakeholders).where(eq(stakeholders.id, id));
  return c.json({ success: true });
});

const app$8 = new Hono();
const getSession$5 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$8.get("/:projectId", async (c) => {
  const session = await getSession$5(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("projectId");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const projectTasksRaw = await db.select({
    task: tasks,
    assigneeUser: users,
    assigneeStakeholder: stakeholders
  }).from(tasks).innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id)).leftJoin(users, eq(tasks.assigneeId, users.id)).leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id)).where(eq(projectPhases.projectId, projectId)).orderBy(asc(tasks.order));
  const projectTasks = projectTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
    let assignee = void 0;
    if (assigneeStakeholder) {
      assignee = {
        name: assigneeStakeholder.name,
        image: ""
        // Stakeholders don't have images yet
      };
    } else if (assigneeUser) {
      assignee = {
        name: assigneeUser.name,
        image: assigneeUser.image || ""
      };
    }
    return {
      id: task.id,
      title: task.title,
      content: task.title,
      status: task.status,
      priority: task.priority,
      order: task.order,
      description: task.description,
      endDate: task.endDate,
      startDate: task.startDate,
      assignee
    };
  });
  const columns = [
    { id: "todo", name: "Não Iniciada", cards: [] },
    { id: "in_progress", name: "Em Andamento", cards: [] },
    { id: "review", name: "Em Revisão", cards: [] },
    { id: "done", name: "Concluída", cards: [] }
  ];
  projectTasks.forEach((task) => {
    const column = columns.find((c2) => c2.id === task.status);
    if (column) {
      column.cards.push(task);
    } else {
      columns[0].cards.push(task);
    }
  });
  return c.json(columns);
});
app$8.patch(
  "/reorder",
  zValidator("json", z.object({
    items: z.array(z.object({
      id: z.string(),
      status: z.string(),
      order: z.number()
    }))
  })),
  async (c) => {
    const session = await getSession$5(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { items } = c.req.valid("json");
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(tasks).set({
          status: item.status,
          order: item.order
        }).where(eq(tasks.id, item.id));
      }
    });
    return c.json({ success: true });
  }
);
app$8.patch(
  "/cards/:id/move",
  zValidator("json", z.object({ columnId: z.string() })),
  async (c) => {
    const session = await getSession$5(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const { columnId } = c.req.valid("json");
    await db.update(tasks).set({ status: columnId }).where(eq(tasks.id, id));
    return c.json({ success: true });
  }
);

const app$7 = new Hono();
const getSession$4 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$7.get("/:projectId", async (c) => {
  const session = await getSession$4(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("projectId");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
    return c.json({ error: "Forbidden" }, 403);
  }
  const areas = await db.select().from(knowledgeAreas).where(eq(knowledgeAreas.projectId, projectId));
  return c.json(areas);
});
app$7.put(
  "/:projectId/:area",
  zValidator("json", z.object({ content: z.string() })),
  async (c) => {
    const session = await getSession$4(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("projectId");
    const area = c.req.param("area");
    const { content } = c.req.valid("json");
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if ((!user || user.globalRole !== "super_admin") && project.userId !== session.user.id) {
      return c.json({ error: "Forbidden" }, 403);
    }
    const [existing] = await db.select().from(knowledgeAreas).where(
      and(
        eq(knowledgeAreas.projectId, projectId),
        eq(knowledgeAreas.area, area)
      )
    );
    if (existing) {
      const [updated] = await db.update(knowledgeAreas).set({ content, updatedAt: /* @__PURE__ */ new Date() }).where(eq(knowledgeAreas.id, existing.id)).returning();
      return c.json(updated);
    } else {
      const [created] = await db.insert(knowledgeAreas).values({
        id: nanoid(),
        projectId,
        area,
        content
      }).returning();
      return c.json(created);
    }
  }
);

const app$6 = new Hono();
app$6.use("*", requireAuth);
app$6.get("/", async (c) => {
  const sessionUser = c.get("user");
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
  if (user && user.globalRole === "super_admin") {
    const allOrgs = await db.select().from(organizations);
    return c.json(allOrgs.map((o) => ({
      ...o,
      userRole: "super_admin"
    })));
  }
  const userOrgs = await db.select({
    id: organizations.id,
    name: organizations.name,
    code: organizations.code,
    logoUrl: organizations.logoUrl,
    userRole: memberships.role
  }).from(memberships).innerJoin(organizations, eq(memberships.organizationId, organizations.id)).where(eq(memberships.userId, sessionUser.id));
  return c.json(userOrgs);
});
app$6.get("/:id", async (c) => {
  const sessionUser = c.get("user");
  const id = c.req.param("id");
  const [user] = await db.select().from(users).where(eq(users.id, sessionUser.id));
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
  if (!org) return c.json({ error: "Not found" }, 404);
  if (user && user.globalRole === "super_admin") {
    return c.json(org);
  }
  const membership = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, sessionUser.id),
      eq(memberships.organizationId, id)
    )
  });
  if (!membership) return c.json({ error: "Forbidden" }, 403);
  return c.json(org);
});
app$6.post(
  "/",
  zValidator("json", z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    logoUrl: z.string().optional(),
    secretario: z.string().optional(),
    secretariaAdjunta: z.string().optional(),
    diretoriaTecnica: z.string().optional()
  })),
  async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "super_admin") ;
    const { name, code, logoUrl, secretario, secretariaAdjunta, diretoriaTecnica } = c.req.valid("json");
    const id = nanoid();
    await db.insert(organizations).values({
      id,
      name,
      code,
      logoUrl,
      secretario,
      secretariaAdjunta,
      diretoriaTecnica
    });
    await db.insert(memberships).values({
      userId: user.id,
      organizationId: id,
      role: "secretario"
    });
    return c.json({ id, name, code });
  }
);
app$6.put(
  "/:id",
  zValidator("json", z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    logoUrl: z.string().optional(),
    secretario: z.string().optional(),
    secretariaAdjunta: z.string().optional(),
    diretoriaTecnica: z.string().optional()
  })),
  async (c) => {
    const user = c.get("user");
    if (user.globalRole !== "super_admin") {
      return c.json({ error: "Forbidden" }, 403);
    }
    const id = c.req.param("id");
    const { name, code, logoUrl, secretario, secretariaAdjunta, diretoriaTecnica } = c.req.valid("json");
    await db.update(organizations).set({
      name,
      code,
      logoUrl,
      secretario,
      secretariaAdjunta,
      diretoriaTecnica,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(organizations.id, id));
    return c.json({ id, name, code, logoUrl });
  }
);

const app$5 = new Hono();
app$5.use("*", requireAuth);
app$5.use("*", async (c, next) => {
  const user = c.get("user");
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id));
  if (dbUser?.globalRole !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await next();
});
app$5.get("/audit-logs", async (c) => {
  const logs = await db.select({
    id: auditLogs.id,
    action: auditLogs.action,
    resource: auditLogs.resource,
    resourceId: auditLogs.resourceId,
    createdAt: auditLogs.createdAt,
    metadata: auditLogs.metadata,
    userName: users.name,
    userEmail: users.email
  }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)).orderBy(desc(auditLogs.createdAt)).limit(50);
  return c.json(logs);
});

const app$4 = new Hono();
const getSession$3 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$4.get("/:projectId", async (c) => {
  const session = await getSession$3(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("projectId");
  const phases = await db.select().from(projectPhases).where(eq(projectPhases.projectId, projectId)).orderBy(asc(projectPhases.order), asc(projectPhases.createdAt));
  const fasesWithTasks = await Promise.all(phases.map(async (phase) => {
    const localTasksRaw = await db.select({
      task: tasks,
      assigneeUser: users,
      assigneeStakeholder: stakeholders
    }).from(tasks).leftJoin(users, eq(tasks.assigneeId, users.id)).leftJoin(stakeholders, eq(tasks.stakeholderId, stakeholders.id)).where(eq(tasks.phaseId, phase.id)).orderBy(asc(tasks.order));
    const localTasks = localTasksRaw.map(({ task, assigneeUser, assigneeStakeholder }) => {
      let assignee = null;
      if (assigneeStakeholder) {
        assignee = {
          id: assigneeStakeholder.id,
          name: assigneeStakeholder.name,
          image: null,
          // Stakeholders don't have images yet
          role: assigneeStakeholder.role,
          type: "stakeholder"
        };
      } else if (assigneeUser) {
        assignee = {
          id: assigneeUser.id,
          name: assigneeUser.name,
          image: assigneeUser.image,
          type: "user"
        };
      }
      return {
        ...task,
        assignee
      };
    });
    return { ...phase, tasks: localTasks };
  }));
  return c.json(fasesWithTasks);
});
app$4.post(
  "/:projectId",
  zValidator("json", z.object({
    name: z.string(),
    description: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$3(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("projectId");
    const { name, description } = c.req.valid("json");
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!user) return c.json({ error: "User not found" }, 401);
    const isOwner = project.userId === session.user.id;
    const isSuperAdmin = user.globalRole === "super_admin";
    if (!isOwner && !isSuperAdmin) return c.json({ error: "Forbidden" }, 403);
    const [max] = await db.select({ value: projectPhases.order }).from(projectPhases).where(eq(projectPhases.projectId, projectId)).orderBy(desc(projectPhases.order)).limit(1);
    const nextOrder = (max?.value ?? -1) + 1;
    const id = nanoid();
    const [newPhase] = await db.insert(projectPhases).values({
      id,
      projectId,
      name,
      description,
      order: nextOrder
    }).returning();
    return c.json(newPhase);
  }
);
app$4.patch(
  "/:projectId/reorder",
  zValidator("json", z.object({
    items: z.array(z.object({
      id: z.string(),
      order: z.number()
    }))
  })),
  async (c) => {
    const session = await getSession$3(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const projectId = c.req.param("projectId");
    const { items } = c.req.valid("json");
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!user) return c.json({ error: "User not found" }, 401);
    const isOwner = project.userId === session.user.id;
    const isSuperAdmin = user.globalRole === "super_admin";
    if (!isOwner && !isSuperAdmin) return c.json({ error: "Forbidden" }, 403);
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(projectPhases).set({ order: item.order }).where(and(
          eq(projectPhases.id, item.id),
          eq(projectPhases.projectId, projectId)
        ));
      }
    });
    return c.json({ success: true });
  }
);
app$4.patch(
  "/:id",
  zValidator("json", z.object({
    name: z.string().optional(),
    description: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$3(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const { name, description } = c.req.valid("json");
    const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
    if (!phase) return c.json({ error: "Not found" }, 404);
    const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
    if (!user) return c.json({ error: "User not found" }, 401);
    const isOwner = project.userId === session.user.id;
    const isSuperAdmin = user.globalRole === "super_admin";
    if (!isOwner && !isSuperAdmin) return c.json({ error: "Forbidden" }, 403);
    const [updatedPhase] = await db.update(projectPhases).set({ ...name && { name }, ...description !== void 0 && { description } }).where(eq(projectPhases.id, id)).returning();
    return c.json(updatedPhase);
  }
);
app$4.delete("/:id", async (c) => {
  const session = await getSession$3(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const [phase] = await db.select().from(projectPhases).where(eq(projectPhases.id, id));
  if (!phase) return c.json({ error: "Not found" }, 404);
  const [project] = await db.select().from(projects).where(eq(projects.id, phase.projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  if (!user) return c.json({ error: "User not found" }, 401);
  const isOwner = project.userId === session.user.id;
  const isSuperAdmin = user.globalRole === "super_admin";
  if (!isOwner && !isSuperAdmin) return c.json({ error: "Forbidden" }, 403);
  await db.delete(projectPhases).where(eq(projectPhases.id, id));
  return c.json({ success: true });
});

const app$3 = new Hono();
const getSession$2 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$3.get("/dated", async (c) => {
  const session = await getSession$2(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  let tasksQuery;
  const dateCondition = (t) => or(isNotNull(t.startDate), isNotNull(t.endDate));
  if (user && user.globalRole === "super_admin") {
    tasksQuery = db.select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
      projectId: projectPhases.projectId,
      projectName: projects.name
    }).from(tasks).innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id)).innerJoin(projects, eq(projectPhases.projectId, projects.id)).where(dateCondition(tasks)).orderBy(asc(tasks.endDate));
  } else {
    const userMemberships = await db.select({ orgId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, session.user.id));
    const orgIds = userMemberships.map((m) => m.orgId);
    if (orgIds.length === 0) return c.json([]);
    tasksQuery = db.select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      startDate: tasks.startDate,
      endDate: tasks.endDate,
      projectId: projectPhases.projectId,
      projectName: projects.name
    }).from(tasks).innerJoin(projectPhases, eq(tasks.phaseId, projectPhases.id)).innerJoin(projects, eq(projectPhases.projectId, projects.id)).where(and(
      inArray(projects.organizationId, orgIds),
      dateCondition(tasks)
    )).orderBy(asc(tasks.endDate));
  }
  const results = await tasksQuery;
  return c.json(results);
});
app$3.post(
  "/",
  zValidator("json", z.object({
    phaseId: z.string(),
    title: z.string(),
    description: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    assigneeId: z.string().optional(),
    stakeholderId: z.string().optional(),
    priority: z.string().optional(),
    status: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$2(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const data = c.req.valid("json");
    const id = nanoid();
    const [newTask] = await db.insert(tasks).values({
      id,
      phaseId: data.phaseId,
      title: data.title,
      description: data.description,
      assigneeId: data.assigneeId || null,
      stakeholderId: data.stakeholderId || null,
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      priority: data.priority || "medium",
      status: data.status || "todo"
    }).returning();
    return c.json(newTask);
  }
);
app$3.patch(
  "/reorder",
  zValidator("json", z.object({
    items: z.array(z.object({
      id: z.string(),
      phaseId: z.string(),
      order: z.number()
    }))
  })),
  async (c) => {
    const session = await getSession$2(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { items } = c.req.valid("json");
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(tasks).set({
          phaseId: item.phaseId,
          order: item.order
        }).where(eq(tasks.id, item.id));
      }
    });
    return c.json({ success: true });
  }
);
app$3.patch(
  "/:id",
  zValidator("json", z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    startDate: z.string().optional().nullable(),
    endDate: z.string().optional().nullable(),
    assigneeId: z.string().optional().nullable(),
    stakeholderId: z.string().optional().nullable(),
    priority: z.string().optional(),
    status: z.string().optional()
  })),
  async (c) => {
    const session = await getSession$2(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const id = c.req.param("id");
    const data = c.req.valid("json");
    const updateData = { ...data };
    if (data.startDate) updateData.startDate = new Date(data.startDate);
    if (data.endDate) updateData.endDate = new Date(data.endDate);
    if (data.startDate === null) updateData.startDate = null;
    if (data.endDate === null) updateData.endDate = null;
    const [updatedTask] = await db.update(tasks).set(updateData).where(eq(tasks.id, id)).returning();
    return c.json(updatedTask);
  }
);
app$3.delete("/:id", async (c) => {
  const session = await getSession$2(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  await db.delete(tasks).where(eq(tasks.id, id));
  return c.json({ success: true });
});
app$3.patch(
  "/reorder",
  zValidator("json", z.object({
    items: z.array(z.object({
      id: z.string(),
      phaseId: z.string(),
      order: z.number()
    }))
  })),
  async (c) => {
    const session = await getSession$2(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { items } = c.req.valid("json");
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx.update(tasks).set({
          phaseId: item.phaseId,
          order: item.order
        }).where(eq(tasks.id, item.id));
      }
    });
    return c.json({ success: true });
  }
);

const app$2 = new Hono();
const getSession$1 = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$2.get("/", async (c) => {
  const session = await getSession$1(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const [user] = await db.select().from(users).where(eq(users.id, session.user.id));
  let appointmentsQuery;
  if (user && user.globalRole === "super_admin") {
    appointmentsQuery = db.select({
      id: appointments.id,
      description: appointments.description,
      date: appointments.date,
      projectId: appointments.projectId,
      projectName: projects.name
    }).from(appointments).innerJoin(projects, eq(appointments.projectId, projects.id)).orderBy(desc(appointments.date));
  } else {
    const userMemberships = await db.select({ orgId: memberships.organizationId }).from(memberships).where(eq(memberships.userId, session.user.id));
    const orgIds = userMemberships.map((m) => m.orgId);
    if (orgIds.length === 0) return c.json([]);
    appointmentsQuery = db.select({
      id: appointments.id,
      description: appointments.description,
      date: appointments.date,
      projectId: appointments.projectId,
      projectName: projects.name
    }).from(appointments).innerJoin(projects, eq(appointments.projectId, projects.id)).where(inArray(projects.organizationId, orgIds)).orderBy(desc(appointments.date));
  }
  const results = await appointmentsQuery;
  console.log(`[DEBUG] Appointments Request:`, {
    userId: session.user.id,
    role: user?.globalRole,
    // orgIds: orgIds || 'super_admin',
    count: results.length
  });
  return c.json(results);
});
app$2.get("/:projectId", async (c) => {
  const session = await getSession$1(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const projectId = c.req.param("projectId");
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return c.json({ error: "Project not found" }, 404);
  const projectAppointments = await db.select().from(appointments).where(eq(appointments.projectId, projectId)).orderBy(desc(appointments.date));
  console.log(`[DEBUG] Project Appointments:`, {
    projectId,
    count: projectAppointments.length,
    first: projectAppointments[0]
  });
  return c.json(projectAppointments);
});
app$2.post(
  "/",
  zValidator("json", z.object({
    projectId: z.string(),
    description: z.string(),
    date: z.string()
  })),
  async (c) => {
    const session = await getSession$1(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { projectId, description, date } = c.req.valid("json");
    const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
    if (!project) return c.json({ error: "Project not found" }, 404);
    const id = nanoid();
    const [newAppointment] = await db.insert(appointments).values({
      id,
      projectId,
      description,
      date: new Date(date)
    }).returning();
    return c.json(newAppointment);
  }
);
app$2.delete("/:id", async (c) => {
  const session = await getSession$1(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  await db.delete(appointments).where(eq(appointments.id, id));
  return c.json({ success: true });
});

const s3 = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin"
  },
  forcePathStyle: true
  // Needed for MinIO
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME || "gerenciador-projetos";
const storage = {
  // Generate Pre-signed URL for Upload (PUT)
  getUploadUrl: async (key, fileType) => {
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ContentType: fileType
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
  },
  // Generate Pre-signed URL for Download (GET)
  getDownloadUrl: async (key) => {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    return await getSignedUrl(s3, command, { expiresIn: 3600 });
  },
  // Delete file
  deleteFile: async (key) => {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    await s3.send(command);
  },
  // Check if bucket exists/Create bucket (optional util)
  ensureBucket: async () => {
  }
};

const app$1 = new Hono();
const getSession = async (c) => {
  return await auth.api.getSession({ headers: c.req.raw.headers });
};
app$1.post(
  "/presigned-url",
  zValidator("json", z.object({
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    entityId: z.string(),
    entityType: z.enum(["task", "project", "comment"])
  })),
  async (c) => {
    const session = await getSession(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const { fileName, fileType, entityId } = c.req.valid("json");
    const key = `${entityId}/${nanoid()}-${fileName}`;
    const url = await storage.getUploadUrl(key, fileType);
    return c.json({ url, key });
  }
);
app$1.post(
  "/confirm",
  zValidator("json", z.object({
    fileName: z.string(),
    fileType: z.string(),
    fileSize: z.number(),
    key: z.string(),
    entityId: z.string(),
    entityType: z.enum(["task", "project", "comment"])
  })),
  async (c) => {
    const session = await getSession(c);
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const data = c.req.valid("json");
    const [attachment] = await db.insert(attachments).values({
      id: nanoid(),
      ...data,
      uploadedBy: session.user.id
    }).returning();
    const signedUrl = await storage.getDownloadUrl(data.key);
    return c.json({ ...attachment, url: signedUrl });
  }
);
app$1.get("/:entityId", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const entityId = c.req.param("entityId");
  const files = await db.select().from(attachments).where(eq(attachments.entityId, entityId));
  const filesWithUrls = await Promise.all(files.map(async (file) => {
    const url = await storage.getDownloadUrl(file.key);
    return { ...file, url };
  }));
  return c.json(filesWithUrls);
});
app$1.delete("/:id", async (c) => {
  const session = await getSession(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  const [file] = await db.select().from(attachments).where(eq(attachments.id, id));
  if (!file) return c.json({ error: "Not found" }, 404);
  if (file.uploadedBy !== session.user.id && session.user.globalRole !== "super_admin") {
    return c.json({ error: "Forbidden" }, 403);
  }
  await storage.deleteFile(file.key);
  await db.delete(attachments).where(eq(attachments.id, id));
  return c.json({ success: true });
});

const app = new Hono().basePath("/api");
app.use("*", logger());
app.route("/projects", app$a);
app.route("/stakeholders", app$9);
app.route("/board", app$8);
app.route("/knowledge-areas", app$7);
app.route("/organizations", app$6);
app.route("/admin", app$5);
app.route("/phases", app$4);
app.route("/tasks", app$3);
app.route("/appointments", app$2);
app.route("/storage", app$1);
app.get("/", (c) => {
  return c.json({ message: "Hello Hono!" });
});

const ALL = ({ request }) => app.fetch(request);

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
    __proto__: null,
    ALL
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
