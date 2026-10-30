const $ = s => document.querySelector(s);
const authView = $("#authView"), appView = $("#appView");
let currentUser = null, dashboardData = null, selectedHall = "Innovation Hall";

function showMessage(target, message, success = false) {
  target.textContent = message;
  target.classList.remove("hidden", "success");
  if (success) target.classList.add("success");
}
function hideMessage(target) { target.classList.add("hidden"); }
function formObject(form) { return Object.fromEntries(new FormData(form).entries()); }
async function api(url, options = {}) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  const data = await response.json();
  if (!response.ok || !data.success) throw new Error(data.message || "Something went wrong.");
  return data;
}
function switchAuth(register) {
  $("#loginForm").classList.toggle("hidden", register);
  $("#registerForm").classList.toggle("hidden", !register);
  $("#authEyebrow").textContent = register ? "CREATE YOUR ACCOUNT" : "WELCOME BACK";
  $("#authHeading").textContent = register ? "Create your EventGuard account" : "Sign in to EventGuard";
  $("#authSub").textContent = register ? "Use your college details to get started." : "Enter your details to continue to your workspace.";
  $("#switchText").innerHTML = register ? 'Already registered? <a href="#" id="switchLink">Sign in</a>' : 'New to EventGuard? <a href="#" id="switchLink">Create an account</a>';
  $("#switchLink").addEventListener("click", e => { e.preventDefault(); switchAuth(!register); });
  $("#introTitle").innerHTML = register ? "Bring every campus<br>event together." : "Your campus events,<br>organized and secure.";
  hideMessage($("#authMessage"));
}
$("#switchLink").addEventListener("click", e => { e.preventDefault(); switchAuth(true); });
$("#forgotLink").addEventListener("click", e => { e.preventDefault(); showMessage($("#authMessage"), "For this demo, password reset is not connected. Please register a new demo account."); });

