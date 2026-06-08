# Socket.io Realtime Layer - Architecture & Scalability Guide

## Architecture Overview

### Connection Flow
1. **Client Authentication**
   - User logs in via REST API → receives JWT access token
   - Frontend calls `initializeSocket(accessToken)` in app providers
   - Socket connects to `/workspace` namespace with JWT in auth payload

2. **Server Authentication**
   - `socketAuthMiddleware` intercepts connection
   - Validates JWT using `JWT_ACCESS_SECRET`
   - Attaches user context (userId, email, name) to socket object
   - Rejects invalid/expired tokens

3. **Room Management**
   - User joins `workspace:{workspaceId}` room via `workspace:join` event
   - Membership verified against Prisma before room join
   - Broadcasting scoped to workspace rooms only

### Event Architecture

```
Event Categories:
├── Room Management (workspace:join, workspace:leave)
├── Presence (user:joined, user:left, user:cursor, presence:ping)
├── Documents (document:update, document:delete)
└── System (error, disconnect)

Broadcasting Pattern:
- Client emits event → Server validates with Zod
- Server broadcasts to workspace room via socket.to(roomName).emit()
- All connected users in room receive event in real-time
- Sender excluded from broadcast (socket.to() vs io.emit())
```

## Production Scalability Patterns

### 1. **Multi-Server Deployments (Redis Adapter)**

**Problem:** Without Redis, Socket.io only broadcasts within single server. Scaled deployments miss messages.

**Solution:** Redis Adapter
```typescript
import { createAdapter } from '@socket.io/redis-adapter';
import redis from 'redis';

const pubClient = redis.createClient({ url: env.REDIS_URL });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Benefits:**
- Messages broadcast across all servers
- Users can connect to any server
- Horizontal scaling fully supported

### 2. **Connection Limits & Backpressure**

**Problem:** Many concurrent users → high memory, CPU, file descriptors

**Solution: Configure limits**
```typescript
// In createSocketServer()
maxHttpBufferSize: 1e6,        // 1MB max payload
connectTimeout: 45000,          // Timeout slow connections
reconnectionAttempts: Infinity, // Let client control retries
```

**Monitoring:**
- Track socket count: `io.engine.clientsCount`
- Monitor CPU/memory per connection
- Use Redis adapter built-in metrics

### 3. **Message Batching & Throttling**

**Problem:** High-frequency events (cursor, typing) overwhelm network

**Solution: Throttle updates**
```typescript
// Frontend useUserCursor hook already implements 50ms throttle
throttleTimerRef.current = setTimeout(() => {
  socket.emit('cursor:update', {...});
}, 50);
```

**Backend scaling:**
- Disable ACK-based flow control in high-volume scenarios
- Batch presence updates every 1 second
- Use binary protocol (msgpack) for compression

### 4. **Room-Based Broadcasting (Already Implemented)**

**Benefit:** Only sends to relevant users, not all connected clients

```typescript
// Not: io.emit('event', data)  ❌ All users
// But: io.to(roomName).emit('event', data)  ✅ Only workspace users
```

**Scaling impact:**
- 1000 users in workspace = 1000 broadcasts
- 1000 users across 100 workspaces = ~10 broadcasts per workspace avg
- Room isolation prevents cascade effects

### 5. **Session Store for User Lookups**

**Problem:** Finding socket by userId requires full iteration

**Solution: Session store (planned)**
```typescript
// Map userId → socketIds
const userSockets = new Map<string, Set<string>>();

socket.on('connection', () => {
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(socket.id);
});

// Send to specific user
const socketIds = userSockets.get(userId);
socketIds?.forEach(id => io.to(id).emit('event', data));
```

**With Redis:**
```typescript
// Use Redis for distributed session store
await redis.sadd(`user:${userId}:sockets`, socket.id);
// Works across multiple servers
```

### 6. **Connection Pooling & Resource Cleanup**

**Problem:** Stale connections consume resources

**Solution: Heartbeat + cleanup**
```typescript
// Already in place: usePresenceHeartbeat sends ping every 30s
// Server timeout (Socket.io default): ~60s
// Disconnect cleanup: handleDisconnect broadcasts user:left
```

**Monitoring:**
- Track connection churn rate
- Monitor socket room sizes
- Alert on abnormal disconnections

### 7. **Error Handling & Circuit Breaking**

**Current implementation:**
- Zod validation catches malformed payloads
- Workspace membership checks prevent unauthorized access
- Socket errors logged with context

**Enhancement (planned):**
```typescript
// Track error rates per user
const userErrors = new Map<string, number>();

