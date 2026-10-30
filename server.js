const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Demo-only in-memory data. All records reset when the server restarts.
const users = [];
const bookings = [
  { id: 1, hall: "Innovation Hall", title: "Project showcase", date: "2026-10-28", start: "10:00", end: "12:00", attendees: 120, type: "Academic / seminar", status: "Pending", owner: "Megha Varshini" },
  { id: 2, hall: "Seminar Room B", title: "Research seminar", date: "2026-10-30", start: "14:00", end: "16:00", attendees: 65, type: "Academic / seminar", status: "Approved", owner: "Megha Varshini" },
  { id: 3, hall: "Main Auditorium", title: "Guest lecture", date: "2026-11-02", start: "09:30", end: "11:00", attendees: 300, type: "Guest lecture", status: "Approved", owner: "Megha Varshini" }
];
const incidents = [
  { id: "INC-1042", issue: "Projector not working", location: "Innovation Hall", category: "Electrical", priority: "High", status: "In progress", description: "Projector is not turning on.", notes: "" },
  { id: "INC-1038", issue: "Loose chair in row 3", location: "Seminar Room B", category: "Furniture", priority: "Normal", status: "Open", description: "Chair needs repair.", notes: "" },
  { id: "INC-1021", issue: "Wi-Fi connection issue", location: "Library seminar area", category: "Network", priority: "Normal", status: "Resolved", description: "Wi-Fi connectivity restored.", notes: "Router restarted." }
];
const events = [
  { id: 1, title: "Seminar", date: "2026-10-09", status: "Approved", hall: "Seminar Room B" },
  { id: 2, title: "Project Expo", date: "2026-10-18", status: "Approved", hall: "Innovation Hall" },
  { id: 3, title: "Workshop", date: "2026-10-27", status: "Pending", hall: "Main Auditorium" }
];

const halls = [
  { id: 1, name: "Innovation Hall", capacity: 180, facilities: "Projector · Wi-Fi · Audio", availability: "Available" },
  { id: 2, name: "Seminar Room B", capacity: 90, facilities: "Display · Wi-Fi", availability: "Available" },
  { id: 3, name: "Main Auditorium", capacity: 450, facilities: "Stage · Audio", availability: "Limited" }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
const timeToMinutes = value => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value || "");
  return match ? Number(match[1]) * 60 + Number(match[2]) : NaN;
};
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

app.post("/api/register", (req, res) => {
  const { name, email, role, password, confirmPassword, agree } = req.body;
  if (!name || name.trim().length < 3) return fail(res, "Enter a full name with at least 3 characters.");
  if (!emailPattern.test(email || "")) return fail(res, "Enter a valid college email address.");
  if (!["Student", "Faculty", "Maintenance", "Admin"].includes(role)) return fail(res, "Select a valid role.");
  if (!password || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return fail(res, "Password must contain at least 8 characters, including a letter and a number.");
  if (password !== confirmPassword) return fail(res, "Passwords do not match.");
  if (agree !== true && agree !== "true" && agree !== "on") return fail(res, "Please accept the platform usage policy.");
  if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) return fail(res, "An account with this email already exists.", 409);

  users.push({ id: users.length + 1, name: name.trim(), email: email.toLowerCase(), role, password });
  res.json({ success: true, message: "Account created. You can now sign in." });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!emailPattern.test(email || "")) return fail(res, "Enter a valid college email address.");
  if (!password) return fail(res, "Enter your password.");
  const user = users.find(u => u.email === email.toLowerCase() && u.password === password);
  if (!user) return fail(res, "Invalid email or password. Register first if you do not have an account.", 401);
  res.json({ success: true, user: { name: user.name, email: user.email, role: user.role } });
});

app.get("/api/dashboard", (req, res) => {
  res.json({
    success: true,
    bookings,
    events,
    incidents,
    stats: {
      myBookings: bookings.length,
      upcomingEvents: events.length + 2,
      openIncidents: incidents.filter(i => i.status !== "Resolved").length,
      assignedIncidents: incidents.filter(i => i.status !== "Resolved").length + 3,
      highPriority: incidents.filter(i => i.priority === "High" && i.status !== "Resolved").length,
      resolvedThisWeek: 11
    }
  });
});

