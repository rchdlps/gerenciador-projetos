# Initials Avatar Generation — Design

## Goal

Every user has a non-null avatar image from the moment they register. The avatar displays their initials on a deterministic colored background, ensuring a consistent, polished look across the app, emails, and real-time notifications.

## Architecture

Generate **SVG avatars** with user initials and a **hash-based background color** from a curated palette. Two generation paths ensure avatars always exist:

1. **On registration** — a better-auth `after` hook generates the SVG, uploads to S3, and sets `users.image` to the proxy URL.
2. **On-the-fly fallback** — the avatar proxy endpoint generates one dynamically if the user has no image or the S3 file is missing.

## SVG Generation (`src/lib/avatar-generator.ts`)

Pure function with no dependencies:

```
generateInitialsAvatar(name: string, userId: string) → string (SVG markup)
```

- **Initials:** First letter of first name + first letter of last name (e.g., "João Silva" → "JS"). Single names use one letter. Fallback: "?".
- **Color palette:** 12-16 curated colors with accessible contrast against white text. Color selected via `hash(userId) % palette.length` for deterministic results.
- **SVG:** 200x200 circle with solid background + centered white bold text (~80px).
- **Size:** ~400-600 bytes per avatar.

## Flow

### Registration

```
User created → generateInitialsAvatar(name, userId)
             → storage.uploadFile("avatars/{userId}/initials.svg", svg, "image/svg+xml")
             → users.image = "/api/storage/avatar/{userId}?key=avatars/{userId}/initials.svg"
```

### Avatar proxy fallback

```
GET /api/storage/avatar/{userId} (no key param, or S3 file missing)
  → db lookup users.image
  → if null: generate SVG, upload to S3, update users.image, stream response
  → if set but S3 returns error: regenerate, re-upload, stream response
```

### User uploads custom photo

```
Upload custom photo → replaces users.image with new proxy URL
                    → initials avatar remains in S3 but is no longer referenced
```

## Files Changed

| File | Change |
|------|--------|
| `src/lib/avatar-generator.ts` | **New** — pure SVG generation function + color palette |
| `src/lib/auth.ts` | Add `after` hook on user creation to generate + upload avatar |
| `src/pages/api/storage/avatar/[userId].ts` | Add fallback: if no key and no image, generate on-the-fly |

## Constraints

- No new dependencies — SVG is built with string templates.
- No frontend changes — `AvatarImage src={user.image}` already renders the proxy URL.
- Deterministic colors — same userId always produces the same background color.
- Existing users without avatars get one on next avatar proxy request (on-the-fly path).
