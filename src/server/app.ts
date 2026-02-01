import { Hono } from 'hono'
import { logger } from 'hono/logger'
import projectsRouter from './routes/projects'
import stakeholdersRouter from './routes/stakeholders'
import boardRouter from './routes/board'

const app = new Hono().basePath('/api')

app.use('*', logger())

app.route('/projects', projectsRouter)
app.route('/stakeholders', stakeholdersRouter)
app.route('/board', boardRouter)

app.get('/', (c) => {
    return c.json({ message: 'Hello Hono!' })
})

export type AppType = typeof app
export default app
