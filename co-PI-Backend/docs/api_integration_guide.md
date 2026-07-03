# Frontend Integration Guide
This guide details the complete CRMP Backend implementation, exposing all REST API endpoints and Socket.io events.

## 1. Authentication & Base URL
- **Base URL:** `http://localhost:3000/api`
- **Swagger Documentation:** `http://localhost:3000/api-docs`
- **Authentication:** Most endpoints require a Bearer token in the Authorization header.
  - `Authorization: Bearer <JWT_TOKEN>`

---

## 2. REST API Endpoints

### 1. Authentication & Users
| Method | Endpoint | Description | Request Body | Auth Required |
|---|---|---|---|---|
| `POST` | `/auth/register` | Create a new account | `{ email, password, role }` | No |
| `POST` | `/auth/login` | Login to receive JWT | `{ email, password }` | No |
| `GET`  | `/users` | List or search users by email | Query: `?q=email_search` | Yes |

### Projects
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/projects` | Create a new research project | Any (Creator becomes PI) |
| `GET`  | `/projects` | List all projects the user is part of | Any |
| `GET`  | `/projects/:id` | Get project details | Any Project Member |
| `POST` | `/projects/:id/members` | Add a member to a project | `PI` |
| `PUT`  | `/projects/:id/ethical-status` | Update ethical clearance status | `PI` |

### Tasks
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/projects/:id/tasks` | Create a task for a project | `PI`, `CO_INVESTIGATOR` |
| `GET`  | `/projects/:id/tasks` | List tasks for a project | Any Project Member |
| `PUT`  | `/tasks/:id/complete` | Mark a task as completed | Assignee, `PI`, `CO_INVESTIGATOR` |

### Collaborative Documents
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/projects/:id/documents` | Create a new document | `PI`, `CO_INVESTIGATOR`, `ASSISTANT` |
| `GET`  | `/projects/:id/documents` | List documents for a project | Any Project Member |
| `GET`  | `/documents/:id` | Get document content | Any Project Member |
| `PUT`  | `/documents/:id` | Update document content | Any Project Member |

### Dynamic Surveys
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/projects/:id/surveys` | Create a new dynamic survey | `PI`, `CO_INVESTIGATOR` |
| `GET`  | `/projects/:id/surveys` | List surveys for a project | Any Project Member |
| `GET`  | `/surveys/:id` | Get survey schema | Public / Any |
| `POST` | `/surveys/:id/responses` | Submit a survey response | Public / Any |
| `GET`  | `/surveys/:id/responses` | Get all responses for a survey | `PI`, `CO_INVESTIGATOR` |

### Research Outputs
| Method | Endpoint | Description | Role Required |
|---|---|---|---|
| `POST` | `/projects/:id/outputs` | Log a research output (Journal, etc.) | `PI`, `CO_INVESTIGATOR` |
| `GET`  | `/projects/:id/outputs` | List project research outputs | Any Project Member |

### File Uploads (Cloudinary)
| Method | Endpoint | Description | Request Body | Auth Required |
|---|---|---|---|---|
| `POST` | `/api/upload` | Upload a file to Cloudinary | `multipart/form-data` with `file` field | Yes |

---

## 3. Real-Time Collaboration (Socket.io)

Connect to the Socket.io server at `http://localhost:3000`. 

### Document Editing Sync
To facilitate real-time collaborative editing (e.g. using Quill.js or Yjs):

1. **Join a Document Room**
   - Emit: `join-document(documentId)`
   - *Action:* Subscribes the user to the document's real-time room.

2. **Send Text Changes**
   - Emit: `send-changes({ documentId, changes })`
   - *Action:* The server receives Delta changes and broadcasts them to everyone else.
   - Listen for: `receive-changes(changes)` (to apply remote changes to local editor).

3. **Cursor Tracking (Presence)**
   - Emit: `cursor-move({ documentId, position, userId })`
   - *Action:* Broadcasts the user's cursor position.
   - Listen for: `cursor-update({ userId, position })` (to render remote cursors).

4. **Leave Document Room**
   - Emit: `leave-document(documentId)`

### Project Activity Feed
To power real-time dashboard notifications for a specific project:

1. **Join a Project Dashboard**
   - Emit: `join-project(projectId)`

2. **Broadcast an Activity**
   - Emit: `broadcast-activity({ projectId, activity: { type, message, user } })`
   - Listen for: `project-activity(activity)` (to update the UI instantly).

3. **Leave Project Dashboard**
   - Emit: `leave-project(projectId)`

---

## 4. Error Handling
All REST endpoints return a unified error format:
```json
{
  "error": "Descriptive error message"
}
```
Standard HTTP status codes are used (`401` Unauthorized, `403` Forbidden, `404` Not Found, `400` Bad Request).