app.get("/api/halls", (req, res) => {
  const { date, start, attendees } = req.query;
  if (date && !validDate(date)) return fail(res, "Choose a valid event date.");
  if (start && Number.isNaN(timeToMinutes(start))) return fail(res, "Choose a valid start time.");
  if (attendees && (!Number.isInteger(Number(attendees)) || Number(attendees) < 1)) return fail(res, "Attendees must be a positive whole number.");
  const count = Number(attendees || 0);
  const results = halls.map(h => {
    const clash = bookings.some(b => b.hall === h.name && b.date === date && b.status !== "Rejected");
    return { ...h, availability: count > h.capacity ? "Capacity exceeded" : clash ? "Booked" : h.availability };
  });
  res.json({ success: true, halls: results });
});

app.post("/api/bookings", (req, res) => {
  const { hall, title, date, start, end, attendees, type, notes } = req.body;
  const selectedHall = halls.find(h => h.name === hall);
  if (!selectedHall) return fail(res, "Select a valid hall.");
  if (!title || title.trim().length < 3 || title.trim().length > 100) return fail(res, "Event title must be between 3 and 100 characters.");
  if (!validDate(date)) return fail(res, "Select a valid event date.");
  if (date < new Date().toISOString().slice(0, 10)) return fail(res, "Event date cannot be in the past.");
  const startM = timeToMinutes(start), endM = timeToMinutes(end);
  if (Number.isNaN(startM) || Number.isNaN(endM) || endM <= startM) return fail(res, "End time must be later than start time.");
  if (!Number.isInteger(Number(attendees)) || Number(attendees) < 1) return fail(res, "Enter a valid attendee count.");
  if (Number(attendees) > selectedHall.capacity) return fail(res, `${hall} capacity is ${selectedHall.capacity}. Reduce the attendee count.`);
  if (!["Academic / seminar", "Workshop", "Guest lecture", "Cultural", "Other"].includes(type)) return fail(res, "Select a valid event type.");
  const clash = bookings.some(b => b.hall === hall && b.date === date && b.status !== "Rejected" &&
    startM < timeToMinutes(b.end) && endM > timeToMinutes(b.start));
  if (clash) return fail(res, "This hall already has a booking during the selected time. Choose another time or hall.", 409);

  const record = { id: Date.now(), hall, title: title.trim(), date, start, end, attendees: Number(attendees), type, notes: (notes || "").trim(), status: "Pending", owner: "Megha Varshini" };
  bookings.unshift(record);
  res.json({ success: true, message: "Booking request submitted and is pending approval.", booking: record });
});

app.post("/api/incidents", (req, res) => {
  const { location, category, priority, description } = req.body;
  if (!["Innovation Hall", "Seminar Room B", "Main Auditorium", "Lab Block A", "Library seminar area", "Other"].includes(location))
    return fail(res, "Select a valid hall or location.");
  if (!["Electrical", "Furniture", "Network", "Audio / visual", "Other"].includes(category)) return fail(res, "Select a valid issue category.");
  if (!["Normal", "High", "Urgent"].includes(priority)) return fail(res, "Select a valid priority.");
  if (!description || description.trim().length < 10 || description.trim().length > 500)
    return fail(res, "Description must be between 10 and 500 characters.");
  const nextNum = 1042 + incidents.length + 1;
  const incident = { id: `INC-${nextNum}`, issue: description.trim().slice(0, 55), location, category, priority, status: "Open", description: description.trim(), notes: "" };
  incidents.unshift(incident);
  res.json({ success: true, message: `Incident ${incident.id} has been reported.`, incident });
});

app.patch("/api/incidents/:id", (req, res) => {
  const { status, notes } = req.body;
  if (!["Open", "Assigned", "In progress", "Resolved"].includes(status)) return fail(res, "Select a valid incident status.");
  if (status === "Resolved" && (!notes || notes.trim().length < 5)) return fail(res, "Add resolution notes (at least 5 characters) before resolving.");
  const incident = incidents.find(i => i.id === req.params.id);
  if (!incident) return fail(res, "Incident not found.", 404);
  incident.status = status;
  incident.notes = (notes || "").trim();
  res.json({ success: true, message: "Incident updated successfully.", incident });
});

app.get("*", (req, res) => res.sendFile(path.join(__dirname, "public", "index.html")));
app.listen(PORT, () => console.log(`EventGuard running at http://localhost:${PORT}`));
