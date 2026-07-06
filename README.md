# co-PI: The AI-Native Research Workspace

**co-PI is GitHub for research, with an AI principal investigator embedded in your workflow.** 

co-PI isn't just a chatbot bolted onto a dashboard. It's a unified workspace for the entire research lifecycle where your embedded AI agent (co-PI) reviews data, drafts proposals, digests literature, and—most importantly—**remembers project context across sessions**, all powered by the **BTL Runtime**.

---

## 🌟 The Features

co-PI integrates AI directly into the places where research actually happens. 

### 1. Collaborative Proposal Editor with `@coPI` (Streaming)
Mention `@coPI` anywhere in your collaborative rich-text proposal editor. The AI drafts and edits sections inline in real-time, streaming text directly into the document just like a human co-author typing alongside you.

### 2. AI Dataset Review (Structured Output)
Drop a CSV into your repository. co-PI instantly reviews the dataset, flags missing values, finds duplicates, identifies sample-size drops, spots outliers, and posts its findings as a comment. 

### 3. AI Literature Digest
Upload PDFs to your repository. co-PI reads the papers and produces a unified digest: a one-line summary per paper alongside bulleted "gaps or open questions" across the entire literature set.

### 4. Persistent Project Memory 
After every AI interaction, co-PI extracts short, factual statements and writes them to a durable memory layer (`AiFact`). Later, you can ask, *"@coPI, what did we decide about sample size?"*, and co-PI answers instantly from stored facts instead of hallucinating or re-reading entire documents. This is an application-level RAG memory layer built natively on top of the BTL Runtime.

---

## 🛠 Built on BTL Runtime

This project was built for the **BTL Runtime Hackathon**. It makes deep, structural use of the BTL Runtime API (`/v1/chat/completions`) rather than superficial wrapper calls.

Our BTL Runtime integration proves:
*   **Real Streaming (`stream: true`)**: Used live in the proposal editor.
*   **Structured Output (`response_format: {"type": "json_object"}`)**: Powering the deterministic dataset review engine.
*   **Cache & Deduplication Proof**: We log full request/response pairs. By comparing identical `id` and `created` values across repeated identical interactions, we demonstrate real cache-hit savings delivered by the BTL Gateway.
*   **Durable Agent Facts**: We engineered our own memory layer on top of BTL Runtime, inspired by RetainDB's approach to durable agent facts.

---

## 🎨 Design Philosophy: "Night Desk"

co-PI rejects the generic "dark mode" or "acid-green AI tool" aesthetic. Instead, it uses a **Night Desk** theme:
*   **The Concept:** A research desk at 2am. The glow of a gooseneck lamp over an index card. Corkboards, pinned evidence, and threads connecting related notes.
*   **The UI:** Proposals are styled as pinned index cards on a corkboard. Memory facts (`AiFact`) are smaller cards connected to their source via an SVG dashed thread line—literally tracing the AI's logic and memory back to its origin.
*   **The Motion:** Restrained. No ambient neon glows. The only motion is the streaming text typing onto the page, character by character, like ink appearing under a pen.

---

## 💻 Tech Stack

- **Frontend:** Next.js (React), standard CSS (Night Desk design system)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL, Prisma ORM
- **Real-time:** Socket.IO (for live collaboration & AI streaming)
- **Authentication:** JWT
- **AI/LLM:** BTL Runtime API (OpenAI-compatible gateway)

---

## 🚀 Local Setup

### Prerequisites
*   Node.js (v18+)
*   PostgreSQL
*   A BTL Runtime API Key

### 1. Database & Backend
```bash
cd co-PI-Backend
npm install

# Setup environment variables
cp .env.example .env
# Ensure your DATABASE_URL and GATEWAY_API_KEY are set in .env

# Run migrations and seed the database with 50 public repositories
npx prisma migrate dev
npx prisma db seed

# Start the backend server
npm run dev
```

### 2. Frontend
```bash
cd ../co-PI-Frontend
npm install

# Setup environment variables
cp .env.example .env.local

# Start the Next.js frontend
npm run dev
```

Visit `http://localhost:3000` to explore the open research repositories, log in, and meet your new co-PI.
