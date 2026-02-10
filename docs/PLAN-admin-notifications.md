# Admin Notification Management System - Implementation Plan

**Created:** 2026-02-10  
**Objective:** Build admin pages for sending notifications to users/organizations and a user-facing notification history page

---

## 📋 Requirements Summary

### Notification Sending (Admin)
- **Targeting Options:**
  - Single user (search by email/name)
  - Entire organization
  - All users with "gestor" role
  - Multiple organizations (bulk)
  - All system users (super_admin only)
  
- **Notification Fields:**
  - Title (required)
  - Message (required)
  - Type (activity/system)
  - Priority/urgency flag
  - Action link (optional)
  - Scheduled send time (optional)

- **Admin Features:**
  - Preview before send
  - Send history/audit trail
  - Delivery statistics (sent/read/failed)
  - Edit/cancel scheduled notifications

### Notification History (User)
- Full notification list with filters
- Pagination support
- Search functionality
- Bulk actions (mark all read, delete)
- Filters: read/unread, type, date range

### Permissions
- **Can send notifications:**
  - Super admins (all features)
  - Organization secretarios (org-only)
  - Organization gestors (org-only)

---

## 🏗️ Architecture Design

### Database Changes

#### New Tables

```sql
-- Scheduled notifications (not yet sent)
CREATE TABLE scheduled_notifications (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    organization_id TEXT REFERENCES organizations(id), -- null for system-wide
    target_type TEXT NOT NULL, -- 'user', 'organization', 'role', 'all'
    target_ids TEXT[], -- user IDs, org IDs, etc.
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type notification_type NOT NULL,
    priority TEXT DEFAULT 'normal', -- 'normal', 'high', 'urgent'
    link TEXT,
    scheduled_for TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'cancelled'
    sent_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Notification delivery tracking
CREATE TABLE notification_deliveries (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delivered_at TIMESTAMP NOT NULL DEFAULT NOW(),
    read_at TIMESTAMP,
    failed BOOLEAN DEFAULT FALSE,
    error_message TEXT
);

-- Notification send history (audit trail)
CREATE TABLE notification_send_logs (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL REFERENCES users(id),
    organization_id TEXT REFERENCES organizations(id),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_count INTEGER NOT NULL, -- how many users targeted
    sent_count INTEGER NOT NULL, -- how many actually sent
    failed_count INTEGER DEFAULT 0,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### Indexes

```sql
CREATE INDEX scheduled_notif_status_idx ON scheduled_notifications(status, scheduled_for);
CREATE INDEX delivery_notif_user_idx ON notification_deliveries(notification_id, user_id);
CREATE INDEX send_logs_creator_idx ON notification_send_logs(creator_id, sent_at);
```

---

## 📁 File Structure

```
src/
├── pages/
│   ├── admin/
│   │   └── notifications.astro          # Admin send page
│   └── notifications.astro               # User history page
│
├── components/
│   ├── admin/
│   │   ├── NotificationComposer.tsx     # Form to create notification
│   │   ├── TargetSelector.tsx           # User/org selection component
│   │   ├── NotificationPreview.tsx      # Preview modal
│   │   ├── ScheduledNotificationsList.tsx
│   │   └── NotificationStats.tsx        # Delivery stats
│   │
│   └── notifications/
│       ├── NotificationList.tsx         # Full list with filters
│       ├── NotificationFilters.tsx      # Filter controls
│       └── NotificationItem.tsx         # Single item display
│
├── server/routes/
│   └── admin-notifications.ts           # Admin API routes
│
└── lib/
    └── admin-notifications.ts           # Admin service functions
