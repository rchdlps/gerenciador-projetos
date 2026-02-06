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

const app = new Hono().basePath('/api')

app.use('*', logger())

app.route('/projects', projectsRouter)
app.route('/stakeholders', stakeholdersRouter)
app.route('/board', boardRouter)
app.route('/knowledge-areas', knowledgeAreasRouter)
app.route('/organizations', organizationsRouter)
app.route('/admin', adminRouter)
app.route('/phases', phasesRouter)
app.route('/tasks', tasksRouter)
app.route('/appointments', appointmentsRouter)
app.route('/storage', storageRouter)
app.route('/project-charter', projectCharterRouter)
app.route('/schedule', scheduleRouter)
app.route('/quality', qualityRouter)

app.get('/', (c) => {
    return c.json({ message: 'Hello Hono!' })
})

export type AppType = typeof app
export default app
