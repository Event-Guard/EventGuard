# EventGuard – No Database Version

A responsive Smart Hall Booking with Incident Tracking demo based on the supplied EventGuard screen designs.

## Technology
- Node.js
- Express.js
- HTML5, CSS3 and Vanilla JavaScript
- No database. Demo records are kept in server memory.

## Requirements
Install Node.js LTS (includes npm). Verify installation:
```bash
node -v
npm -v
```

## Run
Open a terminal in this folder:
```bash
npm install
npm start
```
Then open http://localhost:3000

## Demo flow
1. Create an account using the Create an account link.
2. Sign in using the same email and password.
3. Use the sidebar to navigate Dashboard, Halls & bookings, Events, Incidents and Team & reports.
4. Search halls and submit a booking request.
5. Report an incident.
6. Open Team & reports and update the incident status. Resolution notes are required before setting an incident to Resolved.

## Validation included
- Full name length
- Email format
- Required role and policy acceptance
- Password length, letter and number; confirm-password match
- Hall selection and attendee count
- Hall capacity validation
- Date cannot be in the past
- Valid 24-hour times and end time after start time
- Booking time-overlap check for the same hall
- Event title and event type
- Incident location, category, priority and description length
- Resolution notes required before resolving an incident
- Server-side validation in addition to browser-side validation

## Important limitations
- This is a demonstration version, not production authentication.
- Passwords are held in memory as plain text for demonstration only. Do not use real passwords.
- Users and records are lost when the Node server restarts.
- The sample dashboard values and initial records are mock data.
- Password reset, email verification, real approval workflow and role permissions are not connected.
