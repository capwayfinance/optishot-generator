import { useState, useRef, useCallback, useEffect } from 'react'
import Head from 'next/head'

// ─── Constantes ──────────────────────────────────────────────
const HINTS = [
  'Studio minimaliste',
  'Lumière naturelle',
  'Fond bois clair',
  'Ambiance luxe doré',
  'Fond noir mat',
]

const LOADING_PHRASES = [
  'Composition de la scène',
  "Application de l'éclairage",
  'Rendu de la monture',
  'Finalisation des détails',
  'Optimisation de la qualité',
]

// ─── SVG Icons ────────────────────────────────────────────────
const IconImage = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const IconUpload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
)

const IconClose = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconBolt = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconDownload = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

const IconRefresh = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
)

const IconAlert = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconError = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
)

// ─── Helpers ──────────────────────────────────────────────────
function formatError(msg) {
  if (!msg) return 'Erreur inconnue. Réessayez.'
  if (msg.includes('401') || msg.includes('Unauthorized'))
    return 'Clé API invalide ou expirée.'
  if (msg.includes('402') || msg.includes('credits'))
    return 'Crédits insuffisants sur votre compte Stability AI.'
  if (msg.includes('429') || msg.includes('rate'))
    return 'Trop de requêtes. Attendez quelques secondes.'
  if (msg.includes('CONTENT_FILTERED') || msg.includes('content_moderation'))
    return 'Description filtrée. Reformulez votre texte.'
  return msg.length > 120 ? msg.slice(0, 120) + '…' : msg
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// ─── Composant principal ──────────────────────────────────────
export default function Home() {
  // État upload
  const [file, setFile] = useState(null)
  const [previewSrc, setPreviewSrc] = useState('')
  const [previewName, setPreviewName] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)

  // État form
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('core')
  const [ratio, setRatio] = useState('1:1')
  const [promptError, setPromptError] = useState(false)

  // État génération
  const [status, setStatus] = useState('empty') // 'empty' | 'loading' | 'result' | 'error'
  const [resultSrc, setResultSrc] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [loadingPhrase, setLoadingPhrase] = useState(LOADING_PHRASES[0])
  const [progress, setProgress] = useState(0)
  const [footerModel, setFooterModel] = useState('stable-image/generate/core')

  const fileInputRef = useRef(null)
  const progressIntervalRef = useRef(null)

  // ── Upload ──
  const handleFile = useCallback((f) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return
    if (f.size > 10 * 1024 * 1024) {
      alert('Image trop lourde. Limite : 10 Mo.')
      return
    }
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreviewSrc(e.target.result)
      setPreviewName(`${f.name} · ${(f.size / 1024).toFixed(0)} Ko`)
    }
    reader.readAsDataURL(f)
  }, [])

  const removeFile = () => {
    setFile(null)
    setPreviewSrc('')
    setPreviewName('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Drag & drop ──
  const onDragOver = (e) => { e.preventDefault(); setIsDragOver(true) }
  const onDragLeave = () => setIsDragOver(false)
  const onDrop = (e) => {
    e.preventDefault()
    setIsDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  // ── Hints ──
  const applyHint = (hint) => {
    setPrompt((p) => (p.trim() ? `${p}, ${hint.toLowerCase()}` : hint))
  }

  // ── Fake progress ──
  const startProgress = useCallback(() => {
    let pct = 0
    let phraseIdx = 0
    setProgress(0)
    setLoadingPhrase(LOADING_PHRASES[0])

    progressIntervalRef.current = setInterval(() => {
      pct += (90 - pct) * 0.06 + Math.random() * 1.5
      pct = Math.min(pct, 90)
      setProgress(pct)

      const newIdx = Math.min(
        Math.floor((pct / 90) * (LOADING_PHRASES.length - 1)),
        LOADING_PHRASES.length - 1
      )
      if (newIdx !== phraseIdx) {
        phraseIdx = newIdx
        setLoadingPhrase(LOADING_PHRASES[phraseIdx])
      }
    }, 280)
  }, [])

  const stopProgress = useCallback((success) => {
    clearInterval(progressIntervalRef.current)
    setProgress(success ? 100 : 0)
  }, [])

  // Nettoyage interval au démontage
  useEffect(() => () => clearInterval(progressIntervalRef.current), [])

  // ── Génération ──
  const generate = useCallback(async () => {
    if (isGenerating) return

    const trimmed = prompt.trim()
    if (!trimmed) {
      setPromptError(true)
      setTimeout(() => setPromptError(false), 1200)
      return
    }

    setIsGenerating(true)
    setStatus('loading')
    setFooterModel(`stable-image/generate/${model}`)
    startProgress()

    try {
      const formData = new FormData()
      formData.append('prompt', trimmed)
      if (file) formData.append('image', file)

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'x-model': model,
          'x-ratio': ratio,
        },
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }

      stopProgress(true)
      await delay(300)

      setResultSrc(`data:image/jpeg;base64,${data.image}`)
      setStatus('result')

    } catch (err) {
      stopProgress(false)
      await delay(200)
      setErrorMsg(formatError(err.message))
      setStatus('error')
    } finally {
      setIsGenerating(false)
    }
  }, [isGenerating, prompt, model, ratio, file, startProgress, stopProgress])

  // Ctrl+Entrée pour générer
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generate()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [generate])

  // ── Téléchargement ──
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = resultSrc
    a.download = `optishot-${Date.now()}.jpg`
    a.click()
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Générateur de visuels — Capway Finance × OptiShot</title>
        <meta name="robots" content="noindex,nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400;1,500&family=Inter:wght@300;400;500&display=swap"
          rel="stylesheet"
        />
      </Head>

      {/* HEADER */}
      <header className="header">
        <div className="headerBrand">
          <div className="headerLogoMark">CF</div>
          <span className="headerLogoText">Capway Finance</span>
        </div>
        <div className="headerBadge">Outil interne · Bêta</div>
      </header>

      {/* NOTICE SÉCURITÉ */}
      <div className="securityWrap">
        <div className="securityInner">
          <div className="securityIcon">
            <IconAlert />
          </div>
          <p className="securityText">
            <strong>Clé API côté serveur uniquement.</strong> Elle n'est jamais
            exposée au navigateur. Cet outil est réservé à un usage interne.{' '}
            <a
              href="https://platform.stability.ai/account/keys"
              target="_blank"
              rel="noreferrer"
            >
              Gérer vos clés
            </a>
          </p>
        </div>
      </div>

      {/* HERO */}
      <div className="pageHero">
        <div className="pageEyebrow">Générateur de visuels IA</div>
        <h1 className="pageTitle">
          Un visuel de<br />
          <em>studio. En 30 secondes.</em>
        </h1>
        <p className="pageSub">
          Uploadez une photo de votre monture, décrivez l'ambiance souhaitée.
          OptiShot génère un visuel professionnel prêt à publier.
        </p>
      </div>

      {/* GÉNÉRATEUR */}
      <div className="genLayout">

        {/* ─ Panneau input ─ */}
        <div className="panel">
          <div className="panelHeader">
            <div className="panelHeaderIcon"><IconImage /></div>
            <div className="panelTitle">Votre monture</div>
          </div>
          <div className="panelBody">

            {/* Upload zone ou preview */}
            {!previewSrc ? (
              <div
                className={`uploadZone${isDragOver ? ' dragOver' : ''}`}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFile(e.target.files[0])}
                  aria-label="Uploader une photo de monture"
                />
                <div className="uploadIcon"><IconUpload /></div>
                <span className="uploadPrimary">Cliquez ou glissez votre photo</span>
                <span className="uploadSecondary">JPG, PNG, WebP · max 10 Mo</span>
              </div>
            ) : (
              <div className="uploadPreview">
                <img src={previewSrc} alt="Aperçu de la monture" />
                <button
                  className="previewRemoveBtn"
                  onClick={removeFile}
                  type="button"
                  aria-label="Supprimer l'image"
                >
                  <IconClose />
                </button>
                <div className="previewName">{previewName}</div>
              </div>
            )}

            {/* Prompt */}
            <label className="fieldLabel" style={{ marginTop: 4 }}>
              Description du visuel souhaité
            </label>
            <textarea
              className={`promptTextarea${promptError ? ' promptError' : ''}`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex : monture minimaliste sur fond studio blanc, lumière naturelle douce, ombres subtiles…"
              rows={4}
            />

            <div className="promptHints">
              {HINTS.map((h) => (
                <button
                  key={h}
                  className="hintChip"
                  type="button"
                  onClick={() => applyHint(h)}
                >
                  {h}
                </button>
              ))}
            </div>

            {/* Paramètres */}
            <div className="paramsGrid">
              <div>
                <label className="fieldLabel">Modèle IA</label>
                <select
                  className="paramSelect"
                  value={model}
                  onChange={(e) => {
                    setModel(e.target.value)
                    setFooterModel(`stable-image/generate/${e.target.value}`)
                  }}
                >
                  <option value="ultra">Ultra — Qualité max</option>
                  <option value="core">Core — Équilibre</option>
                </select>
              </div>
              <div>
                <label className="fieldLabel">Format</label>
                <select
                  className="paramSelect"
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                >
                  <option value="1:1">1:1 · Instagram</option>
                  <option value="4:5">4:5 · Portrait</option>
                  <option value="16:9">16:9 · Bannière</option>
                  <option value="9:16">9:16 · Story</option>
                  <option value="3:2">3:2 · Paysage</option>
                </select>
              </div>
            </div>

            <button
              className="btnGenerate"
              type="button"
              onClick={generate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <div className="spinner" />
              ) : (
                <span className="btnIcon"><IconBolt /></span>
              )}
              <span>{isGenerating ? 'Génération…' : 'Générer le visuel'}</span>
            </button>

          </div>
        </div>

        {/* ─ Panneau résultat ─ */}
        <div className="resultPanel">

          {status === 'empty' && (
            <div className="stateEmpty">
              <div className="emptyIcon"><IconImage /></div>
              <div className="emptyTitle">Votre visuel apparaîtra ici.</div>
              <div className="emptySub">
                Renseignez une description<br />et cliquez sur Générer.
              </div>
            </div>
          )}

          {status === 'loading' && (
            <div className="stateLoading">
              <div className="loadingAnimation">
                <div className="loadingRing" />
                <div className="loadingRing" />
                <div className="loadingRing" />
              </div>
              <div className="loadingText">Génération en cours…</div>
              <div className="loadingSub">{loadingPhrase}</div>
              <div className="loadingBarWrap">
                <div className="loadingBar" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          {status === 'result' && (
            <>
              <img
                key={resultSrc}
                src={resultSrc}
                alt="Visuel généré"
                className="resultImg"
              />
              <div className="resultFooter">
                <div className="resultMeta">
                  <span className="resultMetaStrong">
                    Stability AI · {model === 'ultra' ? 'Ultra' : 'Core'}
                  </span>
                  Format {ratio} · JPEG HD
                </div>
                <div className="resultActions">
                  <button
                    className="btnRegenerate"
                    type="button"
                    onClick={generate}
                    disabled={isGenerating}
                  >
                    <IconRefresh /> Relancer
                  </button>
                  <button
                    className="btnDownload"
                    type="button"
                    onClick={handleDownload}
                  >
                    <IconDownload /> Télécharger
                  </button>
                </div>
              </div>
            </>
          )}

          {status === 'error' && (
            <div className="stateError">
              <div className="errorIcon"><IconError /></div>
              <div className="errorTitle">La génération a échoué.</div>
              <div className="errorMsg">{errorMsg}</div>
              <button className="btnRetry" type="button" onClick={generate}>
                Réessayer
              </button>
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div className="pageFooter">
        <span className="footerCopy">
          © 2025 Capway Finance · Outil interne · Usage privé
        </span>
        <span className="footerModel">
          Stability AI · {footerModel}
        </span>
      </div>
    </>
  )
}
