import { useState, useMemo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { STORE_MAP } from '../../utils/constants'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../../config/firebase'

const TEMPLATES = {
  modern_purple: {
    id: 'modern_purple',
    name: 'Maná Roxa & Ouro (Premium)',
    bg: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
    bgPreview: 'from-violet-600 to-indigo-600',
    titleColor: 'text-violet-900',
    textColor: 'text-gray-700',
    borderColor: 'border-violet-200',
    accentBg: 'bg-violet-100 text-violet-700 border-violet-200',
    accentText: 'text-violet-600',
    badgeBg: 'bg-violet-50 text-violet-700 border border-violet-100',
    footerBg: 'bg-violet-50/50 text-violet-700 border-violet-100',
    previewCardBg: 'bg-white border border-gray-100 shadow-xl',
    previewText: 'text-gray-900',
    previewSubtext: 'text-gray-500',
    printStyles: `
      .poster { background: #ffffff; color: #1f2937; border: 12px solid #7c3aed; }
      .header-band { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #ffffff; }
      .store-badge { background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); }
      .poster-heading { color: #4c1d95; }
      .qr-frame { border: 5px solid #7c3aed; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(124, 58, 237, 0.15); }
      .scan-tag { background: #7c3aed; color: #ffffff; }
      .step-badge { background: #f5f3ff; color: #6d28d9; border: 1px solid #ddd6fe; }
      .footer-band { background: #f5f3ff; color: #6d28d9; border-top: 3px dashed #ddd6fe; }
    `
  },
  bogados_cyan: {
    id: 'bogados_cyan',
    name: 'Bogados Ocean Cyan (Moderna)',
    bg: 'linear-gradient(135deg, #0891b2 0%, #0d9488 100%)',
    bgPreview: 'from-cyan-600 to-teal-600',
    titleColor: 'text-cyan-900',
    textColor: 'text-gray-700',
    borderColor: 'border-cyan-200',
    accentBg: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    accentText: 'text-cyan-600',
    badgeBg: 'bg-cyan-50 text-cyan-700 border border-cyan-100',
    footerBg: 'bg-cyan-50/50 text-cyan-700 border-cyan-100',
    previewCardBg: 'bg-white border border-gray-100 shadow-xl',
    previewText: 'text-gray-900',
    previewSubtext: 'text-gray-500',
    printStyles: `
      .poster { background: #ffffff; color: #1f2937; border: 12px solid #0891b2; }
      .header-band { background: linear-gradient(135deg, #0891b2, #0d9488); color: #ffffff; }
      .store-badge { background: rgba(255, 255, 255, 0.2); border: 2px solid rgba(255, 255, 255, 0.4); }
      .poster-heading { color: #164e63; }
      .qr-frame { border: 5px solid #0891b2; background: #ffffff; box-shadow: 0 10px 25px -5px rgba(8, 145, 178, 0.15); }
      .scan-tag { background: #0891b2; color: #ffffff; }
      .step-badge { background: #ecfeff; color: #0f766e; border: 1px solid #cffafe; }
      .footer-band { background: #ecfeff; color: #0f766e; border-top: 3px dashed #cffafe; }
    `
  },
  warm_gold: {
    id: 'warm_gold',
    name: 'Preto & Ouro (Premium)',
    bg: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    bgPreview: 'from-slate-800 to-slate-950',
    titleColor: 'text-amber-500',
    textColor: 'text-slate-300',
    borderColor: 'border-amber-500/20',
    accentBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    accentText: 'text-amber-500',
    badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    footerBg: 'bg-slate-900/50 text-amber-400 border-amber-500/10',
    previewCardBg: 'bg-slate-900 border border-slate-800 shadow-xl shadow-black/20',
    previewText: 'text-slate-100',
    previewSubtext: 'text-slate-400',
    printStyles: `
      .poster { background: #0f172a; color: #f1f5f9; border: 12px solid #d97706; }
      .header-band { background: #1e293b; color: #fbbf24; border-bottom: 4px solid #d97706; }
      .store-badge { background: rgba(217, 119, 6, 0.1); border: 2px solid #d97706; }
      .poster-heading { color: #fbbf24; }
      .poster-subheading { color: #94a3b8; }
      .qr-frame { border: 5px solid #d97706; background: #1e293b; box-shadow: 0 10px 30px rgba(217, 119, 6, 0.1); }
      .scan-tag { background: #d97706; color: #0f172a; font-weight: 800; }
      .step-badge { background: #d97706; color: #0f172a; font-weight: bold; }
      .step-text { color: #cbd5e1; }
      .footer-band { background: #1e293b; color: #fbbf24; border-top: 3px solid #d97706; }
    `
  },
  rustic_bakery: {
    id: 'rustic_bakery',
    name: 'Artesanal (Rústico)',
    bg: 'linear-gradient(135deg, #7c2d12 0%, #451a03 100%)',
    bgPreview: 'from-orange-800 to-amber-950',
    titleColor: 'text-amber-950',
    textColor: 'text-amber-900',
    borderColor: 'border-amber-200',
    accentBg: 'bg-amber-100 text-amber-800 border-amber-200',
    accentText: 'text-amber-700',
    badgeBg: 'bg-amber-100 text-amber-800 border border-amber-200',
    footerBg: 'bg-amber-50 text-amber-800 border-amber-200',
    previewCardBg: 'bg-[#fdf6e2] border border-[#f5e6c4] shadow-xl',
    previewText: 'text-amber-950',
    previewSubtext: 'text-amber-850',
    printStyles: `
      .poster { background: #fdf6e2; color: #451a03; border: 12px solid #b45309; }
      .header-band { background: linear-gradient(135deg, #7c2d12, #9a3412); color: #fffbeb; }
      .store-badge { background: rgba(255, 255, 255, 0.15); border: 2px solid rgba(255, 255, 255, 0.3); }
      .poster-heading { color: #7c2d12; }
      .poster-subheading { color: #9a3412; }
      .qr-frame { border: 5px solid #b45309; background: #fffbeb; box-shadow: 0 10px 25px rgba(124, 45, 18, 0.08); }
      .scan-tag { background: #b45309; color: #ffffff; }
      .step-badge { background: #fef3c7; color: #7c2d12; border: 1px solid #fde68a; }
      .footer-band { background: #fbe5c6; color: #7c2d12; border-top: 3px dashed #b45309; }
    `
  },
  minimalist: {
    id: 'minimalist',
    name: 'Minimalista (P&B)',
    bg: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)',
    bgPreview: 'from-gray-800 to-gray-900',
    titleColor: 'text-black',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-300',
    accentBg: 'bg-gray-100 text-black border-gray-300',
    accentText: 'text-black',
    badgeBg: 'bg-gray-100 text-black border border-gray-300',
    footerBg: 'bg-gray-50 text-black border-gray-200',
    previewCardBg: 'bg-white border-2 border-black shadow-lg',
    previewText: 'text-black',
    previewSubtext: 'text-gray-700',
    printStyles: `
      .poster { background: #ffffff; color: #000000; border: 6px solid #000000; font-family: Georgia, serif; }
      .header-band { background: #ffffff; color: #000000; border-bottom: 4px solid #000000; }
      .store-badge { background: #ffffff; border: 2px solid #000000; }
      .poster-heading { color: #000000; font-family: Georgia, serif; font-weight: 900; }
      .poster-subheading { font-family: Georgia, serif; }
      .qr-frame { border: 4px solid #000000; background: #ffffff; }
      .scan-tag { background: #000000; color: #ffffff; font-weight: bold; }
      .step-badge { background: #000000; color: #ffffff; }
      .footer-band { background: #ffffff; color: #000000; border-top: 4px solid #000000; font-family: Georgia, serif; }
    `
  }
}

