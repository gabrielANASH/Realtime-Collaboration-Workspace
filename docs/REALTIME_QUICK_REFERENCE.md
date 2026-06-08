# Socket.io Realtime Layer - Developer Quick Reference

## Quick Start for Developers

### Initialize Socket on App Load
```typescript
// app/providers.tsx
import { initializeSocket } from '@/lib/socket-client';
import { useAuthStore } from '@/stores/auth-store';

export function Providers({ children }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  
  useEffect(() => {
    if (accessToken) {
      initializeSocket(accessToken);
    }
  }, [accessToken]);
  
  return children;
}
```

### Join Workspace Room
```typescript
import { useWorkspaceRoom } from '@/hooks/use-realtime';

export function DocumentPage({ params }) {
  const { isJoined, error } = useWorkspaceRoom(workspaceId);
  
  // Once joined, can broadcast/receive events in that workspace
}
```

### Listen for Other Users
```typescript
const { users } = useWorkspacePresence(workspaceId);

// users: [
//   { userId: '123', email: 'alice@example.com', name: 'Alice' },
//   { userId: '456', email: 'bob@example.com', name: 'Bob' }
// ]
```

### Broadcast Document Update
```typescript
const { sendDocumentUpdate } = useBroadcastDocumentUpdate(workspaceId);

const handleSave = async (content) => {
  // 1. Save to database
  await updateDocumentAPI(documentId, content);
  
  // 2. Broadcast to other users
  sendDocumentUpdate(documentId, title, content, version);
};
```

### Track Cursor Position
```typescript
const { updateCursor, remoteCursors } = useUserCursor(workspaceId, documentId);

// On editor cursor change:
const handleCursorChange = (line, column) => {
  updateCursor(line, column, '#3b82f6'); // Color code
};

// Show remote users' cursors:
remoteCursors.forEach(cursor => {
  console.log(`User at line ${cursor.line}, column ${cursor.column}`);
});
```

### Listen for Real-time Document Sync
```typescript
const { remoteContent, remoteVersion } = useDocumentSync(documentId);

useEffect(() => {
  if (remoteContent) {
    // Update editor when other user makes changes
    setEditorContent(remoteContent);
  }
}, [remoteContent]);
```

## Architecture Quick Reference

### Backend Modules

| File | Purpose | Key Exports |
|------|---------|-------------|
| `lib/socket.ts` | Socket.io factory | `createSocketServer()` |
| `modules/realtime/socket-auth.middleware.ts` | JWT validation | `socketAuthMiddleware` |
| `modules/realtime/socket-handlers.ts` | Event logic | `handleJoinWorkspaceRoom`, etc. |
| `modules/realtime/socket-namespaces.ts` | Namespace setup | `setupSocketNamespaces` |
| `server.ts` | HTTP + Socket server | Main entry point |

### Frontend Modules

| File | Purpose | Key Exports |
|------|---------|-------------|
| `lib/socket-client.ts` | Socket singleton | `initializeSocket()`, `getSocket()` |
| `hooks/use-realtime.ts` | React hooks | 6 custom hooks |
| `components/markdown-editor.tsx` | Editor component | `MarkdownEditor` |
| `components/document-preview.tsx` | Preview component | `DocumentPreview` |
| `app/providers.tsx` | App-level setup | `Providers` |

### Shared Schemas

| Schema | Purpose |
|--------|---------|
| `socketAuthSchema` | JWT token validation |
| `joinWorkspaceRoomSchema` | Join workspace room |
| `userPresenceSchema` | User online status |
| `userCursorSchema` | Cursor position |
| `documentUpdateSchema` | Document changes |

## Event Types

### Room Management
```typescript
// CLIENT → SERVER
socket.emit('workspace:join', { workspaceId: string })
socket.emit('workspace:leave', { workspaceId: string })

// SERVER → CLIENTS (broadcast to room)
socket.emit('room:joined', { workspaceId, message })
socket.emit('room:left', { workspaceId, message })
```

### Presence
```typescript
// CLIENT → SERVER (broadcasted)
socket.emit('cursor:update', {
  workspaceId: string,
  documentId: string,
  line: number,
  column: number,
  color: string
})

socket.emit('presence:ping', {}) // Keep-alive

// SERVER → CLIENTS (broadcast to room)
socket.emit('user:joined', {
  userId, email, name, workspaceId, status, lastSeen
})
socket.emit('user:left', { userId, workspaceId, leftAt })
socket.emit('user:cursor', { userId, documentId, line, column, color })
socket.emit('presence:pong', {})
```

### Documents
```typescript
// CLIENT → SERVER (broadcasted)
socket.emit('document:update', {
  documentId: string,
  workspaceId: string,
  title?: string,
  content?: string,
  version: number
})

// SERVER → CLIENTS (broadcast to room)
socket.emit('document:updated', {
  documentId, title, content, version, updatedBy, updatedAt
})
```

