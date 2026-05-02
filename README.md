# Full-Stack Kanban App

A full-stack task management application featuring drag-and-drop organization, multi-project support, and a containerized development environment.

**Deployment:** https://kanban-app-tawny-gamma.vercel.app/

## Features

-   **Project Hierarchy:** Organize work into Projects, Boards, Columns, and Tasks.
-   **Drag-and-Drop:** Interactive board UI with smooth card movement and reordering.
-   **Optimistic UI:** Instant interface updates for all CRUD operations with automatic rollback on server errors.
-   **Theming:** Native support for system dark/light modes using CSS variables.
-   **Responsive Design:** Optimized layouts for mobile and desktop using CSS Grid and Flexbox.

## Technical Implementation

### Backend (Node.js 25.9 + Express 5)

-   **Native TypeScript:** Uses Node 25.9 type-stripping to execute `.ts` files directly.
-   **SQL Optimization:** Uses `JSON_AGG` and correlated subqueries to fetch the entire board state in a single database request.
-   **Data Integrity:** Implements PostgreSQL transactions for multi-step operations (e.g., creating a board with default columns).
-   **Security:** JWT-based authentication using HttpOnly cookies and member-based authorization checks for all resources.
-   **Validation:** Schema-based request validation using Zod.

### Frontend (React 19 + Tailwind 4)

-   **State Management:** Context API for authentication and complex nested state updates for the Kanban board.
-   **Styling:** Utility-first styling with Tailwind 4, utilizing the new `@theme` variable system.
-   **Drag and Drop:** Implemented using `@hello-pangea/dnd`.
-   **Service Layer:** Centralized API logic using Axios with type-safe response mapping.

### DevOps

-   **Docker:** Multi-container setup for development (with `watch` mode) and production.
-   **Nginx:** Configured as a reverse proxy for local production simulation.
-   **CI/CD:** Automated deployment pipeline via GitHub Actions.

## Tech Stack

-   **Frontend:** React 19, Vite, Tailwind 4, Axios, Zod, @hello-pangea/dnd.
-   **Backend:** Node 25.9, Express 5, PostgreSQL, Zod, Bcrypt, JSONWebToken.
-   **Infrastructure:** Docker, Vercel, Render, Supabase.

## Setup & Installation

1.  **Clone the repo:**
    ``` bash
    git clone https://github.com/yourusername/kanban-app.git
    ```

4.  **Configure Environment:** Create a `.env` file in the root based on `.env.example`.

5.  **Launch with Docker:**

    ``` bash
    # Development mode
    docker compose watch

    # Production simulation
    docker compose -f docker-compose.prod.yml up --build
    ```

## Database Schema

The relational PostgreSQL schema includes: `users`: Auth and profile data. `projects`: The top-level container. `project_members`: Multi-user project access and roles. `boards`: Kanban boards linked to projects. `columns`: Vertical lists of tasks with order_index. `tasks`:  task data with `order_index` for sorting.

------------------------------------------------------------------------

**Note:** The database is initialized with a default test user (`testuser` / `password123`) for demonstration purposes.
