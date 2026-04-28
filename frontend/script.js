const API = "/api";                    // ← Important pour Vercel
let editingMatricule = null;
let role = null;

// Elements
const authPopup = document.getElementById("authPopup");
const adminLoginPopup = document.getElementById("adminLoginPopup");
const matriculeInput = document.getElementById("matricule");
const form = document.getElementById("form");
const liste = document.getElementById("liste");
const stats = document.getElementById("stats");
const message = document.getElementById("message");
const search = document.getElementById("search");

// Sanitize matricule input
if (matriculeInput) {
  matriculeInput.addEventListener("input", (e) => {
    let value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (value.length > 7) value = value.slice(0, 7);
    e.target.value = value;
  });
}

// Authentification simple
document.addEventListener("DOMContentLoaded", () => {
  if (authPopup) authPopup.classList.remove("popup-hidden");
});

function showChoicePopup() {
  if (authPopup) authPopup.classList.remove("popup-hidden");
}

function setUserMode() {
  role = "user";
  hidePopup();
  alert("Mode Utilisateur activé");
  chargerEtudiants();
  chargerStats();
}

function showAdminLogin() {
  hidePopup();
  if (adminLoginPopup) adminLoginPopup.classList.remove("popup-hidden");
}

function hidePopup() {
  if (authPopup) authPopup.classList.add("popup-hidden");
}

function hideAdminPopup() {
  if (adminLoginPopup) adminLoginPopup.classList.add("popup-hidden");
}

async function adminLogin() {
  const username = document.getElementById("adminUsername").value;
  const password = document.getElementById("adminPassword").value;
  
  if (username === "admin" && password === "1234") {
    role = "admin";
    hideAdminPopup();
    alert(" Admin connecté ! Accès complet");
    chargerEtudiants();
    return;
  }
  alert("Identifiants incorrects (admin / 1234)");
}

// ================= FORM SUBMIT =================
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const regex = /^\d{2}[A-Z]\d{4}$/;
  if (!regex.test(matriculeInput.value)) {
    message.innerText = "Matricule invalide ! Exemple : 24H2324";
    return;
  }

  const data = {
    nom: document.getElementById('nom').value,
    prenom: document.getElementById('prenom').value,
    matricule: matriculeInput.value.toUpperCase(),
    date_naissance: document.getElementById('date_naissance').value,
    filiere: document.getElementById('filiere').value,
    sexe: document.getElementById('sexe').value
  };

  let res;
  if (editingMatricule) {
    res = await fetch(API + "/etudiants/" + editingMatricule, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  } else {
    res = await fetch(API + "/etudiants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }

  const result = await res.json();
  message.innerText = result.message || "Opération effectuée";

  if (res.ok) {
    form.reset();
    editingMatricule = null;
    chargerEtudiants();
    chargerStats();
  }
});

// ================= CHARGER ÉTUDIANTS =================
async function chargerEtudiants() {
  try {
    const res = await fetch(API + "/etudiants");
    const data = await res.json();

    liste.innerHTML = "";

    data.forEach(e => {
      liste.innerHTML += `
        <div class="etudiant">
          <strong>${e.nom} ${e.prenom}</strong> - ${e.matricule}<br>
          <small>${e.filiere} | ${e.sexe} | ${e.date_naissance ? new Date(e.date_naissance).toLocaleDateString('fr-FR') : ''}</small>
          <div class="actions">
            ${role === "admin" ? `
              <button onclick="editStudent('${e.matricule}')">Modifier</button>
              <button onclick="deleteStudent('${e.matricule}')" class="btn-danger">Supprimer</button>
            ` : ''}
          </div>
        </div>`;
    });
  } catch (err) {
    console.error(err);
    liste.innerHTML = "<p>Erreur de connexion au serveur.</p>";
  }
}

// ================= EDIT & DELETE =================
async function editStudent(mat) {
  if (role !== "admin") return alert("Admin seulement");
  try {
    const res = await fetch(API + "/etudiants/" + mat);
    const e = await res.json();

    document.getElementById('nom').value = e.nom;
    document.getElementById('prenom').value = e.prenom;
    matriculeInput.value = e.matricule;
    document.getElementById('date_naissance').value = e.date_naissance || '';
    document.getElementById('filiere').value = e.filiere || '';
    document.getElementById('sexe').value = e.sexe || '';
    editingMatricule = mat;
  } catch (err) {
    alert("Erreur lors du chargement");
  }
}

async function deleteStudent(mat) {
  if (role !== "admin") return alert("Admin seulement");
  if (!confirm("Supprimer cet étudiant ?")) return;

  try {
    await fetch(API + "/etudiants/" + mat, { method: "DELETE" });
    chargerEtudiants();
    chargerStats();
  } catch (err) {
    alert("Erreur lors de la suppression");
  }
}

// ================= STATS =================
let chart1, chart2;

async function chargerStats() {
  try {
    const res = await fetch(API + "/stats");
    const data = await res.json();

    stats.innerHTML = `
      <p><strong>Total des étudiants :</strong> ${data.total}</p>
      <div style="max-width:500px; margin:20px auto;"><canvas id="c1"></canvas></div>
      <div style="max-width:400px; margin:20px auto;"><canvas id="c2"></canvas></div>
    `;

    if (chart1) chart1.destroy();
    if (chart2) chart2.destroy();

    chart1 = new Chart(document.getElementById('c1'), {
      type: 'bar',
      data: {
        labels: data.par_filiere.map(f => f.filiere),
        datasets: [{ label: 'Par filière', data: data.par_filiere.map(f => f.total), backgroundColor: '#4bc0c0' }]
      },
      options: { responsive: true }
    });

    chart2 = new Chart(document.getElementById('c2'), {
      type: 'pie',
      data: {
        labels: data.par_sexe.map(s => s.sexe),
        datasets: [{ data: data.par_sexe.map(s => s.total), backgroundColor: ['#FF6384', '#36A2EB'] }]
      },
      options: { responsive: true }
    });
  } catch (err) {
    console.error("Erreur stats:", err);
  }
}

// Toggle entre liste et stats
function afficherListe() {
  liste.style.display = "block";
  stats.style.display = "none";
  chargerEtudiants();
}

function afficherStats() {
  liste.style.display = "none";
  stats.style.display = "block";
  chargerStats();
}

// Search (local)
search.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  document.querySelectorAll(".etudiant").forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(term) ? "block" : "none";
  });
});
