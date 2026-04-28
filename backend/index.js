const express = require("express");
const cors = require("cors");

require("dotenv").config();
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// ================= DB =================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.query("SELECT NOW()")
    .then(() => console.log("Connecté à PostgreSQL "))
    .catch(err => console.error("Erreur connexion :", err));

// ================= LOGIN =================
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(
            "SELECT * FROM users WHERE username=$1 AND password=$2",
            [username, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: "Identifiants incorrects" });
        }

        res.json({
            message: "Connexion réussie",
            role: result.rows[0].role
        });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= REGISTER =================
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;

    try {
        const exist = await pool.query(
            "SELECT * FROM users WHERE username=$1",
            [username]
        );

        if (exist.rows.length > 0) {
            return res.status(400).json({ message: "Utilisateur existe déjà" });
        }

        await pool.query(
            "INSERT INTO users (username, password, role) VALUES ($1, $2, 'user')",
            [username, password]
        );

        res.json({ message: "Inscription réussie !" });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= AJOUT =================
app.post("/api/etudiants", async (req, res) => {
    let { nom, prenom, matricule, date_naissance, filiere, sexe } = req.body;

    const mat = String(matricule).trim().toUpperCase();
    const regex = /^\d{2}[A-Z]\d{4}$/;

    if (!regex.test(mat)) {
        return res.status(400).json({
            message: "Matricule invalide (ex: 24H2324)"
        });
    }

    try {
        await pool.query(
            "INSERT INTO etudiants (matricule, nom, prenom, date_naissance, filiere, sexe) VALUES ($1, $2, $3, $4, $5, $6)",
            [mat, nom, prenom, date_naissance, filiere, sexe]
        );

        res.json({ message: "Étudiant ajouté !" });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= LISTE =================
app.get("/api/etudiants", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM etudiants ORDER BY matricule"
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= GET ONE =================
app.get("/api/etudiants/:mat", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM etudiants WHERE matricule=$1",
            [req.params.mat]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Non trouvé" });
        }

        res.json(result.rows[0]);

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= UPDATE =================
app.put("/api/etudiants/:mat", async (req, res) => {
    const { nom, prenom, date_naissance, filiere, sexe } = req.body;

    try {
        await pool.query(
            "UPDATE etudiants SET nom=$1, prenom=$2, date_naissance=$3, filiere=$4, sexe=$5 WHERE matricule=$6",
            [nom, prenom, date_naissance, filiere, sexe, req.params.mat]
        );

        res.json({ message: "Étudiant modifié !" });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= DELETE =================
app.delete("/api/etudiants/:mat", async (req, res) => {
    try {
        await pool.query(
            "DELETE FROM etudiants WHERE matricule=$1",
            [req.params.mat]
        );

        res.json({ message: "Étudiant supprimé !" });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= STATS =================
app.get("/api/stats", async (req, res) => {
    try {
        const total = await pool.query(
            "SELECT COUNT(*) as total FROM etudiants"
        );

        const filiere = await pool.query(
            "SELECT filiere, COUNT(*) as total FROM etudiants GROUP BY filiere"
        );

        const sexe = await pool.query(
            "SELECT sexe, COUNT(*) as total FROM etudiants GROUP BY sexe"
        );

        res.json({
            total: total.rows[0].total,
            par_filiere: filiere.rows,
            par_sexe: sexe.rows
        });

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= SEARCH =================
app.get("/api/etudiants/search", async (req, res) => {
    const q = req.query.q || "";

    try {
        const result = await pool.query(
            "SELECT * FROM etudiants WHERE nom ILIKE $1 OR prenom ILIKE $1 OR matricule ILIKE $1",
            [`%${q}%`]
        );

        res.json(result.rows);

    } catch (err) {
        res.status(500).json(err);
    }
});

// ================= SERVER =================
app.listen(3000, () => {
    console.log("Serveur lancé sur http://localhost:3000");
});
