const API = "http://localhost:3000";
let editingMatricule = null;
let role = null;

// Elements refs
const authPopup = document.getElementById("authPopup");
const authSwitch = document.getElementById("authSwitch");
const adminLoginPopup = document.getElementById("adminLoginPopup");
const matriculeInput = document.getElementById("matricule");
const form = document.getElementById("form");
const liste = document.getElementById("liste");
const stats = document.getElementById("stats");
const message = document.getElementById("message");
const search = document.getElementById("search");

// Sanit matricule
if (matriculeInput) {
  matriculeInput.addEventListener("input", (e) => {
    let value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (value.length > 7) value = value.slice(0, 7);
    e.target.value = value;
  });
}

// Block UI + popup load
document.addEventListener("DOMContentLoaded", () => {
  // NO BLOCK - popup visible but clickable
  if (authPopup) authPopup.classList.remove("popup-hidden");
  if (authSwitch) authSwitch.addEventListener("click", showChoicePopup);
});

//  click → choice popup
function showChoicePopup() {
  if (authPopup) authPopup.classList.remove("popup-hidden");
  // NO FULL BLOCK - popup overlay only
}

// User mode
function setUserMode() {
  role = "user";
  hidePopup();
  document.body.style.pointerEvents = "auto";
  document.querySelectorAll("h2, #form, #search").forEach(el => el.style.opacity = "1");
  alert(" Mode utilisateur activé (ajouter/consulter)");
}

// Admin popup
function showAdminLogin() {
  hidePopup();
  if (adminLoginPopup) adminLoginPopup.classList.remove("popup-hidden");
}

function hideAdminPopup() {
  adminLoginPopup.classList.add("popup-hidden");
}

function hidePopup() {
  authPopup.classList.add("popup-hidden");
}

// Admin login
async function adminLogin() {
  const username = document.getElementById("adminUsername").value;
  const password = document.getElementById("adminPassword").value;
  
  if (username === "admin" && password === "1234") {
    role = "admin";
    hideAdminPopup();
    document.body.style.pointerEvents = "auto";
    document.querySelectorAll("h2, #form, #search").forEach(el => el.style.opacity = "1");
    alert(" Admin connecté ! Accès complet");
    return;
  }
  
  alert(" admin/1234 requis");
}

// Form submit
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const regex = /^\d{2}[A-Z]\d{4}$/;
  const matriculeValue = matriculeInput.value;
  if (!regex.test(matriculeValue)) {
    message.innerText = "Matricule invalide ! 24H2324";
    return;
  }

  const data = {
    nom: document.getElementById('nom').value,
    prenom: document.getElementById('prenom').value,
    matricule: matriculeInput.value,
    date_naissance: document.getElementById('date_naissance').value,
    filiere: document.getElementById('filiere').value,
    sexe: document.getElementById('sexe').value
  };

  let res;
  if (editingMatricule) {
    res = await fetch(API + "/api/etudiants/" + editingMatricule, {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });
  } else {
    res = await fetch(API + "/api/etudiants", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });
  }

  const result = await res.json();
  message.innerText = result.message;

  if (res.ok) {
    form.reset();
    editingMatricule = null;
    chargerEtudiants();
    chargerStats();
  }
});

// Charger liste
async function chargerEtudiants() {
  const res = await fetch(API + "/api/etudiants");
  const data = await res.json();
  liste.innerHTML = "";
  data.forEach(e => {
    liste.innerHTML += `
      <div class="etudiant">
        ${e.nom} ${e.prenom} - ${e.matricule} <span class="date-naissance">${new Date(e.date_naissance).toLocaleDateString('fr-FR')}</span>
        <div class="actions">
          ${role === "admin" ? `<button onclick="editStudent('${e.matricule}')">MODIFIER</button>
          <button onclick="deleteStudent('${e.matricule}')" class="btn-danger">SUPPRIMER</button>` : ''}
        </div>
      </div>`;
  });
}

// Edit
async function editStudent(mat) {
  if (role !== "admin") return alert("Admin seulement");
  const res = await fetch(API + "/api/etudiants/" + mat);
  const e = await res.json();
  document.getElementById('nom').value = e.nom;
  document.getElementById('prenom').value = e.prenom;
  matriculeInput.value = e.matricule;
  document.getElementById('date_naissance').value = e.date_naissance;
  document.getElementById('filiere').value = e.filiere;
  document.getElementById('sexe').value = e.sexe;
  editingMatricule = mat;
}

// Delete
async function deleteStudent(mat) {
  if (role !== "admin") return alert("Admin seulement");
  if (confirm("Supprimer ?")) {
    await fetch(API + "/api/etudiants/" + mat, {method: "DELETE"});
    chargerEtudiants();
  }
}

// Stats
async function chargerStats() {
  const res = await fetch(API + "/api/stats");
  const data = await res.json();
  
  if (stats.innerHTML === ``) {
    stats.innerHTML = `<p>Total: ${data.total}</p>
      <canvas id="c1" width="400" height="200"></canvas>
      <canvas id="c2" width="400" height="200"></canvas>`;
  }
  
  if (window.chart1) chart1.destroy();
  if (window.chart2) chart2.destroy();
  
  window.chart1 = new Chart(document.getElementById('c1'), {
    type: 'bar',
    data: {
      labels: data.par_filiere.map(f => f.filiere),
      datasets: [{
        label: 'Par filière',
        data: data.par_filiere.map(f => f.total),
        backgroundColor: 'rgba(75, 192, 192, 0.6)'
      }]
    }
  });
  
  window.chart2 = new Chart(document.getElementById('c2'), {
    type: 'pie',
    data: {
      labels: data.par_sexe.map(s => s.sexe),
      datasets: [{
        data: data.par_sexe.map(s => s.total),
        backgroundColor: ['#FF6384', '#36A2EB']
      }]
    }
  });
}

// Toggle liste/stats
function afficherListe() {liste.style.display = "block"; stats.style.display = "none"; chargerEtudiants();}
function afficherStats() {stats.style.display = "block"; liste.style.display = "none"; chargerStats();}

// Search
search.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".etudiant").forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(term) ? "flex" : "none";
  });
});
