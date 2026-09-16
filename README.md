# JalSetu

## Water Service Incident Reporting & Repair Management

JalSetu is a full-stack web application built to manage water-service complaints from the point of reporting to repair completion.

The application provides separate workflows for citizens and field technicians. Citizens can report incidents and track them, while technicians can view available work, take repair tasks, manage active repairs, and complete assigned work.

The main focus of the project is not just collecting complaints, but managing what happens after a complaint is created.

---

## Overview

A typical JalSetu workflow looks like this:

```text
Citizen
   │
   │ Report water-service issue
   ▼
Incident Created
   │
   ▼
Incident Dashboard
   │
   ▼
Repair Task Available
   │
   ▼
Technician Accepts Task
   │
   ▼
Active Repair
   │
   ▼
Repair Completed

Key Features
Citizen Reporting

Citizens can submit structured water-service incidents through the reporting interface.

The application captures the information required to create and track an incident and makes the resulting report available through the incident workflow.

Incident Tracking

Reported incidents can be viewed through the application's incident interface.

The system provides visibility into information such as:

Incident details
Issue type
Location
Current status
Technician assignment
Repair state
Technician Dashboard

Technicians have a dedicated workflow for handling repair work.

Technicians can:

View available repair tasks
Accept repair work
View assigned incidents
Manage active repairs
Update repair progress
Complete repairs

The technician workflow is separate from the citizen workflow because the two users perform different operations on the same incident.

Technician Workload Control

JalSetu prevents a technician from continuously accepting new work while already handling the maximum number of active repairs.

The application checks the technician's active workload before allowing another task to be accepted.

New Task
   │
   ▼
Check Active Repairs
   │
   ├───────────────┐
   │               │
Below Limit      Limit Reached
   │               │
   ▼               ▼
Accept Task      Reject Task
                   │
                   ▼
             Display Warning

When the limit is reached, the application displays a prominent warning informing the technician that an existing repair must be completed before another task can be taken.

Application Architecture
                    JALSETU
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
      Citizen                  Technician
      Workflow                  Workflow
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
                Incident State
                       │
                       ▼
              React + TypeScript
                       │
                       ▼
                Supabase Client
                       │
                       ▼
                Supabase Backend
                       │
                       ▼
                   PostgreSQL

The frontend is responsible for rendering the interface, handling user interaction, managing UI state, and communicating with the backend.

Supabase provides the backend integration and PostgreSQL provides persistent relational storage.

Tech Stack
Category	Technology
Frontend	React
Language	TypeScript
Build Tool	Vite
Styling	CSS
Backend Platform	Supabase
Database	PostgreSQL
Package Management	npm
Version Control	Git / GitHub
Frontend Architecture

JalSetu is implemented using React and TypeScript.

The application is divided around the major workflows instead of treating the entire interface as a single static page.

The frontend handles:

Rendering incident data
Form input
User interaction
Application state
Technician actions
Incident updates
Error states
Loading states
Dialogs and notifications
Responsive layouts

React components are used to keep individual interface responsibilities separated and make the application easier to modify as the workflow grows.

TypeScript is used throughout the frontend to provide explicit types for application data, component state, and function interfaces.

Application State

The application contains both persistent data and temporary UI state.

Application Data
│
├── Incidents
├── Technician Information
├── Assignments
└── Repair Status

UI State
│
├── Selected Incident
├── Selected Technician
├── Form State
├── Loading State
├── Error State
└── Dialog Visibility

Persistent information belongs to the backend data layer, while temporary interface state is maintained by the React application.

This separation prevents UI-only information such as an open dialog or selected incident from being treated as permanent application data.

Incident Lifecycle

JalSetu models an incident as a workflow.

The general lifecycle is:

Reported
   │
   ▼
Available
   │
   ▼
Assigned
   │
   ▼
In Progress
   │
   ▼
Completed

The lifecycle allows the application to distinguish between a newly reported problem, a problem waiting for repair, an active repair, and completed work.

A typical interaction is:

Citizen reports issue
        ↓
Incident is created
        ↓
Incident appears in dashboard
        ↓
Technician takes available task
        ↓
Repair becomes active
        ↓
Technician completes repair
        ↓
Incident reaches completed state
Backend Integration

JalSetu uses Supabase for backend services and PostgreSQL for persistent data storage.

The frontend communicates with Supabase through its client integration.

The basic data flow is:

React Component
      │
      ▼
Supabase Client
      │
      ├── Read
      ├── Create
      ├── Update
      └── Delete
      │
      ▼
PostgreSQL
      │
      ▼
Updated Application Data
      │
      ▼
React UI

This allows incident and technician-related information to persist beyond a single browser session.

Database Model

The application works with related entities representing incidents, technicians, and repair assignments.

Conceptually:

Incident
   │
   ├── Incident Details
   ├── Location
   ├── Status
   └── Assignment
          │
          ▼
      Technician
          │
          └── Active Repairs

The relational database provides persistent storage for the operational state of the application.

Business Logic

One of the main business rules implemented by JalSetu is technician workload management.

The application determines the technician's current active workload before allowing another repair task.

Conceptually:

activeJobs = current active repairs

if activeJobs >= maximumAllowedJobs
        │
        ├── Reject new task
        └── Show workload warning

otherwise
        │
        └── Allow technician to accept task

This prevents the technician workflow from becoming an unlimited task queue.

The restriction is also communicated directly through the UI so that the technician understands why another task cannot be accepted.

User Feedback

The application provides feedback for operations that require user attention.

Examples include:

Form validation
Backend errors
Loading states
Empty states
Unavailable operations
Technician workload restrictions

When the technician reaches the active-task limit, JalSetu displays a prominent dialog instead of relying only on a small inline message.

The dialog communicates the restriction clearly and automatically disappears after a short timeout.

Responsive Design

The application uses responsive CSS to support different screen sizes.

The same application adapts its layout rather than requiring separate desktop and mobile implementations.

Desktop
   │
   ▼
Tablet
   │
   ▼
Mobile

Layouts, cards, forms, controls, and dialogs adjust to available screen space while preserving the underlying workflow.

Project Structure
jalsetu/
│
├── public/
│
├── src/
│   ├── assets/
│   ├── lib/
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
│
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
Local Development
Requirements
Node.js
npm
Supabase project
Clone the repository
git clone <repository-url>
cd jalsetu
Install dependencies
npm install
Configure environment variables

Create a .env file in the project root:

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Keep environment files and private credentials out of version control.

Start the development server
npm run dev
Create a production build
npm run build
Preview the production build
npm run preview
Engineering Decisions


The application contains multiple interactive workflows, forms, dashboards, state-dependent controls, and dialogs.

React provides a component-based approach for managing these changing UI states.

TypeScript:

The application passes structured information between components and backend operations.

TypeScript makes these structures explicit and provides compile-time checking during development.

Supabase::

JalSetu requires persistent relational data but does not currently require a large custom backend.

Supabase provides the database and backend infrastructure required by the application while allowing the project to focus on the application workflow and user experience.

PostgreSQL:

The application contains related entities such as incidents and technicians.

A relational database is suitable for representing these relationships and storing structured operational data.

Error Handling:

JalSetu provides user feedback when an operation cannot be completed.

The application distinguishes between normal application states and situations that require user attention.

The general pattern is:

User Action
     │
     ▼
Application Operation
     │
   ┌─┴─┐
   │   │
Success Failure
   │   │
   ▼   ▼
Update  Display
UI      Feedback

This prevents important failures from becoming silent operations with no explanation to the user.

Configuration & Security

Supabase configuration is provided through environment variables rather than being hardcoded into the application.

VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY

The repository should not contain private credentials, database passwords, service-role keys, or other secrets.

Development Focus:

JalSetu was built around a practical software workflow rather than as a collection of disconnected frontend screens.

The implementation focuses on:

React component architecture includes:
TypeScript
State management
Supabase integration
PostgreSQL
CRUD operations
Form handling
Business-rule enforcement
Responsive UI
Error handling
User feedback
Incident workflow management
What Makes the Project Technically Interesting

The complaint form itself is straightforward.

The more interesting part is everything that happens after the form is submitted.

The application has to maintain a consistent workflow between different users:

             Citizen
                │
                ▼
        Report a Problem
                │
                ▼
             Incident
                │
                ▼
       Available for Repair
                │
                ▼
           Technician
                │
                ▼
         Active Repair
                │
                ▼
        Repair Completed

This requires the interface, application state, backend data, technician workflow, and business rules to agree about the current state of an incident.

That workflow is the main engineering focus of JalSetu.

Current Scope

The current implementation focuses on the core incident-to-repair workflow:

Citizen incident reporting
Incident tracking
Incident details
Technician workflow
Repair task allocation
Active repair management
Technician workload limits
Supabase backend integration
PostgreSQL persistence
Responsive frontend
User feedback and error states
Future Extensions

Potential future extensions include

Role-based authentication
More granular authorization
Real-time incident updates
Technician location tracking
Photo attachments
Repair verification
Administrative dashboards
Audit logs
Notifications
Geographic technician assignment
Incident prioritization
Service analytics

These are possible extensions to the current system rather than features claimed as already implemented.

Project Status-

Core application workflow implemented.

JalSetu currently provides a working flow from citizen incident reporting through technician repair management and completion.

The project is structured so additional operational functionality can be added without replacing the core incident and technician workflow.

Author

Shaik Zain Ahmed Hussain

B.Tech Computer Science & Engineering
Mahatma Gandhi Institute of Technology