export default function Config({ onBack }) {
  const { storeId, currentUser, store } = useAuth()
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState('qrcode') // qrcode | security
  
  // General Pin Config State
  const [newPin, setNewPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)

  // QR Code Designer State
  const [selectedStoreKey, setSelectedStoreKey] = useState(storeId || 'loja_principal')
  const [selectedTemplate, setSelectedTemplate] = useState(
    storeId === 'loja_bogados' ? 'bogados_cyan' : 'modern_purple'
  )
  
  // Custom Poster Text State (Prefilled EXACTLY as requested by user)
  const [posterTitle, setPosterTitle] = useState(
    storeId === 'loja_bogados' ? 'Queremos Te Ouvir! 💬' : 'Queremos Te Ouvir! 🍞👑'
  )
  const [posterSubtitle, setPosterSubtitle] = useState(
    'Deixe aqui suas dúvidas, sugestões ou elogios.\nSua opinião é muito importante para nós!\n\nTrabalhe conosco: Envie seu currículo e faça parte da nossa equipe.'
  )
  const [step1, setStep1] = useState('Abra a câmera do seu celular')
  const [step2, setStep2] = useState('Aponte para o QR Code ao lado')
  const [step3, setStep3] = useState('Acesse o link para enviar')
  const [footerNote, setFooterNote] = useState(
    storeId === 'loja_bogados' 
      ? 'Padaria Maná de Deus - Filial Bogados • Agradecemos a preferência! 🥖' 
      : 'Padaria Maná de Deus • Agradecemos a preferência! ❤️'
  )

  // Selected store details
  const targetStore = useMemo(() => {
    return STORE_MAP[selectedStoreKey] || STORE_MAP.loja_principal
  }, [selectedStoreKey])

  // Generated Public Link
  const publicLink = useMemo(() => {
    return `${window.location.origin}${window.location.pathname}#/cliente/${selectedStoreKey}`
  }, [selectedStoreKey])

  // Template object
  const templateConfig = useMemo(() => {
    return TEMPLATES[selectedTemplate] || TEMPLATES.modern_purple
  }, [selectedTemplate])

  // Copy Link action
  function copyLink() {
    navigator.clipboard.writeText(publicLink)
    alert('Link público copiado com sucesso! 📋')
  }

  // Pin update action
  async function updateManagerPin() {
    if (newPin.length < 4) return alert('O PIN deve ter pelo menos 4 dígitos')
    setLoading(true)
    try {
      await setDoc(doc(db, 'stores', storeId), { managerPin: newPin }, { merge: true })
      alert('PIN Mestre atualizado com sucesso! 🔐')
      setNewPin('')
    } catch (e) {
      alert('Erro ao atualizar PIN')
    }
    setLoading(false)
  }

  // Reset to store defaults helper
  function resetToStoreDefaults(key) {
    setSelectedStoreKey(key)
    
    // Choose brand template
    if (key === 'loja_bogados') {
      setSelectedTemplate('bogados_cyan')
      setPosterTitle('Queremos Te Ouvir! 💬')
      setFooterNote('Padaria Maná de Deus - Filial Bogados • Agradecemos a preferência! 🥖')
    } else {
      setSelectedTemplate('modern_purple')
      setPosterTitle('Queremos Te Ouvir! 🍞👑')
      setFooterNote('Padaria Maná de Deus • Agradecemos a preferência! ❤️')
    }
    
    setPosterSubtitle('Deixe aqui suas dúvidas, sugestões ou elogios.\nSua opinião é muito importante para nós!\n\nTrabalhe conosco: Envie seu currículo e faça parte da nossa equipe.')
    setStep1('Abra a câmera do seu celular')
    setStep2('Aponte para o QR Code ao lado')
    setStep3('Acesse o link para enviar')
  }

  // Print poster logic
  const handlePrintPoster = () => {
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(publicLink)}`
    
    const printHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Placa QR Code - ${targetStore.shortName}</title>
        <style>
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #f3f4f6;
            font-family: 'Inter', -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
          }

          /* Exact A4 Ratio Container */
          .poster {
            width: 210mm;
            height: 297mm;
            background: #ffffff;
            box-shadow: 0 0 20px rgba(0,0,0,0.15);
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            position: relative;
            page-break-inside: avoid;
            page-break-after: avoid;
          }

          /* Header Band */
          .header-band {
            padding: 24mm 15mm;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }
          .store-badge {
            width: 22mm;
            height: 22mm;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11mm;
            margin-bottom: 6mm;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
          }
          .store-title {
            font-size: 8mm;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            margin: 0;
          }

          /* Main Poster Content */
          .main-content {
            flex: 1;
            padding: 18mm 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .poster-heading {
            font-size: 10.5mm;
            font-weight: 900;
            margin: 0 0 6mm 0;
            line-height: 1.2;
            text-transform: uppercase;
            letter-spacing: -0.02em;
          }
          .poster-subheading {
            font-size: 5.5mm;
            font-weight: 500;
            line-height: 1.5;
            margin: 0 auto 16mm auto;
            max-width: 155mm;
            white-space: pre-wrap;
          }

          /* Visual Layout: Side-by-Side QR & Steps */
          .columns-container {
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            gap: 15mm;
            width: 100%;
            margin-bottom: 8mm;
          }

          /* QR Code Frame */
          .qr-frame {
            width: 75mm;
            border-radius: 8mm;
            padding: 6mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            flex-shrink: 0;
          }
          .qr-image {
            width: 58mm;
            height: 58mm;
            display: block;
          }
          .scan-tag {
            margin-top: 5mm;
            font-size: 3.5mm;
            font-weight: 800;
            padding: 2.2mm 6mm;
            border-radius: 40px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          }

          /* Steps Instructions List */
          .steps-list {
            display: flex;
            flex-direction: column;
            gap: 6.5mm;
            text-align: left;
            max-width: 85mm;
          }
          .step-item {
            display: flex;
            flex-direction: row;
            align-items: flex-start;
            gap: 4.5mm;
          }
          .step-badge {
            width: 9.5mm;
            height: 9.5mm;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 4.5mm;
            font-weight: 800;
            flex-shrink: 0;
          }
          .step-text {
            font-size: 4.5mm;
            font-weight: 600;
            line-height: 1.35;
            margin: 0;
            padding-top: 1mm;
          }

          /* Footer Band */
          .footer-band {
            padding: 12mm 15mm;
            font-size: 4.5mm;
            font-weight: 700;
            text-align: center;
            letter-spacing: 0.02em;
          }

          /* Print Settings Override */
          @media print {
            body {
              background: transparent;
              padding: 0;
              margin: 0;
            }
            .poster {
              box-shadow: none;
              width: 210mm;
              height: 297mm;
            }
          }
          
          /* Template Custom Overrides */
          ${templateConfig.printStyles}
        </style>
      </head>
      <body>
        <div class="poster">
          <!-- Header Store Title -->
          <div class="header-band">
            <div class="store-badge">🏪</div>
            <h1 class="store-title">${targetStore.name}</h1>
          </div>

          <!-- Main Content -->
          <div class="main-content">
            <h2 class="poster-heading">${posterTitle}</h2>
            <p class="poster-subheading">${posterSubtitle}</p>

            <div class="columns-container">
              <!-- QR Frame -->
              <div class="qr-frame">
                <img class="qr-image" src="${qrCodeUrl}" alt="QR Code" />
                <div class="scan-tag">ESCANEIE AQUI</div>
              </div>

              <!-- Steps List -->
              <div class="steps-list">
                <div class="step-item">
                  <div class="step-badge">1</div>
                  <p class="step-text">${step1}</p>
                </div>
                <div class="step-item">
                  <div class="step-badge">2</div>
                  <p class="step-text">${step2}</p>
                </div>
                <div class="step-item">
                  <div class="step-badge">3</div>
                  <p class="step-text">${step3}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Band -->
          <div class="footer-band">
            ${footerNote}
          </div>
        </div>

        <script>
          // Automatic Print Dialogue Trigger
          setTimeout(() => {
            window.print();
            setTimeout(() => window.close(), 600);
          }, 400);
        </script>
      </body>
      </html>
    `

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Por favor, ative os pop-ups no seu navegador para poder abrir o gerador de impressão!')
      return
    }
    printWindow.document.write(printHtml)
    printWindow.document.close()
  }

  // Visual High-Resolution Image Canvas Generator and Downloader
  const handleDownloadPNG = () => {
    setExporting(true)
    
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 1700
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      alert('Seu navegador não suporta geração de imagens.')
      setExporting(false)
      return
    }

    const qrImg = new Image()
    qrImg.crossOrigin = 'anonymous'
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=450x450&data=${encodeURIComponent(publicLink)}`
    qrImg.src = qrCodeUrl

    qrImg.onload = () => {
      // 1. Draw Poster Background Theme
      let primaryColor = '#7c3aed'
      let secondaryColor = '#4f46e5'
      let isDarkTheme = false
      let isCreamTheme = false

      if (selectedTemplate === 'modern_purple') {
        primaryColor = '#7c3aed'
        secondaryColor = '#4f46e5'
      } else if (selectedTemplate === 'bogados_cyan') {
        primaryColor = '#0891b2'
        secondaryColor = '#0d9488'
      } else if (selectedTemplate === 'warm_gold') {
        primaryColor = '#1e293b'
        secondaryColor = '#0f172a'
        isDarkTheme = true
      } else if (selectedTemplate === 'rustic_bakery') {
        primaryColor = '#7c2d12'
        secondaryColor = '#451a03'
        isCreamTheme = true
      } else if (selectedTemplate === 'minimalist') {
        primaryColor = '#000000'
        secondaryColor = '#000000'
      }

      // Draw outer background border/gradient
      if (selectedTemplate === 'minimalist') {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, 1200, 1700)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 24
        ctx.strokeRect(12, 12, 1176, 1676)
      } else {
        const bgGrad = ctx.createLinearGradient(0, 0, 1200, 1700)
        bgGrad.addColorStop(0, primaryColor)
        bgGrad.addColorStop(1, secondaryColor)
        ctx.fillStyle = bgGrad
        ctx.fillRect(0, 0, 1200, 1700)

        // Golden frames for Premium
        if (selectedTemplate === 'warm_gold') {
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 16
          ctx.strokeRect(30, 30, 1140, 1640)
        }
        // Brown frames for Rustic
        if (selectedTemplate === 'rustic_bakery') {
          ctx.strokeStyle = '#b45309'
          ctx.lineWidth = 16
          ctx.strokeRect(30, 30, 1140, 1640)
        }
      }

      // 2. Draw Top Store Title Banner
      ctx.fillStyle = isDarkTheme ? '#1e293b' : selectedTemplate === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.08)'
      if (selectedTemplate === 'minimalist') {
        ctx.beginPath()
        ctx.moveTo(0, 240)
        ctx.lineTo(1200, 240)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 8
        ctx.stroke()
      } else {
        ctx.fillRect(0, 0, 1200, 240)
      }

      // Store Badge
      ctx.beginPath()
      ctx.arc(600, 95, 55, 0, Math.PI * 2)
      ctx.fillStyle = selectedTemplate === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.2)'
      ctx.fill()
      if (selectedTemplate === 'minimalist') {
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 4
        ctx.stroke()
      } else if (selectedTemplate === 'warm_gold') {
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 4
        ctx.stroke()
      } else if (selectedTemplate === 'rustic_bakery') {
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 4
        ctx.stroke()
      }
      ctx.font = '55px "Segoe UI Emoji", "Apple Color Emoji", sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('🏪', 600, 95)

      // Store Name
      ctx.font = 'bold 36px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = selectedTemplate === 'minimalist' ? '#000000' : isDarkTheme ? '#fbbf24' : '#ffffff'
      ctx.fillText(targetStore.name.toUpperCase(), 600, 185)

      // 3. Draw Inner Content Card
      const cardX = 80
      const cardY = 280
      const cardW = 1040
      const cardH = 1200
      const radius = 40

      ctx.beginPath()
      ctx.roundRect(cardX, cardY, cardW, cardH, radius)
      if (selectedTemplate === 'minimalist') {
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 6
        ctx.stroke()
      } else if (isDarkTheme) {
        ctx.fillStyle = '#0f172a'
        ctx.strokeStyle = 'rgba(251,191,36,0.3)'
        ctx.lineWidth = 4
        ctx.stroke()
      } else if (isCreamTheme) {
        ctx.fillStyle = '#fdf6e2'
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 4
        ctx.stroke()
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.shadowColor = 'rgba(0, 0, 0, 0.15)'
        ctx.shadowBlur = 40
        ctx.shadowOffsetY = 15
      }
      ctx.fill()
      ctx.shadowBlur = 0 // Reset shadow
      ctx.shadowOffsetY = 0

      // 4. Card Heading: Queremos Te Ouvir!
      let headingColor = '#4c1d95'
      if (selectedTemplate === 'bogados_cyan') headingColor = '#164e63'
      if (selectedTemplate === 'warm_gold') headingColor = '#fbbf24'
      if (selectedTemplate === 'rustic_bakery') headingColor = '#7c2d12'
      if (selectedTemplate === 'minimalist') headingColor = '#000000'

      ctx.fillStyle = headingColor
      ctx.font = 'black 62px system-ui, -apple-system, sans-serif'
      ctx.fillText(posterTitle.toUpperCase(), 600, 390)

      // 5. Card Subtitle (The core user request)
      let textColor = '#4b5563'
      if (isDarkTheme) textColor = '#cbd5e1'
      if (isCreamTheme) textColor = '#9a3412'
      if (selectedTemplate === 'minimalist') textColor = '#000000'

      ctx.fillStyle = textColor
      ctx.font = '500 32px system-ui, -apple-system, sans-serif'

      // Text wrapping function helper with multi-line/newline (\n) support
      const wrapText = (context, text, x, y, maxWidth, lineHeight) => {
        const paragraphs = String(text || '').split('\n')
        let currentY = y
        for (let i = 0; i < paragraphs.length; i++) {
          // If a paragraph is empty, add a small blank line spacing
          if (paragraphs[i].trim() === '') {
            currentY += lineHeight * 0.7
            continue
          }
          const words = paragraphs[i].split(' ')
          let line = ''
          for (let n = 0; n < words.length; n++) {
            let testLine = line + words[n] + ' '
            let metrics = context.measureText(testLine)
            let testWidth = metrics.width
            if (testWidth > maxWidth && n > 0) {
              context.fillText(line, x, currentY)
              line = words[n] + ' '
              currentY += lineHeight
            } else {
              line = testLine
            }
          }
          context.fillText(line, x, currentY)
          if (i < paragraphs.length - 1) {
            currentY += lineHeight
          }
        }
        return currentY
      }

      const nextY = wrapText(ctx, posterSubtitle, 600, 480, 880, 46)

      // 6. Draw QR Code Frame
      const qrFrameX = 150
      const qrFrameY = nextY + 70
      const qrFrameW = 380
      const qrFrameH = 380

      ctx.beginPath()
      ctx.roundRect(qrFrameX, qrFrameY, qrFrameW, qrFrameH, 30)
      if (selectedTemplate === 'minimalist') {
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 4
      } else if (isDarkTheme) {
        ctx.fillStyle = '#1e293b'
        ctx.strokeStyle = '#fbbf24'
        ctx.lineWidth = 4
      } else if (isCreamTheme) {
        ctx.fillStyle = '#fffbeb'
        ctx.strokeStyle = '#b45309'
        ctx.lineWidth = 4
      } else {
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = primaryColor
        ctx.lineWidth = 4
      }
      ctx.fill()
      ctx.stroke()

      // Draw loaded QR Code image inside frame
      ctx.drawImage(qrImg, qrFrameX + 30, qrFrameY + 30, 320, 320)

      // "ESCANEIE AQUI" Tag Badge
      const badgeW = 260
      const badgeH = 50
      const badgeX = qrFrameX + (qrFrameW - badgeW) / 2
      const badgeY = qrFrameY + qrFrameH - 25

      ctx.beginPath()
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 25)
      ctx.fillStyle = selectedTemplate === 'minimalist' ? '#000000' : isDarkTheme ? '#fbbf24' : isCreamTheme ? '#b45309' : primaryColor
      ctx.fill()

      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = selectedTemplate === 'warm_gold' ? '#0f172a' : '#ffffff'
      ctx.fillText('ESCANEIE AQUI', badgeX + badgeW/2, badgeY + badgeH/2)

      // 7. Draw Steps Instructions list (on the Right side of QR Code)
      const stepsX = 590
      const stepsStartY = qrFrameY + 30
      const stepsGap = 100

      const drawStep = (num, text, y) => {
        // Step Badge Circle
        ctx.beginPath()
        ctx.arc(stepsX + 25, y + 20, 28, 0, Math.PI * 2)
        if (selectedTemplate === 'minimalist') {
          ctx.fillStyle = '#000000'
          ctx.fill()
          ctx.fillStyle = '#ffffff'
        } else if (isDarkTheme) {
          ctx.fillStyle = '#fbbf24'
          ctx.fill()
          ctx.fillStyle = '#0f172a'
        } else if (isCreamTheme) {
          ctx.fillStyle = '#fef3c7'
          ctx.fill()
          ctx.strokeStyle = '#fde68a'
          ctx.stroke()
          ctx.fillStyle = '#7c2d12'
        } else {
          ctx.fillStyle = selectedTemplate === 'bogados_cyan' ? '#ecfeff' : '#f5f3ff'
          ctx.fill()
          ctx.strokeStyle = selectedTemplate === 'bogados_cyan' ? '#cffafe' : '#ddd6fe'
          ctx.stroke()
          ctx.fillStyle = primaryColor
        }
        ctx.font = 'bold 24px system-ui, -apple-system, sans-serif'
        ctx.fillText(String(num), stepsX + 25, y + 20)

        // Step Text label
        ctx.font = 'bold 25px system-ui, -apple-system, sans-serif'
        ctx.fillStyle = textColor
        ctx.textAlign = 'left'
        wrapText(ctx, text, stepsX + 75, y + 25, 380, 32)
      }

      ctx.textAlign = 'center'
      drawStep(1, step1, stepsStartY)
      drawStep(2, step2, stepsStartY + stepsGap)
      drawStep(3, step3, stepsStartY + (stepsGap * 2))

      // 8. Bottom Footer Band
      ctx.textAlign = 'center'
      ctx.fillStyle = selectedTemplate === 'minimalist' ? '#ffffff' : isDarkTheme ? '#1e293b' : isCreamTheme ? '#fbe5c6' : selectedTemplate === 'bogados_cyan' ? '#ecfeff' : '#f5f3ff'
      if (selectedTemplate === 'minimalist') {
        ctx.beginPath()
        ctx.moveTo(0, 1500)
        ctx.lineTo(1200, 1500)
        ctx.strokeStyle = '#000000'
        ctx.lineWidth = 8
        ctx.stroke()
      } else {
        ctx.fillRect(0, 1500, 1200, 200)
        if (selectedTemplate === 'warm_gold') {
          ctx.beginPath()
          ctx.moveTo(0, 1500)
          ctx.lineTo(1200, 1500)
          ctx.strokeStyle = '#fbbf24'
          ctx.lineWidth = 4
          ctx.stroke()
        }
      }

      ctx.font = 'bold 30px system-ui, -apple-system, sans-serif'
      ctx.fillStyle = selectedTemplate === 'minimalist' ? '#000000' : isDarkTheme ? '#fbbf24' : isCreamTheme ? '#7c2d12' : primaryColor
      ctx.fillText(footerNote, 600, 1600)

      // 9. Trigger file download
      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `placa_qrcode_${selectedStoreKey}.png`
      link.href = dataUrl
      link.click()

      setExporting(false)
    }

    qrImg.onerror = () => {
      alert('Erro ao carregar o QR Code da API pública. Por favor, tente novamente!')
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-screen overflow-hidden">
      {/* Header Panel */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={onBack} 
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90 flex items-center justify-center">
            ←
          </button>
          <div>
            <div className="font-extrabold text-gray-900 flex items-center gap-1.5 text-lg">⚙️ Central do Gestor</div>
            <div className="text-xs text-gray-500">Configurações gerais e gerador de displays de loja</div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 shrink-0">
          <button
            onClick={() => setActiveTab('qrcode')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5
              ${activeTab === 'qrcode' 
                ? 'bg-white text-violet-700 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'}`}
          >
            📱 QR Code de Balcão
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5
              ${activeTab === 'security' 
                ? 'bg-white text-violet-700 shadow-sm border border-slate-200' 
                : 'text-slate-600 hover:text-slate-900'}`}
          >
            🔐 PIN de Segurança
          </button>
        </div>
      </header>

      {/* Main Studio Area */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* VIEW 1: QR CODE STUDIO */}
        {activeTab === 'qrcode' && (
          <div className="flex-1 flex overflow-hidden">
            
            {/* Control Panel (Left Side) */}
            <aside className="w-96 bg-white border-r border-slate-200 overflow-y-auto p-5 shrink-0 flex flex-col gap-5 scrollbar-thin">
              
              {/* Selector: Active Store */}
              <div>
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Escolha a Loja</h4>
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">Layout Customizado</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => resetToStoreDefaults('loja_principal')}
                    className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 flex flex-col justify-between h-20
                      ${selectedStoreKey === 'loja_principal'
                        ? 'border-violet-600 bg-violet-50 text-violet-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'}`}
                  >
                    <span className="text-lg">👑</span>
                    <div>
                      <div className="font-bold text-xs leading-none">LOJA MANÁ</div>
                      <div className="text-[10px] text-slate-500 mt-1">Maná de Deus</div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => resetToStoreDefaults('loja_bogados')}
                    className={`p-3 rounded-xl border-2 text-left transition-all active:scale-95 flex flex-col justify-between h-20
                      ${selectedStoreKey === 'loja_bogados'
                        ? 'border-cyan-600 bg-cyan-50 text-cyan-900'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'}`}
                  >
                    <span className="text-lg">🏪</span>
                    <div>
                      <div className="font-bold text-xs leading-none">BOGADOS</div>
                      <div className="text-[10px] text-slate-500 mt-1">Filial Bogados</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Selector: Premium Presets */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">2. Estilo Visual (Template)</h4>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.values(TEMPLATES).map((tmpl) => (
                    <button
                      key={tmpl.id}
                      onClick={() => setSelectedTemplate(tmpl.id)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-left transition-all text-xs font-semibold
                        ${selectedTemplate === tmpl.id
                          ? 'border-slate-900 bg-slate-900 text-white font-bold ring-2 ring-slate-800'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${tmpl.bgPreview}`} />
                        <span>{tmpl.name}</span>
                      </div>
                      {selectedTemplate === tmpl.id && <span className="text-xs font-bold">✓</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Fields: Title and Descriptions */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">3. Personalizar Textos</h4>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Título da Placa</label>
                  <input
                    type="text"
                    value={posterTitle}
                    onChange={(e) => setPosterTitle(e.target.value)}
                    placeholder="Sua Opinião Vale Muito!"
                    className="input w-full px-3 py-2 text-xs"
                    maxLength={32}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Mensagem ao Redor do QR Code</label>
                  <textarea
                    value={posterSubtitle}
                    onChange={(e) => setPosterSubtitle(e.target.value)}
                    placeholder="Descrição..."
                    rows={4}
                    className="input w-full px-3 py-2 text-xs resize-y leading-relaxed min-h-[100px]"
                    maxLength={350}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Instruções Passo a Passo</label>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">1</span>
                      <input
                        type="text"
                        value={step1}
                        onChange={(e) => setStep1(e.target.value)}
                        className="input w-full px-2 py-1.5 text-xs"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">2</span>
                      <input
                        type="text"
                        value={step2}
                        onChange={(e) => setStep2(e.target.value)}
                        className="input w-full px-2 py-1.5 text-xs"
                        maxLength={40}
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center shrink-0">3</span>
                      <input
                        type="text"
                        value={step3}
                        onChange={(e) => setStep3(e.target.value)}
                        className="input w-full px-2 py-1.5 text-xs"
                        maxLength={40}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Nota de rodapé</label>
                  <input
                    type="text"
                    value={footerNote}
                    onChange={(e) => setFooterNote(e.target.value)}
                    className="input w-full px-3 py-2 text-xs"
                    maxLength={60}
                  />
                </div>
              </div>

              {/* Utility Info Link */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 mt-auto">
                <span className="text-[9px] font-extrabold uppercase text-slate-400 block mb-1">Link Público do Cliente</span>
                <div className="text-[10px] font-mono break-all text-slate-500 bg-white border border-slate-100 p-1.5 rounded-md leading-normal mb-2 max-h-16 overflow-y-auto">
                  {publicLink}
                </div>
                <button
                  onClick={copyLink}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                >
                  📋 Copiar Link Público
                </button>
              </div>

            </aside>

            {/* Poster Preview Workspace (Right Side) */}
            <main className="flex-1 bg-slate-900 overflow-y-auto p-8 flex flex-col items-center justify-start relative scrollbar-thin">
              
              {/* Studio Tag */}
              <div className="absolute top-4 left-4 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest bg-slate-800/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700/50 z-10 shadow-lg flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Estúdio de Pré-Visualização da Placa A4
              </div>

              {/* Outer sheet background framing */}
              <div className="pt-12 pb-16 flex flex-col items-center">
                
                {/* Visual A4 Aspect Mock Card */}
                <div
                  className={`w-[480px] h-[678px] rounded-2xl flex flex-col justify-between overflow-hidden shadow-2xl relative border-4 transition-all
                    ${selectedTemplate === 'warm_gold' ? 'border-amber-500' : 
                      selectedTemplate === 'rustic_bakery' ? 'border-amber-700' : 
                      selectedTemplate === 'bogados_cyan' ? 'border-cyan-600' : 
                      selectedTemplate === 'minimalist' ? 'border-black' : 'border-violet-600'}
                    ${selectedTemplate === 'warm_gold' ? 'bg-slate-950 text-slate-100' : 
                      selectedTemplate === 'rustic_bakery' ? 'bg-[#fdf6e2] text-amber-950' : 'bg-white text-gray-800'}`}
                >
                  
                  {/* Header Band */}
                  <div
                    className="p-5 text-center flex flex-col items-center justify-center border-b"
                    style={{
                      background: templateConfig.bg,
                      color: selectedTemplate === 'minimalist' ? '#000000' : '#ffffff',
                      borderColor: selectedTemplate === 'minimalist' ? '#000000' : 'transparent'
                    }}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1.5 shadow-md
                      ${selectedTemplate === 'minimalist' ? 'border-2 border-black bg-white' : 'bg-white/20 border border-white/30'}`}
                    >
                      🏪
                    </div>
                    <h3 className="font-extrabold text-sm uppercase tracking-widest leading-none">
                      {targetStore.name}
                    </h3>
                  </div>

                  {/* Main content body */}
                  <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
                    
                    {/* Main Title */}
                    <h2 className={`text-2xl font-black mb-2.5 uppercase leading-tight tracking-tight
                      ${templateConfig.titleColor}`}
                    >
                      {posterTitle}
                    </h2>

                    {/* Subtitle */}
                    <p className={`text-xs px-2 leading-relaxed mb-6 font-medium max-w-[400px] whitespace-pre-wrap
                      ${templateConfig.textColor}`}
                    >
                      {posterSubtitle}
                    </p>

                    {/* Dynamic QR & Steps layout */}
                    <div className="flex items-center justify-center gap-6 w-full px-4">
                      
                      {/* QR Frame Container */}
                      <div className={`p-4 rounded-2xl flex flex-col items-center justify-center shrink-0 border-2
                        ${templateConfig.previewCardBg}
                        ${templateConfig.borderColor}`}
                      >
                        <div className="w-[120px] h-[120px] bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(publicLink)}`}
                            alt="QR Code"
                            className="w-full h-full object-contain animate-fade-in"
                          />
                        </div>
                        <span className={`mt-2.5 text-[9px] font-black tracking-widest px-3 py-1 rounded-full uppercase shadow-sm
                          ${selectedTemplate === 'warm_gold' ? 'bg-amber-500 text-slate-950' :
                            selectedTemplate === 'minimalist' ? 'bg-black text-white' :
                            selectedTemplate === 'rustic_bakery' ? 'bg-amber-700 text-white' :
                            selectedTemplate === 'bogados_cyan' ? 'bg-cyan-600 text-white' : 'bg-violet-600 text-white'}`}
                        >
                          Escaneie Aqui
                        </span>
                      </div>

                      {/* Instructions steps list */}
                      <div className="flex flex-col gap-4 text-left max-w-[200px]">
                        <div className="flex items-start gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-sm
                            ${templateConfig.badgeBg}`}
                          >
                            1
                          </span>
                          <p className={`text-[11px] font-semibold leading-snug pt-0.5
                            ${templateConfig.textColor}`}
                          >
                            {step1}
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-sm
                            ${templateConfig.badgeBg}`}
                          >
                            2
                          </span>
                          <p className={`text-[11px] font-semibold leading-snug pt-0.5
                            ${templateConfig.textColor}`}
                          >
                            {step2}
                          </p>
                        </div>

                        <div className="flex items-start gap-2.5">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-extrabold shrink-0 shadow-sm
                            ${templateConfig.badgeBg}`}
                          >
                            3
                          </span>
                          <p className={`text-[11px] font-semibold leading-snug pt-0.5
                            ${templateConfig.textColor}`}
                          >
                            {step3}
                          </p>
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* Footer Bar */}
                  <div className={`p-4 text-center text-xs font-bold border-t
                    ${templateConfig.footerBg}
                    ${templateConfig.borderColor}`}
                  >
                    {footerNote}
                  </div>

                </div>

                {/* Print & Download Triggers */}
                <div className="mt-8 flex flex-col items-center gap-3 w-[480px]">
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button
                      onClick={handlePrintPoster}
                      className="py-4 px-4 text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer rounded-2xl text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-indigo-600/20"
                    >
                      🖨️ Imprimir Placa A4 (PDF)
                    </button>
                    
                    <button
                      onClick={handleDownloadPNG}
                      disabled={exporting}
                      className="py-4 px-4 text-xs font-extrabold tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg transition-all active:scale-[0.98] cursor-pointer rounded-2xl text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-600/20 disabled:opacity-50"
                    >
                      {exporting ? '⏳ Gerando...' : '💾 Baixar Placa (PNG)'}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 font-bold text-center leading-relaxed">
                    💡 **DICA DE IMPRESSÃO A4:** Nas configurações da tela de impressão do seu navegador, selecione a opção **"Colorido"**, altere as margens para **"Nenhuma" (None)** e certifique-se de marcar a caixinha **"Imprimir Gráficos de Fundo"** para um display vibrante de alta resolução!
                  </p>
                </div>

              </div>

            </main>

          </div>
        )}

        {/* VIEW 2: SECURITY CONFIGS */}
        {activeTab === 'security' && (
          <main className="flex-1 overflow-y-auto bg-slate-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mt-4">
              
              <div className="flex items-center gap-3.5 mb-5 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xl">
                  🔐
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 text-base">Segurança & Controle</h3>
                  <p className="text-xs text-gray-500">Atualize o PIN mestre para autenticação do gerente.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Novo PIN Mestre (4 a 6 dígitos)</label>
                  <input 
                    className="input w-full max-w-xs font-mono text-2xl tracking-[0.5em] text-center" 
                    type="password" 
                    placeholder="••••"
                    value={newPin} 
                    onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} 
                    maxLength={6} 
                  />
                  <p className="text-[10px] text-slate-400 font-semibold">
                    Este PIN fornece acesso ilimitado a todas as ferramentas e painéis de gerência no sistema. Guarde-o com cuidado!
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={updateManagerPin} 
                    disabled={loading || newPin.length < 4} 
                    className="btn btn-primary px-8 h-12 shadow-sm font-bold active:scale-95 transition-all text-xs"
                  >
                    {loading ? '⏳ Salvando...' : 'Confirmar e Atualizar'}
                  </button>
                </div>
              </div>

            </div>
          </main>
        )}

      </div>
    </div>
  )
}
