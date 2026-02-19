/**
 * Generates SVG avatars with user initials on a deterministic colored background.
 * Pure functions — no I/O, no dependencies.
 */

// 16 curated colors with good contrast against white text
const AVATAR_COLORS = [
    '#E53935', // red
    '#D81B60', // pink
    '#8E24AA', // purple
    '#5E35B1', // deep purple
    '#3949AB', // indigo
    '#1E88E5', // blue
    '#039BE5', // light blue
    '#00ACC1', // cyan
    '#00897B', // teal
    '#43A047', // green
    '#7CB342', // light green
    '#C0CA33', // lime
    '#F4511E', // deep orange
    '#6D4C41', // brown
    '#546E7A', // blue grey
    '#757575', // grey
]

/** Simple string hash — deterministic, not cryptographic */
function hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i)
        hash = ((hash << 5) - hash) + char
        hash |= 0 // Convert to 32-bit integer
    }
    return Math.abs(hash)
}

/** Extract initials from a name: "João Silva" → "JS", "Admin" → "A", "" → "?" */
export function getInitials(name: string | null | undefined): string {
    if (!name || !name.trim()) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase()
    }
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/** Get a deterministic color from the palette based on userId */
export function getAvatarColor(userId: string): string {
    return AVATAR_COLORS[hashString(userId) % AVATAR_COLORS.length]
}

/** Generate an SVG avatar with initials and a colored background circle */
export function generateInitialsAvatar(name: string, userId: string): string {
    const initials = getInitials(name)
    const color = getAvatarColor(userId)
    // Font size: smaller for 2-char initials, larger for 1-char
    const fontSize = initials.length > 1 ? 80 : 90

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
<circle cx="100" cy="100" r="100" fill="${color}"/>
<text x="100" y="100" dy="0.35em" text-anchor="middle" fill="white" font-family="system-ui,-apple-system,sans-serif" font-size="${fontSize}" font-weight="600">${initials}</text>
</svg>`
}
