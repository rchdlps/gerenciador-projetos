import type { APIRoute } from 'astro'
import app from '../../server/app'

export const ALL: APIRoute = ({ request }) => {
    return app.fetch(request)
}