```

---

## 🔄 Implementation Phases

### Phase 1: Database Schema (1-2 hours)
- [ ] Create `scheduled_notifications` table migration
- [ ] Create `notification_deliveries` table migration
- [ ] Create `notification_send_logs` table migration
- [ ] Add Drizzle schema definitions
- [ ] Run migrations

### Phase 2: Backend Services (2-3 hours)

#### Admin Notification Service (`src/lib/admin-notifications.ts`)
- [ ] `scheduleNotification()` - Create scheduled notification
- [ ] `sendImmediateNotification()` - Send now
- [ ] `getScheduledNotifications()` - List pending
- [ ] `cancelScheduledNotification()` - Cancel pending
- [ ] `updateScheduledNotification()` - Edit pending
- [ ] `getTargetUsers()` - Resolve target_type to user IDs
- [ ] `getSendHistory()` - Get audit log
- [ ] `getDeliveryStats()` - Get sent/read/failed counts

#### Inngest Functions (`src/lib/inngest/functions/admin-notify.ts`)
- [ ] `processScheduledNotifications` - Cron job (every 5 min)
- [ ] `sendBulkNotifications` - Handle bulk sends

#### API Routes (`src/server/routes/admin-notifications.ts`)
- [ ] `POST /admin/notifications/send` - Send immediate
- [ ] `POST /admin/notifications/schedule` - Schedule for later
- [ ] `GET /admin/notifications/scheduled` - List scheduled
- [ ] `PATCH /admin/notifications/scheduled/:id` - Edit scheduled
- [ ] `DELETE /admin/notifications/scheduled/:id` - Cancel
- [ ] `GET /admin/notifications/history` - Send history
- [ ] `GET /admin/notifications/stats/:id` - Delivery stats
- [ ] `GET /admin/notifications/targets` - Search users/orgs

### Phase 3: Admin UI Components (3-4 hours)

#### NotificationComposer.tsx
- [ ] Form: title, message, type, priority, link
- [ ] Target selector integration
- [ ] Schedule date/time picker
- [ ] Preview button
- [ ] Send/Schedule button
- [ ] Validation

#### TargetSelector.tsx
- [ ] Radio buttons: user, org, role, multiple orgs, all
- [ ] User search (autocomplete)
- [ ] Organization multi-select
- [ ] Role filter (gestors only)
- [ ] Selected targets display
- [ ] Target count display

#### NotificationPreview.tsx
- [ ] Modal dialog
- [ ] Shows formatted notification
- [ ] Target count summary
- [ ] Confirm/cancel buttons

#### ScheduledNotificationsList.tsx
- [ ] Table: title, target, scheduled time, status
- [ ] Edit button
- [ ] Cancel button
- [ ] Pagination

#### NotificationStats.tsx
- [ ] Total sent
- [ ] Total read (with percentage)
- [ ] Failed count
- [ ] Read rate chart (optional)

### Phase 4: User Notification History Page (2-3 hours)

#### NotificationList.tsx
- [ ] Fetch notifications with pagination
- [ ] Display notification items
- [ ] Loading states
- [ ] Empty state

#### NotificationFilters.tsx
- [ ] Filter by: read/unread, type
- [ ] Date range picker
- [ ] Search box
- [ ] Clear filters button

#### Bulk Actions
- [ ] Select all checkbox
- [ ] Select individual items
- [ ] "Mark all as read" button
- [ ] "Delete selected" button

### Phase 5: Page Integration (1-2 hours)
- [ ] `/admin/notifications` page (Astro)
- [ ] `/notifications` page (Astro)
- [ ] Add to admin nav menu
- [ ] Add to user nav menu
- [ ] Permission checks

### Phase 6: Testing & Verification (2 hours)
- [ ] Unit tests for admin services
- [ ] API endpoint tests
- [ ] UI component tests
- [ ] E2E test: send notification flow
- [ ] E2E test: schedule notification
- [ ] E2E test: user history with filters
- [ ] Manual testing all permission levels

---

## 🎯 API Endpoints Design

### Admin Routes

```typescript
// Send immediate notification
POST /api/admin/notifications/send
Body: {
  targetType: 'user' | 'organization' | 'role' | 'multi-org' | 'all',
  targetIds: string[], // user IDs, org IDs, etc.
  title: string,
  message: string,
  type: 'activity' | 'system',
  priority: 'normal' | 'high' | 'urgent',
  link?: string
}
Response: { success: true, sentCount: number, sendLogId: string }