### System Events
```typescript
// SERVER → CLIENTS
socket.emit('error', {
  code: 'INVALID_PAYLOAD' | 'NOT_WORKSPACE_MEMBER' | ...,
  message: string,
  issues?: any[]
})

// Triggered on disconnect
socket.on('disconnect', (reason) => {
  // Handle graceful cleanup
})
```

## Configuration

### Environment Variables Required
```bash
# Already in .env.example
SOCKET_CORS_ORIGIN=http://localhost:3000
REDIS_URL=redis://localhost:6379  # For production
JWT_ACCESS_SECRET=your-secret
```

### Socket.io Configuration (production)
Located in `apps/api/src/lib/socket.ts`:
- CORS enabled for frontend origin
- WebSocket + polling transport
- 1MB max payload size
- 45s connection timeout
- Exponential reconnection backoff

## Debugging

### Enable Debug Logs (Frontend)
```typescript
// In browser console
localStorage.debug = 'socket.io-client:*';
// Reload page to see logs
```

### Enable Debug Logs (Backend)
```bash
DEBUG=socket.io:* npm run dev
```

### Check Socket Status (Frontend)
```typescript
import { getSocket, isSocketConnected } from '@/lib/socket-client';

const socket = getSocket();
console.log('Connected:', isSocketConnected());
console.log('Socket ID:', socket?.id);
console.log('Rooms:', socket?.rooms); // Set<string>
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Connection refused | Socket.io not running | Ensure `npm run dev` runs server |
| CORS error | Wrong SOCKET_CORS_ORIGIN | Update env var to match frontend URL |
| Auth failed | Invalid JWT | Ensure token passed to initializeSocket |
| Events not received | Not in room | Call useWorkspaceRoom with workspaceId |
| Memory leak | Not cleaning up subscriptions | Check hook cleanup functions |

## Testing Checklist

### Unit Tests
- [ ] Zod schema validation for all event types
- [ ] JWT verification in auth middleware
- [ ] Workspace membership check

### Integration Tests
- [ ] Socket connection with valid JWT
- [ ] Socket rejection with invalid JWT
- [ ] Room join/leave workflow
- [ ] Document update broadcast
- [ ] Cursor position throttling
- [ ] Presence heartbeat

### E2E Tests (Manual)
- [ ] Two users in same workspace → see presence
- [ ] User A edits document → User B sees update
- [ ] User A cursor moves → User B sees cursor
- [ ] Disconnect → reconnect preserves state
- [ ] Workspace member removed → socket disconnects

## Performance Tips

1. **Throttle high-frequency updates**
   - Cursor already throttled at 50ms
   - Add throttling to any >10/sec events

2. **Batch mutations**
   - Group multiple document edits before broadcast
   - Send once per save, not on every keystroke

3. **Monitor room sizes**
   ```typescript
   const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
   ```

4. **Use compression for large payloads**
   - Zlib compression built-in at 1KB threshold
   - Binary protocol available via msgpack

5. **Implement backpressure handling**
   - If server overwhelmed, slow down broadcasts
   - Use Redis adapter for distribution

## Production Readiness

### Before Launch
- ✅ JWT auth implemented
- ✅ Workspace membership verified
- ✅ Zod validation in place
- ✅ Error handling complete
- ⏳ Redis adapter (optional for scale)
- ⏳ Rate limiting (per user)
- ⏳ Monitoring metrics
- ⏳ Load testing

### After Launch
- Monitor connection metrics
- Track error rates
- Analyze latency distribution
- Validate room isolation
- Plan Redis integration if needed

## Security Reminders

🔒 Always validate workspace membership before broadcasting
🔒 Never trust client socket.userId without verifying JWT
🔒 Validate all event payloads with Zod
🔒 Don't send sensitive data in events
🔒 Use HTTPS/WSS in production (not HTTP/WS)
🔒 Implement rate limiting per user
🔒 Log security-relevant events

## Common Patterns

### Pattern 1: Broadcast with Filtering
```typescript
// Only send to admin members
const adminSockets = io.sockets.sockets
  .filter(socket => socket.role === 'admin');

adminSockets.forEach(socket => {
  socket.emit('admin:event', data);
});
```

### Pattern 2: Direct User Messaging
```typescript
// Send to specific user (requires session store)
const socketIds = userSockets.get(userId);
socketIds?.forEach(id => {
  io.to(id).emit('notification', data);
});
```

### Pattern 3: Request/Response Pattern
```typescript
// With ACK callback
socket.emit('query:event', payload, (response) => {
  console.log('Server response:', response);
});

// On server
socket.on('query:event', (payload, callback) => {
  const result = processQuery(payload);
  callback(result); // Send back to client
});
```

## Related Documentation

- [Realtime Architecture](./REALTIME_ARCHITECTURE.md)
- [Implementation Details](./REALTIME_IMPLEMENTATION.md)
- [Visual Architecture](./REALTIME_ARCHITECTURE_VISUAL.md)
- [Socket.io Official Docs](https://socket.io/docs/v4/server-api/)\n- [Zod Validation](https://zod.dev/)
