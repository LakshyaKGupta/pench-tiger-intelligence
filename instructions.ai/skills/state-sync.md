# Skill: Real-Time Synchronization & State Management

Use this skill when building complex frontend state systems, WebSocket subscriptions, optimistic UI updates, or offline-first storage hydration.

## 1. Real-Time WebSockets & Subscriptions
- **Automatic Reconnection**: WebSocket and server-sent event (SSE) listeners must include automatic, exponential backoff reconnection algorithms.
- **Heartbeat Checks**: Implement regular client-to-server heartbeat pings to detect half-open TCP connections early and trigger silent reconnects.

## 2. Optimistic UI Updates & Offline Hydration
- **Optimistic UI**: When mutating server state, update the client UI instantly *before* the network request completes. On request failure, trigger a smooth state rollback with a warning toast.
- **Offline Storage Hydration**: Cache critical application states locally using secure storage wrappers (e.g. IndexedDB or localStorage). Hydrate state on startup so the application remains functional even when offline.
