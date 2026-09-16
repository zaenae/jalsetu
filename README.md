JalSetu

A lightweight breakdown reporting and technician dispatch system for rural drinking water pumps.

JalSetu is designed for a simple problem: when a village water pump breaks, reporting it through phone calls and scattered messages makes it difficult for technicians to know what failed, what parts are needed, and which technician is handling the repair.

The goal of JalSetu is to put the whole process in one place.

What it does

For village representatives

* Report a pump breakdown
* Select the village and pump
* Select the type of issue
* Add pump specifications and required parts
* Mark whether emergency tanker water is required

Public breakdown board

* Shows active pump breakdowns without requiring login
* Sorts breakdowns based on urgency and downtime
* Shows tanker requirements
* Shows the nearest working backup pump where available
* Displays repair status and resolution notes

For technicians

* View open repair tickets
* See pump specifications before travelling to the site
* See the spare-parts checklist
* Claim an available repair
* Update the repair through:
    * Reported
    * Assigned
    * Parts Sourced
    * Repaired
* Add a resolution note after completing the repair

Key engineering decisions

Preventing duplicate breakdowns

A pump cannot have multiple active breakdown tickets at the same time. If an active breakdown already exists for a pump, another report is not created for the same pump.

Preventing conflicting technician assignments

A repair ticket can only be claimed by one technician. Assignment is handled through the backend so that two technicians cannot successfully claim the same ticket at the same time.

Mobile and low-bandwidth use

The application is kept intentionally lightweight with a simple interface and minimal unnecessary network-heavy features. The main workflows are designed to work comfortably on mobile browsers.

Offline handling

I did not implement full offline syncing.

Technician assignments and repair updates depend on the latest server state. Allowing technicians to make changes while offline could result in conflicting or outdated information.

When the connection is unavailable, the technician view shows a clear error instead of allowing potentially unsafe updates. Once the connection is restored, the technician can retry.

What I deliberately did not build

This was a 24-hour development challenge, so I focused on the core breakdown-to-repair workflow.

I did not build:

* SMS or WhatsApp notifications
* GPS-based technician routing
* Automatic spare-part procurement
* Resident accounts
* Full offline synchronization

These could be added later, but they were not necessary for solving the main problem within the available development time.

Tech Stack

* React
* TypeScript
* Vite
* Supabase
* PostgreSQL
* CSS

No paid third-party APIs are required.

Running locally

1. Clone the repository

git clone https://github.com/zaenae/jalsetu.git
cd jalsetu

2. Install dependencies

npm install

3. Configure environment variables

Create a .env file:

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

Add the values from your Supabase project.

4. Start the development server

npm run dev

The application will be available at the local URL shown by Vite.

Project Structure

src/
├── App.tsx
├── App.css
├── main.tsx
└── lib/
    └── supabase.ts

Demo

Live application:

https://jalsetu-rural.vercel.app/

Source code:

https://github.com/zaenae/jalsetu

Built for

A 24-hour product development challenge focused on improving breakdown reporting and technician coordination for rural drinking water infrastructure.