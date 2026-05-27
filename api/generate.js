<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OptiShot — Visuels IA pour opticiens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --creme:#F4EFE6;--blanc:#FDFAF6;
  --vert:#14402C;--vert-l:#1D5A3E;
  --g10:rgba(20,64,44,.08);--g20:rgba(20,64,44,.18);
  --t:#111110;--t6:rgba(17,17,16,.6);--t4:rgba(17,17,16,.4);
  --t15:rgba(17,17,16,.15);--t08:rgba(17,17,16,.08);
  --rouge:#C0392B;
  --rad:12px;--rad-s:8px;
  --ft:'Playfair Display',Georgia,serif;
  --fb:'Inter',system-ui,sans-serif;
}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
body{background:var(--creme);color:var(--t);font-family:var(--fb);font-weight:300;line-height:1.5;min-height:100vh;-webkit-font-smoothing:antialiased}

/* ══════════════════════════════════════
   HEADER
══════════════════════════════════════ */
.hdr{background:var(--vert);padding:0 32px;height:56px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:100}
.hdr-l{display:flex;align-items:center;gap:12px}
.hdr-mk{width:30px;height:30px;border:1px solid rgba(244,239,230,.35);display:flex;align-items:center;justify-content:center;font-family:var(--ft);font-size:13px;color:rgba(244,239,230,.9);font-style:italic;border-radius:5px;flex-shrink:0}
.hdr-n{font-size:15px;font-weight:600;color:rgba(244,239,230,.9)}
.hdr-b{font-size:10px;font-weight:600;color:var(--vert);background:rgba(244,239,230,.9);padding:4px 10px;letter-spacing:.06em;text-transform:uppercase;border-radius:100px}

/* ══════════════════════════════════════
   PAGE WRAPPER
══════════════════════════════════════ */
.page{max-width:1100px;margin:0 auto;padding:0 24px 60px}

/* ══════════════════════════════════════
   HERO
══════════════════════════════════════ */
.hero{padding:40px 0 28px;border-bottom:1px solid var(--t08);margin-bottom:32px}
.hero h1{font-family:var(--ft);font-size:clamp(2rem,4vw,3.4rem);font-weight:400;color:var(--t);line-height:1.1;margin-bottom:10px}
.hero h1 em{font-style:italic;color:var(--vert)}
.hero p{font-size:15px;font-weight:300;color:var(--t6);max-width:560px;line-height:1.65}

/* ══════════════════════════════════════
   DESKTOP GRID — 2 colonnes
══════════════════════════════════════ */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start}
.col-left{display:flex;flex-direction:column;gap:16px}
.col-right{position:sticky;top:80px}

/* ══════════════════════════════════════
   CARD
══════════════════════════════════════ */
.card{background:var(--blanc);border-radius:var(--rad);box-shadow:0 2px 16px rgba(17,17,16,.08);overflow:hidden}
.ch{padding:16px 20px;border-bottom:1px solid var(--t08);display:flex;align-items:center;gap:10px}
.ci{width:32px;height:32px;background:var(--g10);border-radius:var(--rad-s);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.ci svg{width:16px;height:16px;color:var(--vert)}
.ct{font-size:15px;font-weight:600;color:var(--t);flex:1}
.cs{font-size:11px;font-weight:500;color:var(--t4);background:var(--t08);padding:3px 10px;border-radius:100px;flex-shrink:0}
.cb{padding:20px}

/* ══════════════════════════════════════
   TIP
══════════════════════════════════════ */
.tip{font-size:13px;line-height:1.6;margin-bottom:16px;background:var(--g10);border-radius:var(--rad-s);padding:12px 14px;color:var(--t6)}
.tip strong{color:var(--vert);font-weight:600}
.tip-warn{display:block;margin-top:6px;font-size:12px;color:var(--rouge);font-weight:500}

/* ══════════════════════════════════════
   PHOTO GRID
══════════════════════════════════════ */
.pgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px}
.pslot{aspect-ratio:1;border-radius:var(--rad-s);border:2px dashed rgba(20,64,44,.2);position:relative;overflow:hidden;background:var(--creme);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;transition:all .2s;-webkit-tap-highlight-color:transparent}
.pslot:hover,.pslot.ov{border-color:var(--vert);background:var(--g10)}
.pslot.fi{border-style:solid;border-color:var(--g20)}
.pslot.fi img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.pslot input{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%;font-size:16px;z-index:1}
.si svg{width:20px;height:20px;color:rgba(20,64,44,.3)}
.sl{font-size:9px;font-weight:700;color:rgba(20,64,44,.28);letter-spacing:.08em}
.rm{position:absolute;top:5px;right:5px;width:22px;height:22px;background:rgba(17,17,16,.72);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;z-index:2}
.rm svg{width:11px;height:11px}
.mtag{display:none;align-items:center;gap:6px;font-size:12px;font-weight:500;color:var(--vert);background:var(--g10);border:1px solid var(--g20);border-radius:100px;padding:5px 12px;margin-bottom:14px}
.mtag svg{width:12px;height:12px}
.mtag.on{display:inline-flex}

