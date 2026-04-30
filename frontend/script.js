
// ================= SUPABASE CONFIG =================
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = "https://dwqvstndnaopujtuevrx.supabase.co";
const supabaseKey = "sb_publishable_6VnxP7gtTtAu-J-AxHCraw_5BPLCkOu";

const supabase = createClient(supabaseUrl, supabaseKey);

// ================= VARIABLES =================
let editingMatricule = null;
let role = null;

// ================= ELEMENTS =================
let authPopup, adminLoginPopup;
let form, matriculeInput, liste, stats, message, search;

// ================= INIT DOM =================
window.addEventListener("load", () => {
  authPopup = document.getElementById("authPopup");
  adminLoginPopup = document.getElementById("adminLoginPopup");

  form = document.getElementById("form");
  matriculeInput = document.getElementById("matricule");

  liste = document.getElementById("liste");
  stats = document.getElementById("stats");
  message = document.getElementById("message");
  search = document.getElementById("search");

  // 👉 POPUP AU DÉMARRAGE
  if (authPopup) {
    authPopup.classList.remove("popup-hidden");
  }

  initEvents();
});

// ================= EVENTS =================
function initEvents() {

  // matricule MAJUSCULE
  if (matriculeInput) {
    matriculeInput.addEventListener("input", (e) => {
      let value = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "");
      if (value.length > 7) value = value.slice(0, 7);
      e.target.value = value;
    });
  }

  // form submit
  if (form) {
    form.addEventListener("submit", submitForm);
  }

  // search
  if (search) {
    search.addEventListener("input", (e) => {
      const term = e.target.value.toLowerCase();
      document.querySelectorAll(".etudiant").forEach(el => {
        el.style.display = el.textContent.toLowerCase().includes(term)
          ? "block"
          : "none";
      });
    });
  }
}

// ================= AUTH =================
function setUserMode() {
  role = "user";
  hideAuthPopup();
  initApp();
}

function showAdminLogin() {
  hideAuthPopup();
  if (adminLoginPopup) adminLoginPopup.classList.remove("popup-hidden");
}

function hideAuthPopup() {
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
    initApp();
  } else {
    alert("Identifiants incorrects");
  }
}

// ================= INIT APP =================
async function initApp() {
  await chargerEtudiants();
  await chargerStats();
}

// ================= AJOUT / UPDATE =================
async function submitForm(e) {
  e.preventDefault();

  const regex = /^\d{2}[A-Z]\d{4}$/;

  if (!regex.test(matriculeInput.value)) {
    message.innerText = "Matricule invalide (ex: 24H2324)";
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
    const res = await supabase
      .from("etudiant")
      .update(data)
      .eq("matricule", editingMatricule);

    error = res.error;
  } else {
    const res = await supabase
      .from("etudiant")
      .insert([data])
      .select();

    console.log("INSERT:", res);
    error = res.error;
  }

  if (error) {
    message.innerText = error.message;
    console.error(error);
    return;
  }

  message.innerText = "Succès ✅";
  form.reset();
  editingMatricule = null;

  await initApp();
}

// ================= LISTE =================
async function chargerEtudiants() {
  const { data, error } = await supabase
    .from("etudiant")
    .select("*");

  if (error) {
    console.error(error);
    liste.innerHTML = "<p>Erreur chargement</p>";
    return;
  }

  liste.innerHTML = "";

  (data || []).forEach(e => {
    liste.innerHTML += `
      <div class="etudiant">
        <strong>${e.nom} ${e.prenom}</strong> - ${e.matricule}
        <div>
          ${role === "admin" ? `
            <button onclick="editStudent('${e.matricule}')">Modifier</button>
            <button onclick="deleteStudent('${e.matricule}')">Supprimer</button>
          ` : ""}
        </div>
      </div>
    `;
  });
}

// ================= EDIT =================
async function editStudent(mat) {
  if (role !== "admin") return;

  const { data } = await supabase
    .from("etudiant")
    .select("*")
    .eq("matricule", mat)
    .single();

  if (!data) return;

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
  if (!confirm("Supprimer ?")) return;

  await supabase
    .from("etudiant")
    .delete()
    .eq("matricule", mat);

  await initApp();
}

// ================= STATS =================
async function chargerStats() {
  const { data } = await supabase
    .from("etudiant")
    .select("*");

  const total = Array.isArray(data) ? data.length : 0;

  stats.innerHTML = `<p>Total : ${total}</p>`;
}

// ================= EXPORT (IMPORTANT UI FIX) =================
window.setUserMode = setUserMode;
window.showAdminLogin = showAdminLogin;
window.adminLogin = adminLogin;
window.editStudent = editStudent;
window.deleteStudent = deleteStudent;
