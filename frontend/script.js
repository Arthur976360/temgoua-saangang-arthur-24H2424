// ================= SUPABASE CONFIG =================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = "https://dwqvstndnaopujtuevrx.supabase.co";
const supabaseKey = "sb_publishable_6VnxP7gtTtAu-J-AxHCraw_5BPLCkOu";

const supabase = createClient(supabaseUrl, supabaseKey);

// ================= VARIABLES =================
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

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {
  if (authPopup) authPopup.classList.remove("popup-hidden");
});

// ================= MATRICULE =================
if (matriculeInput) {
  matriculeInput.addEventListener("input", (e) => {
    let value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (value.length > 7) value = value.slice(0, 7);
    e.target.value = value;
  });
}

// ================= AUTH =================
function setUserMode() {
  role = "user";
  hidePopup();
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

function adminLogin() {
  const username = document.getElementById("adminUsername").value;
  const password = document.getElementById("adminPassword").value;

  if (username === "admin" && password === "1234") {
    role = "admin";
    hideAdminPopup();
    chargerEtudiants();
    chargerStats();
    return;
  }
  alert("Identifiants incorrects");
}

// ================= AJOUT / UPDATE =================
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

  let error;

  if (editingMatricule) {
    ({ error } = await supabase
      .from("etudiant")
      .update(data)
      .eq("matricule", editingMatricule));
  } else {
    const res = await supabase
      .from("etudiant")
      .insert([data])
      .select();

    error = res.error;
  }

  if (error) {
    message.innerText = error.message;
  } else {
    message.innerText = "Succès ✅";
    form.reset();
    editingMatricule = null;

    await chargerEtudiants();
    await chargerStats();
  }
});

// ================= LECTURE =================
async function chargerEtudiants() {
  const { data, error } = await supabase
    .from("etudiant")
    .select("*");

  if (error) {
    liste.innerHTML = "<p>Erreur de connexion</p>";
    return;
  }

  console.log("ETUDIANTS:", data);

  liste.innerHTML = "";

  (data || []).forEach(e => {
    liste.innerHTML += `
      <div class="etudiant">
        <strong>${e.nom} ${e.prenom}</strong> - ${e.matricule}
        <div>
          ${role === "admin" ? `
            <button onclick="editStudent('${e.matricule}')">Modifier</button>
            <button onclick="deleteStudent('${e.matricule}')">Supprimer</button>
          ` : ''}
        </div>
      </div>`;
  });
}

// ================= EDIT =================
async function editStudent(mat) {
  if (role !== "admin") return;

  const { data, error } = await supabase
    .from("etudiant")
    .select("*")
    .eq("matricule", mat)
    .single();

  if (error || !data) return;

  document.getElementById('nom').value = data.nom;
  document.getElementById('prenom').value = data.prenom;
  matriculeInput.value = data.matricule;
  document.getElementById('date_naissance').value = data.date_naissance || '';
  document.getElementById('filiere').value = data.filiere || '';
  document.getElementById('sexe').value = data.sexe || '';

  editingMatricule = mat;
}

// ================= DELETE =================
async function deleteStudent(mat) {
  if (role !== "admin") return;
  if (!confirm("Supprimer cet étudiant ?")) return;

  await supabase
    .from("etudiant")
    .delete()
    .eq("matricule", mat);

  await chargerEtudiants();
  await chargerStats();
}

// ================= STATS =================
async function chargerStats() {
  const { data, error } = await supabase
    .from("etudiant")
    .select("*");

  if (error) return;

  const total = data ? data.length : 0;

  stats.innerHTML = `<p>Total étudiants : ${total}</p>`;
}

// ================= SEARCH =================
search.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();

  document.querySelectorAll(".etudiant").forEach(el => {
    el.style.display = el.textContent.toLowerCase().includes(term)
      ? "block"
      : "none";
  });
});

// ================= EXPORT FUNCTIONS =================
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
window.setUserMode = setUserMode;
window.showAdminLogin = showAdminLogin;
window.adminLogin = adminLogin;
window.hideAdminPopup = hideAdminPopup;