/* ══════════════════════════════════════
   BTN ANALYSER
══════════════════════════════════════ */
.btn-a{width:100%;background:var(--vert);color:var(--blanc);border:none;border-radius:var(--rad-s);padding:15px;font-family:var(--fb);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:background .2s,transform .1s;-webkit-appearance:none;min-height:50px}
.btn-a:hover:not(:disabled){background:var(--vert-l)}
.btn-a:active:not(:disabled){transform:scale(.98)}
.btn-a:disabled{opacity:.5;cursor:not-allowed}

/* ══════════════════════════════════════
   STEP 2
══════════════════════════════════════ */
.lbl{font-size:11px;font-weight:600;color:var(--t4);letter-spacing:.1em;text-transform:uppercase;display:block;margin-bottom:8px}
.free-field{width:100%;background:var(--creme);border:2px solid var(--g20);border-radius:var(--rad-s);padding:13px 14px;font-family:var(--fb);font-size:14px;font-weight:400;color:var(--t);line-height:1.6;resize:none;min-height:88px;outline:none;transition:border-color .2s;-webkit-appearance:none}
.free-field:focus{border-color:var(--vert);box-shadow:0 0 0 3px var(--g10)}
.free-field::placeholder{color:rgba(17,17,16,.28);font-weight:300}

.divider{display:flex;align-items:center;gap:12px;margin:16px 0 14px}
.divider-line{flex:1;height:1px;background:var(--t08)}
.divider-txt{font-size:11px;font-weight:600;color:var(--t4);letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}

.fdesc{font-size:13px;font-weight:400;color:var(--vert);background:var(--g10);border-radius:var(--rad-s);padding:10px 13px;margin-bottom:14px;line-height:1.55}