// Schedule notification
POST /api/admin/notifications/schedule
Body: { ...(same as /send), scheduledFor: ISO string }
Response: { success: true, scheduledId: string }

// Get scheduled notifications
GET /api/admin/notifications/scheduled?status=pending&limit=20&offset=0
Response: { scheduled: [...], total: number }

// Update scheduled
PATCH /api/admin/notifications/scheduled/:id
Body: { title?, message?, scheduledFor?, ... }
Response: { success: true }

// Cancel scheduled
DELETE /api/admin/notifications/scheduled/:id
Response: { success: true }

// Get send history
GET /api/admin/notifications/history?limit=20&offset=0
Response: { history: [...], total: number }

// Get delivery stats
GET /api/admin/notifications/stats/:sendLogId
Response: {
  id: string,
  sentCount: number,
  readCount: number,
  failedCount: number,
  readRate: number
}

// Search targets
GET /api/admin/notifications/targets?type=user&q=john
Response: { users: [...] } or { organizations: [...] }
```

### User Routes (extend existing)

```typescript
// Get notifications with filters
GET /api/notifications?
    limit=20&offset=0&
    status=unread&
    type=system&
    from=2024-01-01&to=2024-12-31&
    search=maintenance
Response: { notifications: [...], total: number }

// Delete notification
DELETE /api/notifications/:id
Response: { success: true }

