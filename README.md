# OptiShot — Générateur de visuels IA
**Capway Finance × Stability AI · Usage interne**

---

## Structure du projet

```
optishot/
├── pages/
│   ├── index.js          ← Frontend React (design Capway Finance)
│   ├── _app.js           ← Import CSS global
│   └── api/
│       └── generate.js   ← Proxy serveur → Stability AI (clé jamais exposée)
├── styles/
│   └── globals.css       ← Tout le CSS (charte Capway)
├── .env.local            ← Clé API (ne jamais committer)
├── .gitignore            ← Exclut .env.local et node_modules
├── package.json
└── README.md
```

---

## Lancer en local

### 1. Prérequis
- Node.js 18+ ([nodejs.org](https://nodejs.org))
- Un compte Stability AI avec des crédits ([platform.stability.ai](https://platform.stability.ai))

### 2. Installer les dépendances
```bash
cd optishot
npm install
```

### 3. Vérifier la clé API
Le fichier `.env.local` contient déjà :
```
STABILITY_API_KEY=sk-EnaDGFQCqCi1ONqV7RfYScgT50W4c9HT15MO8emaVvu1WaR9
```
Si vous avez régénéré la clé, mettez-la à jour ici.

### 4. Démarrer le serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000)

---

## Déployer sur Vercel

### Étape 1 — Créer un dépôt GitHub
```bash
# Dans le dossier optishot/
git init
git add .
git commit -m "feat: OptiShot générateur initial"
```
Créez un dépôt privé sur [github.com](https://github.com) et poussez :
```bash
git remote add origin https://github.com/VOTRE_USER/optishot.git
git push -u origin main
```
> ⚠️ Le dépôt **doit être privé**. `.env.local` est dans `.gitignore` — la clé n'est pas committée.

### Étape 2 — Créer le projet sur Vercel
1. Allez sur [vercel.com](https://vercel.com) → **Add New Project**
2. Importez votre dépôt GitHub `optishot`
3. Framework Preset : **Next.js** (détecté automatiquement)
4. **Ne touchez pas** les autres paramètres
5. Cliquez **Deploy** — Vercel fait le build

### Étape 3 — Ajouter la variable d'environnement
> C'est l'étape la plus importante. Sans elle, le serveur Vercel n'a pas la clé.

1. Dans votre projet Vercel → **Settings** → **Environment Variables**
2. Cliquez **Add**
3. Name : `STABILITY_API_KEY`
4. Value : `sk-EnaDGFQCqCi1ONqV7RfYScgT50W4c9HT15MO8emaVvu1WaR9`
5. Environments : cochez **Production**, **Preview**, **Development**
6. Cliquez **Save**

### Étape 4 — Redéployer
1. Onglet **Deployments** → cliquez sur le dernier déploiement
2. Cliquez **Redeploy** (avec le nouveau env var)
3. Votre URL est du type `https://optishot-xxx.vercel.app`

---

## Architecture : pourquoi ça résout le CORS

```
Navigateur  →  /api/generate (Vercel, même domaine)  →  api.stability.ai
             ← image base64                           ← image base64
```

- Le navigateur appelle **votre propre API route** → pas de CORS
- L'API route Vercel appelle Stability AI **côté serveur** → la clé n'est jamais visible
- Même en "Inspecter le réseau" dans Chrome, on ne voit que `/api/generate` — jamais la clé

---

## Mettre à jour la clé API

1. Régénérez la clé sur [platform.stability.ai/account/keys](https://platform.stability.ai/account/keys)
2. Vercel → Settings → Environment Variables → modifier `STABILITY_API_KEY`
3. Redéployez (ou le prochain push déclenche un redéploiement automatique)
4. Mettez aussi à jour `.env.local` pour le dev local

---

## Commandes utiles

| Commande | Usage |
|---|---|
| `npm run dev` | Développement local (localhost:3000) |
| `npm run build` | Build de production (test avant déploiement) |
| `npm run start` | Démarre la version buildée en local |

---

*Capway Finance · Document interne · Ne pas distribuer*