.plist{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.popt{border:1.5px solid var(--t15);border-radius:var(--rad-s);padding:12px 14px;cursor:pointer;transition:all .15s;position:relative;-webkit-tap-highlight-color:transparent}
.popt:hover{border-color:rgba(20,64,44,.3);background:rgba(20,64,44,.02)}
.popt.sel{border-color:var(--vert);background:var(--g10)}
.popt-tag{font-size:10px;font-weight:700;color:var(--vert);letter-spacing:.08em;text-transform:uppercase;margin-bottom:4px;display:block}
.popt-txt{font-size:13px;font-weight:300;color:var(--t);line-height:1.6;padding-right:28px}
.popt.sel .popt-txt{color:var(--vert)}
.pchk{position:absolute;top:12px;right:12px;width:20px;height:20px;border-radius:50%;border:1.5px solid var(--t15);display:flex;align-items:center;justify-content:center;transition:all .15s}
.popt.sel .pchk{background:var(--vert);border-color:var(--vert)}
.pchk svg{width:11px;height:11px;color:#fff;opacity:0;transition:opacity .15s}
.popt.sel .pchk svg{opacity:1}

.frow{display:flex;gap:8px;margin-bottom:16px}
.fpill{flex:1;padding:10px 4px;border:1.5px solid var(--t15);border-radius:var(--rad-s);background:transparent;cursor:pointer;text-align:center;transition:all .15s;-webkit-tap-highlight-color:transparent}
.fpill:hover{border-color:rgba(20,64,44,.3);background:var(--g10)}
.fpill.on{border-color:var(--vert);background:var(--g10)}
.fr{font-size:13px;font-weight:600;color:var(--t);display:block}
.fpill.on .fr{color:var(--vert)}
.fs{font-size:10px;font-weight:300;color:var(--t6);display:block;margin-top:2px}

.brow{display:flex;gap:10px}
.btn-bk{padding:13px 16px;border:1.5px solid var(--t15);border-radius:var(--rad-s);background:transparent;font-family:var(--fb);font-size:13px;font-weight:500;color:var(--t6);cursor:pointer;transition:all .15s;white-space:nowrap;-webkit-appearance:none}
.btn-bk:hover{border-color:var(--vert);color:var(--vert)}
.btn-g{flex:1;background:var(--vert);color:var(--blanc);border:none;border-radius:var(--rad-s);padding:13px;font-family:var(--fb);font-size:14px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .2s;min-height:50px;-webkit-appearance:none}
.btn-g:hover:not(:disabled){background:var(--vert-l)}
.btn-g:active:not(:disabled){transform:scale(.98)}
.btn-g:disabled{opacity:.5;cursor:not-allowed}

/* ══════════════════════════════════════
   RÉSULTAT (colonne droite)
══════════════════════════════════════ */
.r-empty{padding:48px 20px;text-align:center}
.r-empty-ico{width:56px;height:56px;border:1.5px dashed var(--t15);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 14px}
.r-empty-ico svg{width:24px;height:24px;color:var(--t4)}
.r-empty-t{font-family:var(--ft);font-size:17px;font-style:italic;color:var(--t);margin-bottom:6px}
.r-empty-s{font-size:13px;font-weight:300;color:var(--t4);line-height:1.55;max-width:220px;margin:0 auto}

.r-loading{padding:48px 20px;text-align:center;display:none}
.rings{width:52px;height:52px;margin:0 auto 18px;position:relative}
.ring{position:absolute;inset:0;border-radius:50%;border:2px solid transparent}
.ring:nth-child(1){border-top-color:var(--vert);animation:spin 1.1s linear infinite}
.ring:nth-child(2){inset:8px;border-right-color:rgba(20,64,44,.4);animation:spin .85s linear infinite reverse}
.ring:nth-child(3){inset:17px;border-bottom-color:rgba(20,64,44,.2);animation:spin 1.4s linear infinite}
.loading-t{font-family:var(--ft);font-size:16px;font-style:italic;color:var(--t);margin-bottom:4px}
.loading-s{font-size:13px;font-weight:300;color:var(--t6)}
.bw{width:120px;height:2px;background:var(--t08);border-radius:2px;margin:16px auto 0;overflow:hidden}
.bi{height:100%;width:35%;background:var(--vert);border-radius:2px;animation:ind 1.5s ease-in-out infinite}

.r-result{display:none}
.r-result img{width:100%;display:block}
.r-actions{padding:14px 16px;display:flex;gap:10px;border-top:1px solid var(--t08)}
.btn-dl{flex:1;background:var(--vert);color:var(--blanc);border:none;border-radius:var(--rad-s);padding:13px;font-family:var(--fb);font-size:13px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:background .2s;-webkit-appearance:none}
.btn-dl:hover{background:var(--vert-l)}
.btn-dl svg{width:14px;height:14px}
.btn-rg{padding:12px 14px;border:1.5px solid var(--t15);border-radius:var(--rad-s);background:transparent;font-family:var(--fb);font-size:13px;font-weight:500;color:var(--t6);cursor:pointer;display:flex;align-items:center;gap:5px;transition:all .15s;white-space:nowrap;-webkit-appearance:none}
.btn-rg:hover{border-color:var(--vert);color:var(--vert)}
.btn-rg svg{width:13px;height:13px}
.r-footer{padding:0 16px 16px}
.btn-nw{width:100%;padding:12px;border:1.5px solid var(--t15);border-radius:var(--rad-s);background:transparent;font-family:var(--fb);font-size:13px;font-weight:500;color:var(--t6);cursor:pointer;transition:all .15s;-webkit-appearance:none}
.btn-nw:hover{border-color:var(--vert);color:var(--vert)}

/* ══════════════════════════════════════
   WARN / ERR
══════════════════════════════════════ */
.wbox{display:flex;gap:8px;background:rgba(201,138,16,.08);border:1px solid rgba(201,138,16,.2);border-radius:var(--rad-s);padding:11px 13px;font-size:12.5px;color:var(--t);line-height:1.55;margin-bottom:14px}
.wbox svg{width:14px;height:14px;color:#a07010;flex-shrink:0;margin-top:1px}
.etxt{font-size:13px;color:var(--rouge);background:rgba(192,57,43,.06);border:1px solid rgba(192,57,43,.15);border-radius:var(--rad-s);padding:13px;margin-bottom:14px;line-height:1.6}

/* ══════════════════════════════════════
   SUCCESS HEAD
══════════════════════════════════════ */
.sh{padding:16px 18px;border-bottom:1px solid var(--t08);display:flex;align-items:center;gap:10px}
.si2{width:32px;height:32px;background:rgba(20,64,44,.12);border-radius:var(--rad-s);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.si2 svg{width:16px;height:16px;color:var(--vert)}

/* ══════════════════════════════════════
   SPINNER
══════════════════════════════════════ */
.spin{width:15px;height:15px;border:2px solid rgba(244,239,230,.3);border-top-color:var(--blanc);border-radius:50%;animation:spin .65s linear infinite;flex-shrink:0}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes ind{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}

/* ══════════════════════════════════════
   FOOTER
══════════════════════════════════════ */
.footer{border-top:1px solid var(--t08);padding:20px 24px;max-width:1100px;margin:0 auto;display:flex;justify-content:space-between;align-items:center}
.footer span{font-size:12px;font-weight:300;color:var(--t4)}

/* ══════════════════════════════════════
   RESPONSIVE — MOBILE (≤ 700px)
   Sur mobile : 1 colonne, résultat en bas
══════════════════════════════════════ */
@media(max-width:700px){
  .hdr{padding:0 16px}
  .page{padding:0 0 60px}
  .hero{padding:24px 16px 20px;margin-bottom:0;border-bottom:none}
  .hero p{font-size:14px}

  /* Pas de grid 2 colonnes sur mobile */
  .grid{display:flex;flex-direction:column;gap:0;padding:0 12px}
  .col-right{position:static;margin-top:12px}

  /* Cacher la colonne résultat quand elle est vide sur mobile */
  .result-panel-hidden{display:none}

  .cb{padding:16px}
  .footer{padding:20px 16px;flex-direction:column;gap:6px;text-align:center}
}
</style>
</head>
<body>

<!-- HEADER -->
<header class="hdr">
  <div class="hdr-l">
    <div class="hdr-mk">CF</div>
    <span class="hdr-n">OptiShot</span>
  </div>
  <div class="hdr-b">Bêta</div>
</header>

<div class="page">

  <!-- HERO -->
  <div class="hero">
    <h1>Votre monture.<br><em>En 30 secondes.</em></h1>
    <p>Photographiez vos lunettes, l'IA génère des visuels professionnels prêts à publier.</p>
  </div>

  <!-- GRID 2 COLONNES -->
  <div class="grid">

    <!-- COLONNE GAUCHE — Contrôles -->
    <div class="col-left">

      <!-- ÉTAPE 1 -->
      <div class="card" id="s1">
        <div class="ch">
          <div class="ci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div>
          <div class="ct">Photos de la monture</div>
          <div class="cs">Étape 1 / 2</div>
        </div>
        <div class="cb">
          <div class="tip">
            <strong>Pour un résultat optimal :</strong> posez la monture sur une surface propre sans la tenir.
            <span class="tip-warn">⚠️ Les mains dans la photo resteront visibles dans le résultat.</span>
          </div>
          <div class="pgrid" id="pgrid"></div>
          <div class="mtag" id="mtag">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            <span id="mtagtxt">1 photo chargée</span>
          </div>
          <button class="btn-a" id="aBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <span id="aBtnTxt">Analyser la monture</span>
            <div class="spin" id="aSpin" style="display:none"></div>
          </button>
        </div>
      </div>

      <!-- ÉTAPE 2 -->
      <div class="card" id="s2" style="display:none">
        <div class="ch">
          <div class="ci"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
          <div class="ct">Votre prompt</div>
          <div class="cs">Étape 2 / 2</div>
        </div>
        <div class="cb">
          <div class="wbox" id="wbox" style="display:none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            <span id="wtxt"></span>
          </div>
          <div class="fdesc" id="fdesc" style="display:none"></div>

          <label class="lbl">Décrivez ce que vous voulez</label>
          <textarea class="free-field" id="freePrompt" rows="3"
            placeholder="Ex : lunettes sur un rocher en bord de mer, lumière du coucher de soleil..."></textarea>

          <div class="divider">
            <div class="divider-line"></div>
            <div class="divider-txt">ou suggestion IA</div>
            <div class="divider-line"></div>
          </div>

          <div class="plist" id="plist"></div>

          <label class="lbl">Format</label>
          <div class="frow">
            <button class="fpill on" data-r="1:1" type="button"><span class="fr">1:1</span><span class="fs">Insta</span></button>
            <button class="fpill" data-r="4:5" type="button"><span class="fr">4:5</span><span class="fs">Portrait</span></button>
            <button class="fpill" data-r="9:16" type="button"><span class="fr">9:16</span><span class="fs">Story</span></button>
            <button class="fpill" data-r="16:9" type="button"><span class="fr">16:9</span><span class="fs">Bannière</span></button>
          </div>

          <div class="brow">
            <button class="btn-bk" id="bkBtn" type="button">← Retour</button>
            <button class="btn-g" id="gBtn" type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              <span id="gBtnTxt">Générer le visuel</span>
              <div class="spin" id="gSpin" style="display:none"></div>
            </button>
          </div>
        </div>
      </div>

      <!-- ERREUR -->
      <div class="card" id="ec" style="display:none">
        <div class="cb">
          <div class="etxt" id="etxt"></div>
          <div class="brow"><button class="btn-bk" id="ebkBtn" type="button">← Recommencer</button></div>
        </div>
      </div>

    </div><!-- /col-left -->

    <!-- COLONNE DROITE — Résultat -->
    <div class="col-right" id="colRight">
      <div class="card" id="resultPanel">

        <!-- Vide -->
        <div class="r-empty" id="rEmpty">
          <div class="r-empty-ico">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          </div>
          <div class="r-empty-t">Votre visuel ici.</div>
          <div class="r-empty-s">Uploadez une photo et lancez l'analyse.</div>
        </div>

        <!-- Chargement -->
        <div class="r-loading" id="rLoading">
          <div class="rings"><div class="ring"></div><div class="ring"></div><div class="ring"></div></div>
          <div class="loading-t" id="lt">Génération en cours…</div>
          <div class="loading-s" id="ls">20-30 secondes</div>
          <div class="bw"><div class="bi"></div></div>
        </div>

        <!-- Résultat -->
        <div class="r-result" id="rResult">
          <div class="sh">
            <div class="si2"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg></div>
            <div class="ct">Visuel généré ✓</div>
          </div>
          <div id="riw" style="display:none"><img id="rimg" src="" alt="Visuel généré"></div>
          <div class="r-actions">
            <button class="btn-dl" id="dlBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Télécharger
            </button>
            <button class="btn-rg" id="rgBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Relancer
            </button>
          </div>
          <div class="r-footer">
            <button class="btn-nw" id="nwBtn" type="button">+ Nouvelle monture</button>
          </div>
        </div>

      </div>
    </div><!-- /col-right -->

  </div><!-- /grid -->
</div><!-- /page -->

<footer class="footer">
  <span>© 2025 Capway Finance · OptiShot Bêta</span>
  <span>Flux Dev · fal.ai + Gemini · OpenRouter</span>
</footer>

<script>
// ── COMPRESSION ──────────────────────────────────────────────
function compress(file, maxPx, q) {
  return new Promise(resolve => {
    const rd = new FileReader();
    rd.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        if (w > maxPx || h > maxPx) {
          if (w > h) { h = Math.round(h*maxPx/w); w = maxPx; }
          else       { w = Math.round(w*maxPx/h); h = maxPx; }
        }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cv.toBlob(resolve, 'image/jpeg', q);
      };
      img.src = e.target.result;
    };
    rd.readAsDataURL(file);
  });
}

// ── STATE ────────────────────────────────────────────────────
let files     = [null,null,null,null];
let selRatio  = '1:1';
let selPrompt = '';
let curB64    = '';

// ── SHOW / HIDE ──────────────────────────────────────────────
const s1=document.getElementById('s1'), s2=document.getElementById('s2'), ec=document.getElementById('ec');
const rEmpty=document.getElementById('rEmpty'), rLoading=document.getElementById('rLoading'), rResult=document.getElementById('rResult');
const colRight=document.getElementById('colRight');

function showLeft(s) {
  s1.style.display = s==='s1' ? '' : 'none';
  s2.style.display = s==='s2' ? '' : 'none';
  ec.style.display = s==='ec' ? '' : 'none';
}

function showRight(s) {
  rEmpty.style.display   = s==='empty'   ? 'block' : 'none';
  rLoading.style.display = s==='loading' ? 'block' : 'none';
  rResult.style.display  = s==='result'  ? 'block' : 'none';
  // Sur mobile, cacher la colonne droite si elle est vide
  const isMobile = window.innerWidth <= 700;
  if (isMobile) {
    colRight.style.display = s==='empty' ? 'none' : '';
  } else {
    colRight.style.display = '';
  }
}

// ── GRID PHOTOS ──────────────────────────────────────────────
const pgrid=document.getElementById('pgrid'), mtag=document.getElementById('mtag'), mtagtxt=document.getElementById('mtagtxt');

function buildGrid() {
  pgrid.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const sl = document.createElement('div');
    sl.className = 'pslot' + (files[i] ? ' fi' : '');
    if (files[i]) {
      const im = document.createElement('img');
      im.src = URL.createObjectURL(files[i]);
      sl.appendChild(im);
      const rm = document.createElement('button');
      rm.className = 'rm'; rm.type = 'button';
      rm.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
      rm.onclick = e => { e.stopPropagation(); files[i]=null; buildGrid(); };
      sl.appendChild(rm);
    } else {
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
      inp.setAttribute('aria-label', 'Photo '+(i+1));
      inp.onchange = e => { const f=e.target.files&&e.target.files[0]; if(f) addFile(i,f); };
      sl.innerHTML = `<div class="si"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg></div><span class="sl">PHOTO ${i+1}</span>`;
      sl.insertBefore(inp, sl.firstChild);
    }
    pgrid.appendChild(sl);
  }
  const cnt = files.filter(Boolean).length;
  if (cnt) {
    mtag.classList.add('on');
    mtagtxt.textContent = cnt===1 ? '1 photo · background replace activé' : `${cnt} photos · Gemini voit tous les angles`;
  } else {
    mtag.classList.remove('on');
  }
}

function addFile(i, f) {
  files[i] = f; buildGrid();
}

// ── ANALYSER ─────────────────────────────────────────────────
const aBtn=document.getElementById('aBtn'), aBtnTxt=document.getElementById('aBtnTxt'), aSpin=document.getElementById('aSpin');
const fdesc=document.getElementById('fdesc'), plist=document.getElementById('plist');
const wbox=document.getElementById('wbox'), wtxt=document.getElementById('wtxt');
const freePrompt=document.getElementById('freePrompt');

aBtn.addEventListener('click', async () => {
  aBtn.disabled=true; aBtnTxt.textContent='Analyse IA…'; aSpin.style.display='block';
  showRight('loading');
  try {
    const fd = new FormData();
    for (const f of files.filter(Boolean)) {
      const c = await compress(f, 1200, 0.82);
      fd.append('images[]', c, 'p.jpg');
    }
    const res  = await fetch('/api/analyze', {method:'POST', body:fd});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||`HTTP ${res.status}`);

    if (data.frame_description) { fdesc.textContent='🔍 '+data.frame_description; fdesc.style.display='block'; }
    else fdesc.style.display='none';
    if (data.warning) { wbox.style.display='flex'; wtxt.textContent=data.warning; }
    else wbox.style.display='none';

    buildSuggestions(data.suggestions || data.prompts || []);
    freePrompt.value=''; selPrompt='';
    showLeft('s2');
    showRight('empty');
  } catch(err) {
    document.getElementById('etxt').textContent = err.message;
    showLeft('ec'); showRight('empty');
  } finally {
    aBtn.disabled=false; aBtnTxt.textContent='Analyser la monture'; aSpin.style.display='none';
  }
});

