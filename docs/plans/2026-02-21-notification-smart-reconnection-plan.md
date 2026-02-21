# Notification Smart Reconnection Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the 30-second notification polling with event-driven refresh triggers (Pusher reconnection + tab visibility).

**Architecture:** The `usePusher` hook gains an `onReconnect` callback that fires when Pusher transitions back to `connected` after a disconnect. `NotificationBell` drops its `refetchInterval` and instead invalidates the unread-count query on reconnect and on tab visibility change (after >60s hidden).

**Tech Stack:** React hooks, pusher-js connection state events, `document.visibilitychange` API, @tanstack/react-query

---

### Task 1: Add `onReconnect` callback to `usePusher` hook

**Files:**
- Modify: `src/hooks/usePusher.ts`

**Step 1: Update the `UsePusherOptions` type**

Add `onReconnect` to the options type at line 12:

```typescript
type UsePusherOptions = {
    userId: string;
    onNotification?: (notification: PusherNotification) => void;
    onReconnect?: () => void;
};
```

**Step 2: Add connection state tracking inside `initPusher`**

In `usePusher`, destructure `onReconnect` from options, then after `pusherInstance = new Pusher(...)` (line 42), add connection state tracking:

```typescript
export function usePusher({ userId, onNotification, onReconnect }: UsePusherOptions) {
```

Then after the `new Pusher(...)` call and before `channel = pusherInstance.subscribe(...)`, add:

```typescript
                let wasDisconnected = false;

                pusherInstance.connection.bind("state_change", (states: { previous: string; current: string }) => {
                    if (states.current === "disconnected" || states.current === "unavailable") {
                        wasDisconnected = true;
                        setIsConnected(false);
                    }
                    if (states.current === "connected" && wasDisconnected) {
                        wasDisconnected = false;
                        setIsConnected(true);
                        onReconnect?.();
                    }
                });
```

**Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to usePusher.ts

**Step 4: Commit**

```bash
git add src/hooks/usePusher.ts
git commit -m "feat: add onReconnect callback to usePusher hook"
```

---

### Task 2: Remove polling and add reconnect handler in NotificationBell

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`

**Step 1: Remove `refetchInterval` from unread-count query**

In `NotificationBellInner` (line 44-53), remove the `refetchInterval: 30_000` line:

```typescript
    // Fetch unread count (once on mount, then event-driven)
    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: async () => {
            const res = await fetch("/api/notifications/unread-count");
            if (!res.ok) return 0;
            const data = await res.json();
            return data.count || 0;
        },
    });
```

**Step 2: Add `onReconnect` handler and pass to `usePusher`**

Add a `handleReconnect` callback and update the `usePusher` call (around lines 90-95):

```typescript
    // Re-fetch unread count when Pusher reconnects after a disconnect
    const handleReconnect = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
    }, [queryClient]);

    usePusher({ userId, onNotification: handleNewNotification, onReconnect: handleReconnect });
```

**Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "feat: replace notification polling with Pusher reconnection handler"
```

---

### Task 3: Add tab visibility refresh to NotificationBell

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`

**Step 1: Add `useEffect` import (already imported as `useState`)**

Update the import at line 1 to include `useEffect`:

```typescript
import { useState, useCallback, useEffect } from "react";
```

**Step 2: Add visibility change handler**

Add this `useEffect` inside `NotificationBellInner`, after the `usePusher` call:

```typescript
    // Re-fetch unread count when tab becomes visible after being hidden >60s
    useEffect(() => {
        let hiddenAt: number | null = null;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                hiddenAt = Date.now();
            } else if (hiddenAt && Date.now() - hiddenAt > 60_000) {
                queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
                queryClient.invalidateQueries({ queryKey: ['notifications', 'recent'] });
                hiddenAt = null;
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, [queryClient]);
```

**Step 3: Run type check**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

**Step 4: Run dev server and verify manually**

Run: `npm run dev`

Manual test:
1. Open the app, check that notification bell loads with correct count
2. Open browser devtools Network tab — confirm NO periodic `/unread-count` requests
3. Switch to another tab, wait >60s, switch back — confirm ONE `/unread-count` request fires

**Step 5: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "feat: add tab visibility refresh for notification unread count"
```

---

### Task 4: Final verification and cleanup

**Step 1: Verify no remaining polling references**

Run: `grep -rn "refetchInterval" src/components/notifications/`
Expected: No matches

Run: `grep -rn "30_000\|30000" src/components/notifications/`
Expected: No matches

**Step 2: Run full test suite**

Run: `npm run test:run`
Expected: All existing tests pass (no tests exist for these files yet, so no regressions)

**Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 4: Final commit (if any cleanup needed)**

If no changes needed, skip this step. Otherwise:

```bash
git add -A
git commit -m "chore: clean up notification polling removal"
```
