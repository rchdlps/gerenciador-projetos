import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
    baseURL: typeof window === "undefined"
        ? import.meta.env.PUBLIC_BETTER_AUTH_URL || "http://localhost:4321/api/auth"
        : window.location.origin + "/api/auth"
})