function buildSuggestions(suggestions) {
  plist.innerHTML='';
  ['Suggestion A','Suggestion B','Suggestion C'].forEach((lbl,i) => {
    if (!suggestions[i]) return;
    const s = suggestions[i];
    // Affiche le français, stocke l'anglais pour la génération
    const displayText = s.fr || s; // compatibilité si string
    const promptEn    = s.en || s;
    const d = document.createElement('div');
    d.className = 'popt';
    d.innerHTML = `<span class="popt-tag">${lbl}</span><span class="popt-txt">${displayText}</span><div class="pchk"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></div>`;
    d.onclick = () => {
      document.querySelectorAll('.popt').forEach(x=>x.classList.remove('sel'));
      d.classList.add('sel');
      selPrompt = promptEn; // envoie l'anglais à Flux
      freePrompt.value='';
    };
    plist.appendChild(d);
  });
}

freePrompt.addEventListener('input', () => {
  document.querySelectorAll('.popt').forEach(x=>x.classList.remove('sel'));
  selPrompt='';
});

// ── FORMAT ───────────────────────────────────────────────────
document.querySelectorAll('.fpill').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.fpill').forEach(x=>x.classList.remove('on'));
    b.classList.add('on'); selRatio=b.dataset.r;
  });
});

// ── GÉNÉRER ──────────────────────────────────────────────────
const gBtn=document.getElementById('gBtn'), gBtnTxt=document.getElementById('gBtnTxt'), gSpin=document.getElementById('gSpin');
const lt=document.getElementById('lt'), ls=document.getElementById('ls');
const rimg=document.getElementById('rimg'), riw=document.getElementById('riw');

