import type { APIRoute } from 'astro'
import app from '../../server/app'

export const ALL: APIRoute = ({ request }) => {
    console.log(`[API] ${request.method} ${request.url}`)
    return app.fetch(request)
}
