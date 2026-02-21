# Notification Smart Reconnection Design

**Date:** 2026-02-21
**Status:** Approved

## Problem

The `NotificationBell` component polls `GET /api/notifications/unread-count` every 30 seconds as a fallback alongside Pusher real-time events. Since Pusher is reliably configured in production, this polling is unnecessary overhead — adding constant server requests with no benefit when the WebSocket connection is healthy.

## Solution

Replace the 30-second polling interval with two event-driven refresh triggers:

1. **Pusher reconnection** — re-fetch unread count when Pusher transitions from a disconnected state back to `connected`
2. **Tab visibility** — re-fetch unread count when the browser tab becomes visible after being hidden for >60 seconds

## Changes

### `src/hooks/usePusher.ts`

- Add `onReconnect` callback parameter to `UsePusherOptions`
- Track Pusher `connection.bind('state_change', ...)` events
- Fire `onReconnect` when state transitions from `disconnected`/`unavailable` to `connected` (skip initial connection)

### `src/components/notifications/NotificationBell.tsx`

- Remove `refetchInterval: 30_000` from the `unread-count` query
- Pass `onReconnect` callback to `usePusher` that invalidates the unread-count query
- Add `visibilitychange` event listener that re-fetches if tab was hidden >60s

### Backend

No changes needed. The `/api/notifications/unread-count` endpoint stays as-is.

## Behavior Summary

| Event | Action |
|---|---|
| Page load | Fetch unread count once |
| Pusher `new-notification` | Optimistic +1 to count |
| Pusher reconnects after disconnect | Re-fetch unread count from server |
| Tab visible after >60s hidden | Re-fetch unread count from server |
| Periodic polling | **Removed** |
