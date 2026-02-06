import { Hono } from 'hono'
import { logger } from 'hono/logger'
import projectsRouter from './routes/projects'
import stakeholdersRouter from './routes/stakeholders'
import boardRouter from './routes/board'
import knowledgeAreasRouter from './routes/knowledge-areas'
import organizationsRouter from './routes/organizations'
import adminRouter from './routes/admin'
import phasesRouter from './routes/phases'
import tasksRouter from './routes/tasks'
import appointmentsRouter from './routes/appointments'
import storageRouter from './routes/storage'
import projectCharterRouter from './routes/project-charter'
import scheduleRouter from './routes/schedule'
import qualityRouter from './routes/quality'

import communicationRouter from './routes/communication'
import procurementRouter from './routes/procurement'

const app = new Hono().basePath('/api')

app.use('*', logger())

// Register Routes
const apiRoutes = app
    .route('/projects', projectsRouter)
    .route('/stakeholders', stakeholdersRouter)
    .route('/board', boardRouter)
    .route('/knowledge-areas', knowledgeAreasRouter)
    .route('/organizations', organizationsRouter)
    .route('/admin', adminRouter)
    .route('/phases', phasesRouter)
    .route('/tasks', tasksRouter)
    .route('/appointments', appointmentsRouter)
    .route('/storage', storageRouter)
    .route('/project-charter', projectCharterRouter)
    .route('/schedule', scheduleRouter)
    .route('/quality', qualityRouter)
    .route('/communication', communicationRouter)
    .route('/procurement', procurementRouter)

app.get('/', (c) => {
    return c.json({ message: 'Hello Hono!' })
})

export type AppType = typeof apiRoutes
export default app
