# Collaborative Research Management Platform (CRMP) - Application Flow

This document describes the high-level workflows and user journeys within the CRMP application, providing a conceptual map of how the frontend, backend, and users interact.

## 1. User Onboarding & Authentication Flow

1. **Registration:** A researcher arrives at the platform and creates an account (`POST /api/auth/register`).
2. **Login:** The user authenticates with their credentials (`POST /api/auth/login`).
3. **Session Management:** The backend issues a JSON Web Token (JWT) valid for 7 days. The frontend stores this token (e.g., in `localStorage` or a secure cookie) and attaches it as a `Bearer` token in the `Authorization` header for all subsequent API requests.

## 2. Project Creation & Management Flow

1. **Creating a Project:** A user initiates a new research project (`POST /api/projects`). The backend automatically assigns this user the role of **Principal Investigator (PI)** for this specific project.
2. **Inviting Collaborators:** The PI invites other registered users to the project (`POST /api/projects/:id/members`), explicitly assigning them roles such as `CO_INVESTIGATOR`, `ASSISTANT`, or `REVIEWER`.
3. **Role-Based Access Control (RBAC):** Throughout the project lifecycle, backend middleware verifies the user's role before granting access. For example:
   - Only a `PI` can update the Ethical Clearance Status.
   - Only a `PI` or `CO_INVESTIGATOR` can assign tasks or log official research outputs.
   - An `ASSISTANT` can edit documents and complete tasks but cannot alter project metadata.

## 3. Real-Time Collaborative Document Flow

The platform provides a Google Docs-like collaborative editing experience.

1. **Document Initialization:** A member creates a new manuscript draft (`POST /api/projects/:id/documents`). The backend persists the initial state.
2. **Opening the Editor:** When a user opens the document, the frontend:
   - Fetches the latest persisted state via HTTP (`GET /api/documents/:id`).
   - Connects to the Socket.io server and emits a `join-document` event to enter the real-time collaboration room.
3. **Live Syncing:** 
   - As the user types, the frontend editor (e.g., Quill.js) emits `send-changes` events to the server containing lightweight document Deltas.
   - The backend instantly broadcasts these changes via `receive-changes` to all other active collaborators in the room.
   - The frontend also emits `cursor-move` events, allowing collaborators to see each other's live presence.
4. **Persistence:** Periodically (e.g., every 5-10 seconds of inactivity), the frontend sends a `PUT /api/documents/:id` request to save the full document state securely to the PostgreSQL database.

## 4. Task Management Flow

1. **Task Assignment:** A PI or Co-Investigator creates an actionable task (e.g., "Review Literature") and assigns it to an Assistant (`POST /api/projects/:id/tasks`).
2. **Dashboard Feed:** When the task is created, the frontend can optionally emit a `broadcast-activity` via Socket.io to instantly notify the assignee on their live dashboard.
3. **Task Completion:** The assignee finishes the work and clicks a checkbox, sending a `PUT /api/tasks/:id/complete` request. The database updates the `isCompleted` flag.

## 5. Dynamic Data Collection (Surveys) Flow

1. **Survey Design:** Researchers design a custom questionnaire. The frontend form builder serializes this structure into a `schemaJson` and creates the survey (`POST /api/projects/:id/surveys`).
2. **Distribution:** The survey generates a public-facing link.
3. **Data Submission:** External participants (who do not need an account) visit the link. The frontend retrieves the schema (`GET /api/surveys/:id`), dynamically renders the form, and submits the participant's answers (`POST /api/surveys/:id/responses`).
4. **Data Analysis:** Project members can view the aggregated responses (`GET /api/surveys/:id/responses`).

## 6. Official Research Output Flow

1. **File Upload (Optional):** If the output includes a physical manuscript or dataset, the user first uploads the file via `POST /api/upload` using `multipart/form-data`. The backend streams this securely to Cloudinary and responds with a persistent `fileUrl`.
2. **Publishing:** The PI or Co-Investigator formally logs the output (`POST /api/projects/:id/outputs`), attaching the `fileUrl` obtained from the previous step.
3. **Tracking:** This includes the `OutputType` (e.g., `JOURNAL`, `CONFERENCE`), citation string, and manuscript link. This serves as the definitive academic ledger for the project, viewable by all members.