async function runGen() {
  const finalPrompt = freePrompt.value.trim() || selPrompt;
  if (!finalPrompt) { freePrompt.focus(); return; }

  gBtn.disabled=true; gBtnTxt.textContent='En cours…'; gSpin.style.display='block';
  const pf = files.find(Boolean);
  if (pf) { lt.textContent='Suppression du fond…'; ls.textContent='Vos lunettes sont conservées · 20-35s'; }
  else    { lt.textContent='Flux Dev génère…';      ls.textContent='15 à 30 secondes'; }
  showRight('loading');

  // Sur mobile, scroller vers le résultat
  if (window.innerWidth <= 700) {
    setTimeout(() => colRight.scrollIntoView({behavior:'smooth', block:'start'}), 100);
  }

  try {
    let res;
    if (pf) {
      const c = await compress(pf, 1024, 0.88);
      const fd = new FormData();
      fd.append('prompt', finalPrompt);
      fd.append('style', 'studio');
      fd.append('ratio', selRatio);
      fd.append('image', c, 'p.jpg');
      res = await fetch('/api/generate', {method:'POST', body:fd});
    } else {
      res = await fetch('/api/generate', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({prompt:finalPrompt, ratio:selRatio}),
      });
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error||`HTTP ${res.status}`);
    if (!data.image) throw new Error('Aucune image reçue.');

    curB64 = data.image;
    rimg.src = 'data:image/jpeg;base64,'+data.image;
    riw.style.display='block';
    showRight('result');
  } catch(err) {
    document.getElementById('etxt').textContent = err.message;
    showLeft('ec'); showRight('empty');
  } finally {
    gBtn.disabled=false; gBtnTxt.textContent='Générer le visuel'; gSpin.style.display='none';
  }
}

document.getElementById('gBtn').addEventListener('click', runGen);
document.getElementById('rgBtn').addEventListener('click', () => { showLeft('s2'); setTimeout(runGen,50); });

document.getElementById('dlBtn').addEventListener('click', () => {
  if (!curB64) return;
  const a = document.createElement('a');
  a.href = 'data:image/jpeg;base64,'+curB64;
  a.download = 'optishot-'+Date.now()+'.jpg';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
});

document.getElementById('bkBtn').addEventListener('click',  () => { showLeft('s1'); showRight('empty'); });
document.getElementById('nwBtn').addEventListener('click',  () => { files=[null,null,null,null]; buildGrid(); showLeft('s1'); showRight('empty'); });
document.getElementById('ebkBtn').addEventListener('click', () => { showLeft('s1'); showRight('empty'); });

// ── INIT ─────────────────────────────────────────────────────
buildGrid();
showLeft('s1');
showRight('empty');
</script>
</body>
</html>