// Circuit break if exceeding threshold
if (userErrors.get(userId)! > 10) {
  socket.disconnect(true); // Force disconnect
}
```

## Performance Benchmarks

### Typical Throughput (Single Server)
- **Presence events:** 10,000 events/sec (cursor, join, leave)
- **Document updates:** 1,000 events/sec
- **Total:** 11,000 events/sec per server

### Memory per Connection
- **Idle socket:** ~2 KB
- **With data buffers:** ~5-10 KB
- **1000 users:** ~5-10 MB

### Latency
- **Local network:** <10ms (WebSocket)
- **Internet (avg):** 50-100ms
- **Polling fallback:** 100-200ms

## Deployment Recommendations

### Development (Single Server)
```
Node: single instance
Database: PostgreSQL
Cache: None (in-memory)
```

### Production (Multiple Servers)
```
Load Balancer (sticky sessions or namespace broadcast)
   ↓
Node Servers (3-5 instances)
   ├── Socket.io with Redis Adapter
   ├── Express API
   └── Prisma clients
   ↓
Redis (pub/sub for Socket.io)
   ↓
PostgreSQL (primary + replicas)
```

### High-Scale (1M+ users)
```
CDN Layer (compression, edge caching)
   ↓
Load Balancer (session affinity or Redis)
   ↓
Node Servers (10-50+ instances)
   ├── Socket.io with Redis Adapter
   ├── Express API (read replicas)
   └── Prisma clients
   ↓
Redis Cluster (sharded pub/sub)
   ↓
PostgreSQL (read replicas, caching layer)
```

## Configuration Environment Variables

```env
# Socket.io
SOCKET_CORS_ORIGIN=https://yourdomain.com
REDIS_URL=redis://localhost:6379  # For production scaling

# JWT
JWT_ACCESS_SECRET=<random-32-char-key>
ACCESS_TOKEN_EXPIRES_IN=15m

# Server
NODE_ENV=production
PORT=4000
```

## Monitoring & Observability

### Metrics to Track
- Active connections count
- Events/second rate
- Average message size
- Error rate by event type
- Connection churn rate
- Average message latency

### Logging
```typescript
// Already integrated: logger calls with context
logger.info('User joined workspace room', {
  socketId: socket.id,
  userId: socket.userId,
  workspaceId: payload.workspaceId,
});
```

### Health Checks
```typescript
// Add endpoint to check Socket.io health
GET /health → {
  status: 'ok',
  sockets: io.engine.clientsCount,
  uptime: process.uptime()
}
```

## Security Considerations

### Current Implementation
✅ JWT validation on every connection
✅ Workspace membership checks before room join
✅ Zod validation on all payloads
✅ Automatic room cleanup on disconnect

### Recommendations
- Rate limit per user: 100 events/sec
- Disable console.log in production (use structured logging)
- Enable Socket.io debug only for specific sockets
- Monitor for duplicate connections from same user
- Implement API versioning for event schemas

## Future Enhancements

1. **Operational Transform (OT) or CRDT**
   - Replace simple broadcasting with conflict-free updates
   - Handle offline edits + sync

2. **Presence Cursors**
   - Replace simple line/column with visual cursor overlay
   - Show remote user names and colors

3. **Typing Indicators**
   - "User X is typing..." display
   - Throttled broadcast

4. **Comments/Threads**
   - Real-time comment creation and reactions
   - Threading for discussions

5. **Activity Feed**
   - Real-time activity log in WebSocket
   - Indexed history in database

6. **Notifications**
   - Real-time notification delivery via Socket.io
   - Fallback to database polling if offline