$("#registerForm").addEventListener("submit", async e => {
  e.preventDefault();
  const form = e.currentTarget, data = formObject(form);
  if (data.password !== data.confirmPassword) return showMessage($("#authMessage"), "Passwords do not match.");
  if (!form.elements.agree.checked) return showMessage($("#authMessage"), "Please accept the platform usage policy.");
  try {
    const result = await api("/api/register", { method: "POST", body: JSON.stringify({ ...data, agree: form.elements.agree.checked }) });
    showMessage($("#authMessage"), result.message, true); form.reset();
    setTimeout(() => switchAuth(false), 900);
  } catch (err) { showMessage($("#authMessage"), err.message); }
});
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  try {
    const result = await api("/api/login", { method: "POST", body: JSON.stringify(formObject(e.currentTarget)) });
    currentUser = result.user; openWorkspace();
  } catch (err) { showMessage($("#authMessage"), err.message); }
});
function openWorkspace() {
  authView.classList.add("hidden"); appView.classList.remove("hidden");
  $("#profileName").textContent = currentUser.name; $("#greeting").textContent = currentUser.name.split(" ")[0];
  $("#profileRole").textContent = currentUser.role; $("#avatar").textContent = currentUser.name.split(" ").map(x => x[0]).slice(0,2).join("").toUpperCase();
  loadPage("dashboard");
}
$("#logoutBtn").addEventListener("click", () => { currentUser = null; appView.classList.add("hidden"); authView.classList.remove("hidden"); $("#loginForm").reset(); });
document.querySelectorAll(".nav-link").forEach(btn => btn.addEventListener("click", () => loadPage(btn.dataset.page)));
function setActive(page) {
  document.querySelectorAll(".nav-link").forEach(b => b.classList.toggle("active", b.dataset.page === page));
}
async function loadPage(page) {
  setActive(page);
  const labels = { dashboard: "Dashboard", halls: "Find a hall", booking: "Booking request", events: "Event scheduling", incidents: "Incident tracking", maintenance: "Maintenance queue" };
  $("#crumb").textContent = labels[page] || "Dashboard";
  const root = $("#pageContent");
  try {
    dashboardData = await api("/api/dashboard");
    if (page === "dashboard") root.innerHTML = dashboardHTML();
    else if (page === "halls") root.innerHTML = hallsHTML();
    else if (page === "booking") root.innerHTML = bookingHTML();
    else if (page === "events") root.innerHTML = eventsHTML();
    else if (page === "incidents") root.innerHTML = incidentsHTML();
    else root.innerHTML = maintenanceHTML();
    wirePage(page);
  } catch (err) { root.innerHTML = `<div class="message">${escapeHTML(err.message)}</div>`; }
}
function escapeHTML(s="") { return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function pill(status) { return `<span class="pill ${status.toLowerCase().replaceAll(" ","-")}">${escapeHTML(status)}</span>`; }
function heading(title, subtitle, action="") { return `<div class="page-heading"><div><h1>${title}</h1><p>${subtitle}</p></div>${action}</div>`; }
function dashboardHTML() {
  const d = dashboardData;
  return `${heading("Dashboard","Your campus activity at a glance.")}
    <div class="stats"><div class="stat"><span>My bookings</span><strong>${String(d.stats.myBookings).padStart(2,"0")}</strong>${pill("1 awaiting approval")}</div><div class="stat"><span>Upcoming events</span><strong>${String(d.stats.upcomingEvents).padStart(2,"0")}</strong><small class="muted">Next event: 28 Oct</small></div><div class="stat"><span>Open incidents</span><strong>${String(d.stats.openIncidents).padStart(2,"0")}</strong><small class="muted">Updates available</small></div></div>
    <h2 class="section-title">Recent booking requests</h2><div class="panel table-wrap"><table class="data-table"><thead><tr><th>HALL / EVENT</th><th>DATE</th><th>TIME</th><th>STATUS</th></tr></thead><tbody>${d.bookings.slice(0,5).map(b=>`<tr><td><b>${escapeHTML(b.hall)} · ${escapeHTML(b.title)}</b></td><td class="muted-cell">${formatDate(b.date)}</td><td class="muted-cell">${b.start} – ${b.end}</td><td>${pill(b.status)}</td></tr>`).join("")}</tbody></table></div>
    <div class="cta"><div><h3>Planning something on campus?</h3><p>Check hall availability and submit a booking request in a few steps.</p></div><button class="btn" id="findHallBtn">Find a hall</button></div>`;
}
function hallsHTML() {
  return `${heading("Find a hall","Filter spaces by date, capacity and facilities.")}
    <form id="hallSearch" class="toolbar"><label class="field">EVENT DATE<input name="date" type="date" min="${new Date().toISOString().slice(0,10)}" value="2026-10-28" required></label><label class="field">START TIME<input name="start" type="time" value="10:00" required></label><label class="field">ATTENDEES<input name="attendees" type="number" min="1" max="450" value="120" required></label><button class="btn">Check availability</button><button type="reset" class="btn" style="background:#e8dcc1;color:#51483e">Reset</button></form>
    <h2 class="section-title">Available spaces</h2><div id="hallResults" class="hall-list"><p class="muted">Loading halls…</p></div>`;
}
function bookingHTML() {
  return `${heading("Booking request","Provide event details and send the request for approval.")}
  <div class="booking-grid"><div class="panel selected-space"><small class="eyebrow">SELECTED SPACE</small><h2 id="selectedHallName">${escapeHTML(selectedHall)}</h2><p id="selectedHallInfo" class="muted">Capacity 180 people<br>Facilities: Projector, Wi-Fi, audio</p>${pill("Available")}</div>
  <div><h2 class="section-title" style="margin-top:0">Booking details</h2><form id="bookingForm" class="form-stack booking-form">
  <label>Event title<input name="title" minlength="3" maxlength="100" placeholder="e.g. Project showcase" required></label>
  <div class="two-col"><label>Event date<input name="date" type="date" min="${new Date().toISOString().slice(0,10)}" required></label><label>Start time<input name="start" type="time" required></label><label>End time<input name="end" type="time" required></label><label>Expected attendees<input name="attendees" type="number" min="1" max="450" placeholder="120" required></label><label>Event type<select name="type" required><option value="">Choose type</option><option>Academic / seminar</option><option>Workshop</option><option>Guest lecture</option><option>Cultural</option><option>Other</option></select></label></div>
  <label>Purpose / notes<textarea name="notes" rows="3" maxlength="500" placeholder="Include setup requirements or additional information."></textarea></label><div class="notice">Your request remains pending until approved.</div><div class="between"><button class="btn">Submit booking request</button><button type="button" id="cancelBooking" class="btn" style="background:#e8dcc1;color:#51483e">Cancel</button></div><div id="bookingMessage" class="message hidden"></div></form></div></div>`;
}
function eventsHTML() {
  const d = dashboardData.events;
  const days = Array.from({length:35},(_,i)=>i<3?`<div class="day"></div>`:`<div class="day ${[9,18,27].includes(i-2)?"event":""}">${i-2<=31?i-2:""}</div>`);
  return `${heading("Event scheduling","Review approved events and coordinate the campus calendar.",'<button class="btn" id="createEventBtn">+ Create event</button>')}
  <div class="panel"><div class="between"><h3>October 2026</h3><span class="muted">Approved event&nbsp; • &nbsp;Pending review&nbsp; • &nbsp;Hall reserved</span></div></div>
  <div class="panel"><div class="calendar-head">${["MON","TUE","WED","THU","FRI","SAT","SUN"].map(x=>`<span>${x}</span>`).join("")}</div><div class="calendar">${days.join("")}</div></div>
  <h2 class="section-title">Upcoming events</h2><div class="event-list">${d.map(e=>`<div class="event-card"><div><b>${escapeHTML(e.title)}</b><p>${formatDate(e.date)} · ${escapeHTML(e.hall)}</p></div>${pill(e.status)}</div>`).join("")}</div>`;
}
function incidentsHTML() {
  return `${heading("Incident tracking","Report facility issues and follow their progress.",'<button class="btn" id="reportIncidentBtn">+ Report incident</button>')}
  <div class="incident-grid"><form id="incidentForm" class="panel form-stack" style="margin:0"><h2 style="margin:0;font:700 22px Manrope">Report a new issue</h2>
  <label>Related hall / location<select name="location" required><option value="">Select a hall or location</option><option>Innovation Hall</option><option>Seminar Room B</option><option>Main Auditorium</option><option>Lab Block A</option><option>Library seminar area</option><option>Other</option></select></label>
  <label>Issue category<select name="category" required><option value="">Choose category</option><option>Electrical</option><option>Furniture</option><option>Network</option><option>Audio / visual</option><option>Other</option></select></label>
  <label>Priority<select name="priority" required><option value="">Choose priority</option><option>Normal</option><option>High</option><option>Urgent</option></select></label>
  <label>Short description<textarea name="description" minlength="10" maxlength="500" rows="4" placeholder="Add details to help the maintenance team." required></textarea></label>
  <button class="btn">Submit incident</button><div id="incidentMessage" class="message hidden"></div></form>
  <div><h2 class="section-title" style="margin-top:0">My recent incidents</h2><div class="incident-list">${dashboardData.incidents.slice(0,5).map(incidentCard).join("")}</div></div></div>`;
}
function incidentCard(i) {
  return `<div class="incident-card"><div class="row"><small class="muted">${i.id}</small>${pill(i.status)}</div><h3>${escapeHTML(i.issue)}</h3><p>${escapeHTML(i.location)}</p><a data-update="${i.id}">View details →</a></div>`;
}
function maintenanceHTML() {
  const list = dashboardData.incidents;
  return `${heading("Maintenance queue","Review assigned incidents and record resolution updates.")}
  <div class="stats"><div class="stat"><span>Assigned to me</span><strong>${String(list.filter(i=>i.status!=="Resolved").length+3).padStart(2,"0")}</strong></div><div class="stat"><span>High priority</span><strong>${String(list.filter(i=>i.priority==="High"&&i.status!=="Resolved").length).padStart(2,"0")}</strong></div><div class="stat"><span>Resolved this week</span><strong>11</strong></div></div>
  <h2 class="section-title">Assigned incidents</h2><div class="panel table-wrap"><table class="data-table"><thead><tr><th>ID / ISSUE</th><th>LOCATION</th><th>PRIORITY</th><th>STATUS</th><th>ACTION</th></tr></thead><tbody>${list.map(i=>`<tr><td><b>${i.id} · ${escapeHTML(i.issue)}</b></td><td class="muted-cell">${escapeHTML(i.location)}</td><td>${pill(i.priority)}</td><td>${pill(i.status)}</td><td><a data-update="${i.id}" style="color:var(--lav);cursor:pointer">Update →</a></td></tr>`).join("")}</tbody></table></div><div class="cta" style="background:#dce7d0;color:#548263"><b>When resolving an issue, add repair notes and the resolution date before closing it.</b></div>`;
}
function formatDate(date) { return new Date(date+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}); }
function wirePage(page) {
  if (page==="dashboard") $("#findHallBtn").onclick=()=>loadPage("halls");
  if (page==="halls") {
    const form=$("#hallSearch"); const run=async()=>{const q=new URLSearchParams(formObject(form));try{const d=await api("/api/halls?"+q);$("#hallResults").innerHTML=d.halls.map((h,i)=>`<div class="hall-card"><div class="hall-number">0${i+1}</div><div><h3>${h.name}</h3><p>Capacity ${h.capacity} · ${h.facilities}</p>${pill(h.availability)}</div><button class="btn" data-book="${h.name}" ${["Booked","Capacity exceeded"].includes(h.availability)?"disabled":""}>Request booking</button></div>`).join("");document.querySelectorAll("[data-book]").forEach(b=>b.onclick=()=>{selectedHall=b.dataset.book;loadPage("booking");});}catch(e){$("#hallResults").innerHTML=`<div class="message">${escapeHTML(e.message)}</div>`;}};form.onsubmit=e=>{e.preventDefault();run();};form.onreset=()=>setTimeout(run,0);run();
  }
  if(page==="booking"){const form=$("#bookingForm");$("#selectedHallName").textContent=selectedHall;$("#cancelBooking").onclick=()=>loadPage("halls");form.onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/bookings",{method:"POST",body:JSON.stringify({...formObject(form),hall:selectedHall})});showMessage($("#bookingMessage"),d.message,true);form.reset();}catch(err){showMessage($("#bookingMessage"),err.message);}};}
  if(page==="incidents"){const form=$("#incidentForm");form.onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/incidents",{method:"POST",body:JSON.stringify(formObject(form))});showMessage($("#incidentMessage"),d.message,true);form.reset();setTimeout(()=>loadPage("incidents"),800);}catch(err){showMessage($("#incidentMessage"),err.message);}};$("#reportIncidentBtn").onclick=()=>form.elements.location.focus();}
  if(page==="events")$("#createEventBtn").onclick=()=>{loadPage("booking");};
  document.querySelectorAll("[data-update]").forEach(a=>a.onclick=()=>openUpdate(a.dataset.update));
}
function openUpdate(id){const incident=dashboardData.incidents.find(i=>i.id===id);if(!incident)return;const form=$("#updateIncidentForm");form.elements.id.value=id;form.elements.status.value=incident.status;form.elements.notes.value=incident.notes||"";$("#modalMessage").classList.add("hidden");$("#modal").classList.remove("hidden");}
$("#modalClose").onclick=()=>$("#modal").classList.add("hidden");
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")$("#modal").classList.add("hidden");});
$("#updateIncidentForm").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;try{const d=await api("/api/incidents/"+encodeURIComponent(f.elements.id.value),{method:"PATCH",body:JSON.stringify({status:f.elements.status.value,notes:f.elements.notes.value})});showMessage($("#modalMessage"),d.message,true);setTimeout(()=>{$("#modal").classList.add("hidden");loadPage("maintenance");},700);}catch(err){showMessage($("#modalMessage"),err.message);}};