// Bulk delete
POST /api/notifications/bulk-delete
Body: { ids: string[] }
Response: { success: true, deletedCount: number }
```

---

## 🔒 Permission Matrix

| Action | Super Admin | Org Secretario | Org Gestor | User |
|--------|-------------|----------------|------------|------|
| Send to single user | ✅ (any) | ✅ (org only) | ✅ (org only) | ❌ |
| Send to organization | ✅ (any) | ✅ (own org) | ✅ (own org) | ❌ |
| Send to all gestors | ✅ | ✅ (org only) | ✅ (org only) | ❌ |
| Send to multiple orgs | ✅ | ❌ | ❌ | ❌ |
| Send to all users | ✅ | ❌ | ❌ | ❌ |
| Schedule notifications | ✅ | ✅ | ✅ | ❌ |
| View send history | ✅ (all) | ✅ (own) | ✅ (own) | ❌ |
| View delivery stats | ✅ (all) | ✅ (own) | ✅ (own) | ❌ |
| View notification history | ✅ | ✅ | ✅ | ✅ |
| Delete own notifications | ✅ | ✅ | ✅ | ✅ |

---

## 🎨 UI Wireframes

### Admin Notification Send Page

```
┌─────────────────────────────────────────────────────┐
│ 📢 Enviar Notificação                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│ Título *                                            │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Mensagem *                                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │                                                 │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Tipo: ○ Atividade  ● Sistema                       │
│ Prioridade: ○ Normal  ○ Alta  ○ Urgente            │
│                                                     │
│ Link de Ação (opcional)                             │
│ ┌─────────────────────────────────────────────────┐ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ Enviar para:                                        │
│ ○ Usuário específico  [🔍 Search user]             │
│ ○ Organização inteira [▼ Select org]               │
│ ○ Todos gestores                                    │
│ ○ Múltiplas organizações [▼ Select orgs]           │
│ ○ Todos os usuários (Super Admin)                  │
│                                                     │
│ 👥 0 usuários serão notificados                     │
│                                                     │
│ ─────────────────────────────────────────────────── │
│                                                     │
│ ☐ Agendar para depois                              │
│   Data/Hora: [📅 Select datetime]                   │
│                                                     │
│ [Pré-visualizar] [Enviar Agora] or [Agendar]       │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 📋 Notificações Agendadas                           │
├─────────────────────────────────────────────────────┤
│ Título              Para        Quando    Ações     │
│ Manutenção...      50 users    10/02 14h  ✏️ 🗑️    │
│ Nova feature...    Org ABC     11/02 08h  ✏️ 🗑️    │
└─────────────────────────────────────────────────────┘
```

### User Notification History Page

```
┌─────────────────────────────────────────────────────┐
│ 🔔 Minhas Notificações                              │
├─────────────────────────────────────────────────────┤
│ Filtros:                                            │
│ [▼ Todas] [▼ Tipo] [📅 Data] [🔍 Buscar___]        │
│ [Marcar todas lidas] [Excluir selecionadas]        │
├─────────────────────────────────────────────────────┤
│ ☐ 🧪 Test Notification           5m    [🗑️]        │
│   This is a test notification...                    │
│                                                     │
│ ☐ ⚠️ Manutenção Programada       2h    [🗑️]        │
│   Sistema indisponível hoje...   [URGENTE]          │
│                                                     │
│ ☑ Nova tarefa atribuída          1d    [🗑️]        │
│   Você foi designado para...                        │
├─────────────────────────────────────────────────────┤
│                    « 1 2 3 »                        │
└─────────────────────────────────────────────────────┘
```

---

## ⚙️ Technical Considerations

### Performance
- **Bulk Send Optimization:** Use background jobs for >100 recipients
- **Pagination:** Default 20 items, max 100
- **Caching:** Cache org member lists (5 min TTL)
- **Indexes:** Ensure indexes on foreign keys and query filters

### Security
- **Permission Checks:** Validate org membership for non-super-admins
- **Rate Limiting:** Max 10 notifications/minute per admin
- **Input Validation:** Sanitize HTML in messages
- **XSS Prevention:** Escape user content in preview

### Error Handling
- **Partial Failures:** Track which deliveries failed
- **Retry Logic:** Auto-retry failed deliveries (max 3 attempts)
- **User Feedback:** Show clear error messages
- **Logging:** Log all send attempts for audit

### Scheduled Notifications
- **Cron Job:** Run every 5 minutes to check `scheduled_for`
- **Timezone Handling:** Store in UTC, display in user timezone
- **Execution Window:** Send within 5 min of scheduled time
- **Cleanup:** Auto-delete sent scheduled notifications after 30 days

---

## 📊 Success Metrics

- [ ] Admin can send notification in <30 seconds
- [ ] Scheduled notifications sent within 5 min of target time
- [ ] Bulk send handles 1000+ users without timeout
- [ ] User can find notification via search <5 seconds
- [ ] All permission checks enforce correctly
- [ ] Zero unauthorized access attempts

---

## 🚀 Deployment Checklist

- [ ] Database migrations run successfully
- [ ] Environment variables set (if any new ones)
- [ ] Inngest cron job synced
- [ ] API routes registered
- [ ] Nav menu links added
- [ ] Permission middleware tested
- [ ] Error tracking configured
- [ ] Performance monitoring enabled
- [ ] User documentation updated
- [ ] Admin training completed

---

## 📝 Future Enhancements (Post-MVP)

- [ ] Rich text editor for messages (Markdown/HTML)
- [ ] Notification templates (save/reuse common messages)
- [ ] Analytics dashboard (open rates, click rates)
- [ ] SMS/Push notifications integration
- [ ] Slack integration for urgent notifications
- [ ] User notification preferences (opt-out options)
- [ ] A/B testing for notification content
- [ ] Notification categories (maintenance, feature, alert)

---

## 📚 Related Documentation

- [Existing Notification System](file:///home/saeti/.gemini/antigravity/brain/2881a0d9-145a-4196-94e0-4267ae5720b3/walkthrough.md)
- [Setup Guide](file:///home/saeti/.gemini/antigravity/brain/2881a0d9-145a-4196-94e0-4267ae5720b3/SETUP.md)
- [API Routes: notifications.ts](file:///home/saeti/dev/gerenciador-projetos/src/server/routes/notifications.ts)

---

**Estimated Total Time:** 12-16 hours  
**Priority:** High  
**Complexity:** Medium-High
