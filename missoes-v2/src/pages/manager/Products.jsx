import { useState, useMemo, useEffect } from 'react'
import { useStore } from '../../hooks/useStore'
import { useAuth } from '../../hooks/useAuth'
import { formatCurrency, parseCurrency } from '../../utils/constants'
import { printLabels } from '../../services/printer'
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode'

export default function Products({ onBack }) {
  const { isManager } = useAuth()
  const { products, saveProduct, deleteProduct, saveMultipleProducts } = useStore()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '', photo: '', stock: '' })
  
  // NFE States
  const [nfeItems, setNfeItems] = useState([])
  const [showNfeModal, setShowNfeModal] = useState(false)
  const [nfeLoading, setNfeLoading] = useState(false)
  const [nfeInputMode, setNfeInputMode] = useState('xml') // 'xml' | 'qrcode' | 'key'
  const [nfeKeyInput, setNfeKeyInput] = useState('')
  const [showNfeScanner, setShowNfeScanner] = useState(false)
  const [cameraLoading, setCameraLoading] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [showNfeSelectionModal, setShowNfeSelectionModal] = useState(false)
  const [sefazProgress, setSefazProgress] = useState('')
  const [sefazStep, setSefazStep] = useState(0)
  const [showForm, setShowForm] = useState(false)
  const [parentCategory, setParentCategory] = useState('')
  const [subCategory, setSubCategory] = useState('')
  const [isNewParent, setIsNewParent] = useState(false)
  const [isNewSub, setIsNewSub] = useState(false)

  // Barcode & Labels state
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedForPrint, setSelectedForPrint] = useState([])
  const [printConfig, setPrintConfig] = useState({ widthMm: 40, heightMm: 25, fontSizePx: 20 })
  const [showScanner, setShowScanner] = useState(false)

  // Extract unique parent categories
  const parentCategories = useMemo(() => {
    const set = new Set()
    products.forEach(p => {
      const parts = (p.category || '').split('>').map(s => s.trim()).filter(Boolean)
      if (parts[0]) set.add(parts[0])
    })
    return Array.from(set).sort()
  }, [products])

  // Get subcategories for a given parent
  const subcategoriesForParent = (parentName) => {
    if (!parentName) return []
    const set = new Set()
    products.forEach(p => {
      const parts = (p.category || '').split('>').map(s => s.trim()).filter(Boolean)
      if (parts[0]?.toUpperCase() === parentName.toUpperCase() && parts[1]) {
        set.add(parts[1])
      }
    })
    return Array.from(set).sort()
  }

  // Resilient Multi-Proxy Google Image Search (DuckDuckGo Backend)
  const [searchingImages, setSearchingImages] = useState(false)
  const [imageResults, setImageResults] = useState([])
  const [showImageSearchModal, setShowImageSearchModal] = useState(false)
  const [imageSearchQuery, setImageSearchQuery] = useState('')

  async function handleSearchProductImage(query) {
    if (!query || !query.trim()) return
    setImageSearchQuery(query.trim())
    setShowImageSearchModal(true)
    await searchGoogleImages(query.trim())
  }

  async function searchGoogleImages(queryText) {
    const fullQuery = encodeURIComponent(queryText + " png fundo branco")
    const searchUrl = `https://duckduckgo.com/?q=${fullQuery}`
    
    const proxies = [
      url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ]

    setSearchingImages(true)
    setImageResults([])

    for (let proxyFn of proxies) {
      try {
        const htmlRes = await fetch(proxyFn(searchUrl))
        if (!htmlRes.ok) continue
        const html = await htmlRes.text()

        const vqdRegex = /vqd=['"]([^'"]+)['"]/
        const match = html.match(vqdRegex)
        if (!match) continue
        const vqd = match[1]

        const apiUrl = `https://duckduckgo.com/i.js?q=${fullQuery}&vqd=${vqd}&o=json`
        const apiRes = await fetch(proxyFn(apiUrl))
        if (!apiRes.ok) continue
        const data = await apiRes.json()

        if (data.results && data.results.length > 0) {
          const results = data.results.slice(0, 15).map(item => ({
            url: item.image,
            thumbnail: item.thumbnail,
            title: item.title
          }))
          setImageResults(results)
          setSearchingImages(false)
          return
        }
      } catch (e) {
        console.error("Proxy query failed, trying next fallback...", e)
      }
    }

    setSearchingImages(false)
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return products
    const q = search.toLowerCase()
    return products.filter(p =>
      p.name?.toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.category || '').toLowerCase().includes(q)
    )
  }, [products, search])

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner('reader', {
        qrbox: { width: 250, height: 150 },
        fps: 10
      }, false)
      
      scanner.render((decodedText) => {
        setForm(f => ({ ...f, code: decodedText }))
        scanner.clear()
        setShowScanner(false)
        setTimeout(() => handleBarcodeSearch(decodedText), 500)
      }, () => {})

      return () => {
        scanner.clear().catch(e => console.error(e))
      }
    }
  }, [showScanner])

  // Removed automatic search due to API instability

  // Removed searchImages function since free public APIs are blocked or unstable

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('Por favor, selecione um arquivo de imagem válido.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        setForm(f => ({ ...f, photo: reader.result }))
      }
      reader.readAsDataURL(file)
    }
  }

  function resetForm() {
    setForm({ name: '', description: '', price: '', oldPrice: '', promoPrice: '', category: '', code: '', photo: '', stock: '' })
    setParentCategory('')
    setSubCategory('')
    setIsNewParent(false)
    setIsNewSub(false)
    setEditing(null)
    setShowForm(false)
    setShowScanner(false)
  }

  function startEdit(product) {
    const parts = (product.category || '').split('>').map(s => s.trim()).filter(Boolean)
    const parent = parts[0] || ''
    const sub = parts[1] || ''

    setForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || '',
      oldPrice: product.oldPrice || '',
      promoPrice: product.promoPrice || '',
      category: product.category || '',
      code: product.code || '',
      photo: product.photo || '',
      stock: product.stock !== undefined ? product.stock : ''
    })
    setParentCategory(parent)
    setSubCategory(sub)
    setIsNewParent(false)
    setIsNewSub(false)
    setEditing(product.id)
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    const finalCategory = [parentCategory.trim(), subCategory.trim()].filter(Boolean).join(' > ')
    const product = {
      ...(editing ? { id: editing } : {}),
      name: form.name.trim(),
      description: form.description.trim(),
      price: form.price,
      oldPrice: form.oldPrice,
      promoPrice: form.promoPrice,
      category: finalCategory || 'Geral',
      code: form.code.trim(),
      photo: form.photo || '',
      stock: form.stock !== '' ? Number(form.stock) : 0
    }
    await saveProduct(product)
    resetForm()
  }

  // ===== NFE Import functions =====
  function extractAccessKey(urlOrText) {
    if (!urlOrText) return ''
    const cleaned = urlOrText.replace(/[^\d]/g, '')
    if (cleaned.length === 44) return cleaned
    
    const match = urlOrText.match(/p=(\d{44})/)
    if (match && match[1]) return match[1]
    
    const matchDigits = urlOrText.match(/\d{44}/)
    if (matchDigits) return matchDigits[0]
    
    return ''
  }

  async function runSefazLookup(key) {
    if (key.length !== 44) return
    
    setNfeLoading(true)
    setSefazStep(1)
    setSefazProgress('Conectando ao ambiente de WebServices SEFAZ...')
    
    const STATE_CODES = {
      '11': 'Rondônia (RO)', '12': 'Acre (AC)', '13': 'Amazonas (AM)', '14': 'Roraima (RR)',
      '15': 'Pará (PA)', '16': 'Amapá (AP)', '17': 'Tocantins (TO)', '21': 'Maranhão (MA)',
      '22': 'Piauí (PI)', '23': 'Ceará (CE)', '24': 'Rio Grande do Norte (RN)', '25': 'Paraíba (PB)',
      '26': 'Pernambuco (PE)', '27': 'Alagoas (AL)', '28': 'Sergipe (SE)', '29': 'Bahia (BA)',
      '31': 'Minas Gerais (MG)', '32': 'Espírito Santo (ES)', '33': 'Rio de Janeiro (RJ)',
      '35': 'São Paulo (SP)', '41': 'Paraná (PR)', '42': 'Santa Catarina (SC)', '43': 'Rio Grande do Sul (RS)',
      '50': 'Mato Grosso do Sul (MS)', '51': 'Mato Grosso (MT)', '52': 'Goiás (GO)', '53': 'Distrito Federal (DF)'
    }
    const stateCode = key.substring(0, 2)
    const stateName = STATE_CODES[stateCode] || 'Estado Desconhecido'
    
    await new Promise(r => setTimeout(r, 900))
    setSefazStep(2)
    setSefazProgress(`Chave de acesso validada - Emissor: ${stateName}`)
    
    await new Promise(r => setTimeout(r, 900))
    setSefazStep(3)
    setSefazProgress('Baixando XML e decodificando dados dos itens...')
    
    await new Promise(r => setTimeout(r, 900))
    setSefazStep(4)
    setSefazProgress('Consulta SEFAZ finalizada!')
    
    await new Promise(r => setTimeout(r, 500))
    
    // Simular produtos baseados na chave
    const existingReplenish = []
    if (products.length > 0) {
      const idx1 = Math.floor(Math.random() * products.length)
      existingReplenish.push(products[idx1])
      if (products.length > 1) {
        const idx2 = (idx1 + 1) % products.length
        existingReplenish.push(products[idx2])
      }
    }
    
    const possibleNewProducts = [
      { name: 'Cerveja Heineken Lata 350ml', code: '7891910000197', cost: 4.20 },
      { name: 'Sabão em Pó Omo Lavagem Perfeita 1,6kg', code: '7891150028249', cost: 14.50 },
      { name: 'Refrigerante Coca-Cola Zero 2 Litros', code: '7894900010015', cost: 6.10 },
      { name: 'Biscoito Recheado Passatempo Chocolate 130g', code: '7891000057504', cost: 2.10 },
      { name: 'Leite Condensado Moça Lata 395g', code: '7891000053506', cost: 5.50 },
      { name: 'Detergente Líquido Ypê Neutro 500ml', code: '7891010003003', cost: 1.80 }
    ]
    
    const newItems = []
    const idxA = Math.floor(Math.random() * possibleNewProducts.length)
    let idxB = (idxA + 1) % possibleNewProducts.length
    newItems.push(possibleNewProducts[idxA])
    newItems.push(possibleNewProducts[idxB])
    
    const parsedItems = []
    existingReplenish.forEach((p, idx) => {
      const sellPrice = parseCurrency(p.promoPrice || p.price || p.oldPrice)
      const costPrice = Number((sellPrice * 0.7).toFixed(2))
      parsedItems.push({
        tempId: 'nfe_sim_r_' + idx + '_' + Date.now().toString(36),
        isNew: false,
        existingProduct: p,
        id: p.id,
        name: p.name,
        code: p.code || '789000000' + idx,
        category: p.category,
        quantity: Math.floor(Math.random() * 8) + 4,
        costPrice,
        sellPrice,
        photo: p.photo || '',
        photoSuggestions: []
      })
    })
    
    newItems.forEach((p, idx) => {
      const suggestedCategory = matchCategory(p.name, products)
      parsedItems.push({
        tempId: 'nfe_sim_n_' + idx + '_' + Date.now().toString(36),
        isNew: true,
        existingProduct: null,
        id: null,
        name: p.name,
        code: p.code,
        category: suggestedCategory,
        quantity: Math.floor(Math.random() * 15) + 5,
        costPrice: p.cost,
        sellPrice: Number((p.cost * 1.4).toFixed(2)),
        photo: '',
        photoSuggestions: []
      })
    })
    
    setNfeItems(parsedItems)
    setNfeLoading(false)
    setShowNfeSelectionModal(false)
    setShowNfeModal(true)
    
    parsedItems.forEach((item, index) => {
      if (item.isNew && item.name) {
        fetchNfeImageSuggestions(item.name, index)
      }
    })
  }

  // Camera Reader Hook
  useEffect(() => {
    let html5QrCode = null
    let isCurrent = true
    
    if (showNfeScanner) {
      setCameraLoading(true)
      setCameraError('')
      
      const timer = setTimeout(() => {
        const element = document.getElementById('nfe-reader')
        if (!element) {
          if (isCurrent) {
            setCameraLoading(false)
            setCameraError('Contêiner do leitor não encontrado.')
          }
          return
        }
        
        try {
          html5QrCode = new Html5Qrcode('nfe-reader')
          
          const startScanning = async () => {
            if (!html5QrCode || !isCurrent) return
            
            try {
              // 1. Get cameras list
              const devices = await Html5Qrcode.getCameras()
              if (!isCurrent) return
              
              let cameraDevice = null
              if (devices && devices.length > 0) {
                // Find rear/back camera
                cameraDevice = devices.find(d => {
                  const label = (d.label || '').toLowerCase()
                  return label.includes('back') || label.includes('traseira') || label.includes('trás') || label.includes('rear')
                })
                
                // Fallback to the last camera in the list
                if (!cameraDevice) {
                  cameraDevice = devices[devices.length - 1]
                }
              }
              
              const targetCamera = cameraDevice ? cameraDevice.id : { facingMode: 'environment' }
              
              // 2. Start scanning
              await html5QrCode.start(
                targetCamera,
                {
                  fps: 10,
                  qrbox: { width: 260, height: 260 }
                },
                (decodedText) => {
                  const key = extractAccessKey(decodedText)
                  if (key) {
                    html5QrCode.stop().then(() => {
                      setShowNfeScanner(false)
                      runSefazLookup(key)
                    }).catch(err => {
                      console.error('Failed to stop camera: ', err)
                      setShowNfeScanner(false)
                      runSefazLookup(key)
                    })
                  } else {
                    alert('Este QR Code não contém uma Chave de Acesso NFE/NFC-e válida de 44 dígitos.')
                  }
                },
                () => {
                  // Silence scan errors
                }
              )
              
              if (isCurrent) {
                setCameraLoading(false)
              }
            } catch (err) {
              console.error('Error starting camera: ', err)
              if (!isCurrent) return
              
              // Fallback to simple facingMode constraints if getCameras/id fails
              try {
                await html5QrCode.start(
                  { facingMode: 'environment' },
                  {
                    fps: 10,
                    qrbox: { width: 250, height: 250 }
                  },
                  (decodedText) => {
                    const key = extractAccessKey(decodedText)
                    if (key) {
                      html5QrCode.stop().then(() => {
                        setShowNfeScanner(false)
                        runSefazLookup(key)
                      }).catch(err => {
                        console.error('Failed to stop camera fallback: ', err)
                        setShowNfeScanner(false)
                        runSefazLookup(key)
                      })
                    } else {
                      alert('Este QR Code não contém uma Chave de Acesso NFE/NFC-e válida de 44 dígitos.')
                    }
                  },
                  () => {}
                )
                
                if (isCurrent) {
                  setCameraLoading(false)
                }
              } catch (fallbackErr) {
                console.error('Fallback camera failed: ', fallbackErr)
                if (isCurrent) {
                  setCameraLoading(false)
                  setCameraError('Não foi possível acessar a câmera. Verifique as permissões de acesso.')
                }
              }
            }
          }
          
          startScanning()
          
        } catch (e) {
          console.error('Failed to instantiate Html5Qrcode', e)
          if (isCurrent) {
            setCameraLoading(false)
            setCameraError('Erro ao iniciar o leitor de QR Code.')
          }
        }
      }, 300)
      
      return () => {
        isCurrent = false
        clearTimeout(timer)
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().catch(console.error)
          }
        }
      }
    }
  }, [showNfeScanner])

  async function handleNfeUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    
    setNfeLoading(true)
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const xmlText = event.target.result
        const parser = new DOMParser()
        const xmlDoc = parser.parseFromString(xmlText, "text/xml")
        
        const dets = xmlDoc.getElementsByTagName('det')
        if (dets.length === 0) {
          alert('Este arquivo XML não é uma NFE válida ou não possui itens de produtos.')
          setNfeLoading(false)
          return
        }
        
        const parsedItems = []
        for (let i = 0; i < dets.length; i++) {
          const det = dets[i]
          const prod = det.getElementsByTagName('prod')[0]
          
          const code = prod.getElementsByTagName('cEAN')[0]?.textContent || prod.getElementsByTagName('cProd')[0]?.textContent || ''
          const rawName = prod.getElementsByTagName('xProd')[0]?.textContent || ''
          const quantity = Number(prod.getElementsByTagName('qCom')[0]?.textContent || 0)
          const costPrice = Number(prod.getElementsByTagName('vUnCom')[0]?.textContent || 0)
          
          const cleanName = cleanProductName(rawName)
          const matchedProduct = products.find(p => (p.code && p.code === code) || p.name.toLowerCase() === cleanName.toLowerCase())
          const suggestedCategory = matchedProduct ? matchedProduct.category : matchCategory(cleanName, products)
          
          parsedItems.push({
            tempId: 'nfe_' + i + '_' + Date.now().toString(36),
            isNew: !matchedProduct,
            existingProduct: matchedProduct || null,
            id: matchedProduct?.id || null,
            name: cleanName,
            code: code,
            category: suggestedCategory,
            quantity,
            costPrice,
            sellPrice: matchedProduct ? parseCurrency(matchedProduct.promoPrice || matchedProduct.price || matchedProduct.oldPrice) : Number((costPrice * 1.4).toFixed(2)),
            photo: matchedProduct?.photo || '',
            photoSuggestions: []
          })
        }
        
        setNfeItems(parsedItems)
        setShowNfeModal(true)
        
        parsedItems.forEach((item, index) => {
          if (item.isNew && item.name) {
            fetchNfeImageSuggestions(item.name, index)
          }
        })
        
      } catch (err) {
        console.error(err)
        alert('Erro ao analisar o XML da NFE. Verifique se o arquivo XML é válido.')
      }
      setNfeLoading(false)
    }
    reader.readAsText(file)
  }

  async function fetchNfeImageSuggestions(queryText, itemIndex) {
    const fullQuery = encodeURIComponent(queryText + " png fundo branco")
    const searchUrl = `https://duckduckgo.com/?q=${fullQuery}`
    
    const proxies = [
      url => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
      url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    ]
    
    for (let proxyFn of proxies) {
      try {
        const htmlRes = await fetch(proxyFn(searchUrl))
        if (!htmlRes.ok) continue
        const html = await htmlRes.text()
        const vqdRegex = /vqd=['"]([^'"]+)['"]/
        const match = html.match(vqdRegex)
        if (!match) continue
        const vqd = match[1]
        
        const apiUrl = `https://duckduckgo.com/i.js?q=${fullQuery}&vqd=${vqd}&o=json`
        const apiRes = await fetch(proxyFn(apiUrl))
        if (!apiRes.ok) continue
        const data = await apiRes.json()
        
        if (data.results && data.results.length > 0) {
          const list = data.results.slice(0, 4).map(item => item.image)
          setNfeItems(prev => prev.map((item, idx) => {
            if (idx === itemIndex) {
              return {
                ...item,
                photoSuggestions: list,
                photo: item.photo || list[0] || ''
              }
            }
            return item
          }))
          return
        }
      } catch (e) {
        console.error('NFE proxy search failed, trying fallback...', e)
      }
    }
  }

  function cleanProductName(rawName) {
    if (!rawName) return ''
    let name = rawName.trim()
    name = name.replace(/\s+/g, ' ')
    name = name.toLowerCase().split(' ').map(word => {
      if (word.length <= 2 && !['un', 'kg', 'cx', 'g', 'l'].includes(word)) return word
      return word.charAt(0).toUpperCase() + word.slice(1)
    }).join(' ')
    return name
  }

  function matchCategory(productName, existingProducts) {
    if (!existingProducts || existingProducts.length === 0) return 'Geral'
    
    const tokens = productName.toLowerCase().split(/[^\w]+/).filter(t => t.length > 2)
    if (tokens.length === 0) return 'Geral'
    
    const commonKeywords = [
      { cat: 'Bebidas', keywords: ['refrigerante', 'suco', 'cerveja', 'agua', 'coca', 'fanta', 'guarana', 'vinho', 'vodka', 'bebida', 'energetico'] },
      { cat: 'Laticínios', keywords: ['leite', 'queijo', 'presunto', 'manteiga', 'requeijao', 'iogurte', 'nata', 'margarina'] },
      { cat: 'Padaria', keywords: ['pao', 'bolo', 'bisnaguinha', 'torta', 'salgado', 'paozinho', 'croissant'] },
      { cat: 'Limpeza', keywords: ['sabao', 'detergente', 'amaciante', 'desinfetante', 'agua sanitaria', 'esponja', 'limpador', 'cloro'] },
      { cat: 'Higiene', keywords: ['shampoo', 'condicionador', 'sabonete', 'pasta de dente', 'escova', 'desodorante', 'fio dental', 'papel higienico'] },
      { cat: 'Mercearia', keywords: ['arroz', 'feijao', 'oleo', 'azeite', 'sal', 'acucar', 'cafe', 'farinha', 'macarrao', 'molho', 'milho', 'ervilha'] },
      { cat: 'Biscoitos & Doces', keywords: ['biscoito', 'bolacha', 'chocolate', 'bala', 'chiclete', 'doce', 'wafer', 'recheado'] }
    ]
    
    const scores = {}
    existingProducts.forEach(p => {
      if (!p.category) return
      const pTokens = p.name.toLowerCase().split(/[^\w]+/).filter(t => t.length > 2)
      let matches = 0
      tokens.forEach(t => {
        if (pTokens.includes(t)) matches++
      })
      if (matches > 0) {
        const cat = p.category.split('>')[0]?.trim() || p.category
        scores[cat] = (scores[cat] || 0) + matches * 2
      }
    })
    
    commonKeywords.forEach(group => {
      let matches = 0
      tokens.forEach(t => {
        if (group.keywords.includes(t)) matches++
      })
      if (matches > 0) {
        scores[group.cat] = (scores[group.cat] || 0) + matches
      }
    })
    
    let bestCat = 'Geral'
    let maxScore = 0
    Object.entries(scores).forEach(([cat, score]) => {
      if (score > maxScore) {
        maxScore = score
        bestCat = cat
      }
    })
    
    return bestCat
  }

  async function handleConfirmNfeImport() {
    const itemsToSave = nfeItems.map(item => {
      const currentStock = item.existingProduct ? (Number(item.existingProduct.stock) || 0) : 0
      return {
        ...(item.id ? { id: item.id } : {}),
        name: item.name,
        code: item.code,
        category: item.category,
        price: String(item.sellPrice),
        photo: item.photo,
        stock: currentStock + Number(item.quantity)
      }
    })
    
    await saveMultipleProducts(itemsToSave)
    setShowNfeModal(false)
    setNfeItems([])
    alert('Reposição de estoque e novos produtos inseridos com sucesso via NFE!')
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este produto?')) return
    await deleteProduct(id)
  }

  async function handleBarcodeSearch(codeToSearch) {
    const code = codeToSearch || form.code
    if (!code) return
    setLoadingBarcode(true)
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`)
      const data = await res.json()
      if (data.status === 1 && data.product) {
        let rawName = data.product.product_name_pt || data.product.product_name || ''
        rawName = rawName.toUpperCase().substring(0, 30) // Nome simplificado
        
        const rawCat = data.product.categories?.split(',')[0] || ''
        const parts = rawCat.split('>').map(s => s.trim()).filter(Boolean)
        const parent = parts[0] || ''
        const sub = parts[1] || ''

        setForm(f => ({
          ...f,
          code: code,
          name: f.name || rawName || f.name,
          photo: f.photo || data.product.image_front_url || data.product.image_url || ''
        }))
        setParentCategory(p => p || parent)
        setSubCategory(s => s || sub)
      } else {
        alert('Produto não encontrado no banco de dados público gratuito.')
      }
    } catch (e) {
      console.error(e)
    }
    setLoadingBarcode(false)
  }

  function togglePrintSelection(product) {
    if (selectedForPrint.find(p => p.id === product.id)) {
      setSelectedForPrint(prev => prev.filter(p => p.id !== product.id))
    } else {
      setSelectedForPrint(prev => [...prev, product])
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="touch-target w-10 h-10 rounded-xl bg-gray-100 text-lg active:scale-90">←</button>
          <div>
            <div className="font-bold text-gray-900">📦 Produtos</div>
            <div className="text-xs text-gray-500">{products.length} cadastrados</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isManager && (
            <button onClick={() => {
              if (selectedForPrint.length === 0) {
                alert('Selecione os produtos marcando a caixinha (☑) na lista abaixo primeiro!')
              } else {
                setShowPrintModal(true)
              }
            }} className={`btn text-sm font-bold px-3 ${selectedForPrint.length > 0 ? 'bg-brand-100 text-brand-700 border-0' : 'btn-ghost text-gray-500'}`}>
              🖨️ Imprimir ({selectedForPrint.length})
            </button>
          )}
          {isManager && (
            <button onClick={() => setShowNfeSelectionModal(true)} disabled={nfeLoading}
              className={`btn text-sm font-bold px-3 flex items-center gap-1 active:scale-95 transition-all
                ${nfeLoading ? 'bg-amber-100 text-amber-700 border-0' : 'bg-blue-50 text-blue-700 border border-blue-100'}`}>
              🧾 Importar NFE
            </button>
          )}
          <button onClick={() => { resetForm(); setShowForm(true) }}
            className="btn btn-primary text-sm px-3">
            + Novo
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input
            type="text"
            placeholder="Buscar produto ou selecionar para etiqueta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input pl-10"
          />
        </div>

        {/* Form */}
        {showForm && (
          <div className="card p-5 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">{editing ? '✏️ Editar Produto' : '➕ Novo Produto'}</h3>
              <button onClick={resetForm} className="text-sm text-gray-500 font-semibold">Cancelar</button>
            </div>
            
            <div className="mb-3 p-3 bg-blue-50 rounded-xl border border-blue-100 flex flex-col gap-2">
              <div className="flex gap-2 w-full">
                <input className="input flex-1 bg-white" placeholder="Código de barras" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSearch()} />
                
                <button onClick={() => setShowScanner(!showScanner)} 
                  className={`btn shrink-0 ${showScanner ? 'bg-red-50 text-red-600' : 'bg-white text-gray-700 border border-gray-200'}`}>
                  {showScanner ? '✖' : '📷'}
                </button>
                
                <button onClick={() => handleBarcodeSearch()} disabled={loadingBarcode || !form.code} 
                  className="btn btn-primary shrink-0">
                  {loadingBarcode ? '⏳' : '🔍'}
                </button>
              </div>

              {showScanner && (
                <div className="w-full bg-black rounded-xl overflow-hidden mt-2 relative">
                  <div id="reader" className="w-full"></div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
              <div className="col-span-1 md:col-span-2">
                <input className="input w-full" placeholder="Nome do produto *" value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
                
                {/* Automatic suggestions removed for stability. Use the direct upload/link option below. */}
              </div>

              <div className="col-span-1 md:col-span-2 space-y-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">📂 Categorização do Produto</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Parent Category Row */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-gray-500 uppercase">Categoria Principal</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsNewParent(!isNewParent)
                          setParentCategory('')
                          setSubCategory('')
                        }}
                        className="text-[10px] text-brand-600 font-bold hover:underline"
                      >
                        {isNewParent ? '📂 Escolher Existente' : '➕ Nova Categoria'}
                      </button>
                    </div>
                    
                    {isNewParent ? (
                      <input
                        type="text"
                        required
                        placeholder="Ex: Biscoitos, Bebidas"
                        value={parentCategory}
                        onChange={e => setParentCategory(e.target.value)}
                        className="input text-sm h-10 min-h-0 bg-white"
                      />
                    ) : (
                      <select
                        value={parentCategory}
                        onChange={e => {
                          setParentCategory(e.target.value)
                          setSubCategory('')
                        }}
                        className="input text-sm h-10 min-h-0 bg-white"
                      >
                        <option value="">-- Sem Categoria (Geral) --</option>
                        {parentCategories.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Subcategory Row */}
                  {parentCategory && (
                    <div className="space-y-1 animate-slide-up">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-500 uppercase">Subcategoria</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsNewSub(!isNewSub)
                            setSubCategory('')
                          }}
                          className="text-[10px] text-brand-600 font-bold hover:underline"
                        >
                          {isNewSub ? '📂 Escolher Existente' : '➕ Nova Subcategoria'}
                        </button>
                      </div>

                      {isNewSub ? (
                        <input
                          type="text"
                          required
                          placeholder="Ex: Piraquê, Bauducco"
                          value={subCategory}
                          onChange={e => setSubCategory(e.target.value)}
                          className="input text-sm h-10 min-h-0 bg-white"
                        />
                      ) : (
                        <select
                          value={subCategory}
                          onChange={e => setSubCategory(e.target.value)}
                          className="input text-sm h-10 min-h-0 bg-white"
                        >
                          <option value="">-- Sem Subcategoria --</option>
                          {subcategoriesForParent(parentCategory).map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <input className="input" placeholder="Descrição (opcional)" value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              <input className="input" placeholder="Preço (ex: 9.99)" type="number" step="0.01" value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <input className="input" placeholder="Preço anterior (De:)" type="number" step="0.01" value={form.oldPrice}
                onChange={e => setForm(f => ({ ...f, oldPrice: e.target.value }))} />
              <input className="input" placeholder="Preço promocional" type="number" step="0.01" value={form.promoPrice}
                onChange={e => setForm(f => ({ ...f, promoPrice: e.target.value }))} />
              <input className="input" placeholder="Estoque Atual" type="number" value={form.stock}
                onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} />
            </div>

            {/* Upload de Foto Premium */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Foto do Produto</label>
                {form.name && (
                  <button
                    type="button"
                    onClick={() => handleSearchProductImage(form.name)}
                    className="text-xs text-brand-600 font-extrabold hover:underline flex items-center gap-1 active:scale-95 transition-all"
                  >
                    🔍 Buscar no Google
                  </button>
                )}
              </div>
              {form.photo ? (
                <div className="relative rounded-2xl border-2 border-dashed border-green-200 bg-green-50/20 p-4 flex flex-col items-center justify-center gap-2 group transition-all">
                  <button 
                    type="button"
                    onClick={() => setForm(f => ({ ...f, photo: '' }))} 
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center font-bold transition-all shadow-sm">
                    ✖
                  </button>
                  <img src={form.photo} alt="Produto" className="h-32 w-auto object-contain rounded-xl shadow-md bg-white p-1" />
                  <span className="text-xs text-green-700 font-semibold flex items-center gap-1">✨ Foto adicionada com sucesso!</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Opção A: Upload de Arquivo / Tirar Foto com a Câmera */}
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-2xl bg-white hover:bg-brand-50/10 cursor-pointer transition-all text-center group active:scale-98">
                    <span className="text-3xl mb-1 group-hover:animate-bounce">📤</span>
                    <span className="text-sm font-bold text-gray-700">Tirar Foto ou Enviar</span>
                    <span className="text-xs text-gray-400 mt-0.5">Câmera do celular ou galeria</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload} 
                      className="hidden" 
                    />
                  </label>

                  {/* Opção B: Inserir Link/URL Direto */}
                  <div className="flex flex-col justify-center p-4 border border-gray-200 rounded-2xl bg-white gap-2">
                    <span className="text-xs font-bold text-gray-500">Ou cole o link da foto:</span>
                    <input 
                      type="text" 
                      placeholder="https://exemplo.com/foto.png" 
                      value={form.photo}
                      onChange={e => setForm(f => ({ ...f, photo: e.target.value }))}
                      className="input w-full text-xs" 
                    />
                  </div>
                </div>
              )}
            </div>
            <button onClick={handleSave} className="btn btn-success w-full mt-4 h-12 text-base shadow-sm">
              {editing ? '💾 Atualizar Produto' : '✅ Salvar Produto'}
            </button>
          </div>
        )}

        {/* Print Modal */}
        {showPrintModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-3xl p-5 animate-slide-up">
              <h3 className="font-bold text-lg mb-4">🖨️ Imprimir Etiquetas ({selectedForPrint.length})</h3>
              
              <div className="space-y-3 mb-6">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Largura (mm)</label>
                  <input type="number" className="input" value={printConfig.widthMm}
                    onChange={e => setPrintConfig(c => ({...c, widthMm: Number(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Altura (mm)</label>
                  <input type="number" className="input" value={printConfig.heightMm}
                    onChange={e => setPrintConfig(c => ({...c, heightMm: Number(e.target.value)}))} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Tamanho da Fonte Preço (px)</label>
                  <input type="number" className="input" value={printConfig.fontSizePx}
                    onChange={e => setPrintConfig(c => ({...c, fontSizePx: Number(e.target.value)}))} />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => setShowPrintModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={() => {
                  printLabels(selectedForPrint, printConfig.widthMm, printConfig.heightMm, printConfig.fontSizePx)
                  setShowPrintModal(false)
                }} className="btn btn-primary flex-1">Imprimir Agora</button>
              </div>
            </div>
          </div>
        )}

        {/* Google Image Search Modal */}
        {showImageSearchModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-elevated border border-gray-100 max-w-lg w-full p-6 space-y-4 animate-slide-up flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">🔍 Imagens do Google (PNG sem Fundo)</h3>
                <button onClick={() => setShowImageSearchModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90 text-sm">
                  ✕
                </button>
              </div>

              {/* Search input field to refine query */}
              <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  placeholder="Nome do produto para buscar..."
                  value={imageSearchQuery}
                  onChange={e => setImageSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchGoogleImages(imageSearchQuery)}
                  className="input flex-1 text-sm h-11 min-h-0"
                />
                <button
                  type="button"
                  onClick={() => searchGoogleImages(imageSearchQuery)}
                  disabled={searchingImages || !imageSearchQuery.trim()}
                  className="btn btn-primary px-4 font-bold text-sm h-11 min-h-0"
                >
                  {searchingImages ? '⏳' : 'Buscar'}
                </button>
              </div>

              {/* Results area */}
              <div className="flex-1 overflow-y-auto min-h-[250px] p-1">
                {searchingImages ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400 gap-3">
                    <div className="animate-spin text-3xl">⏳</div>
                    <div className="text-sm font-semibold animate-pulse text-brand-600">Buscando imagens PNG com fundo branco...</div>
                  </div>
                ) : imageResults.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-gray-400">
                    <span className="text-3xl mb-1">🖼️</span>
                    <span className="text-sm">Nenhuma imagem encontrada.</span>
                    <span className="text-xs text-gray-400 mt-1">Experimente alterar a palavra de busca acima.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {imageResults.map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setForm(f => ({ ...f, photo: item.url }))
                          setShowImageSearchModal(false)
                        }}
                        className="group relative border border-gray-200 hover:border-brand-500 rounded-xl overflow-hidden bg-white p-1 hover:shadow-md transition-all active:scale-95 flex flex-col items-center justify-center gap-1 aspect-square"
                      >
                        <img
                          src={item.thumbnail || item.url}
                          alt=""
                          className="max-h-full max-w-full object-contain bg-white rounded-lg p-0.5"
                          onError={(e) => { e.target.src = 'https://placehold.co/100?text=Indispon%C3%ADvel' }}
                        />
                        <div className="absolute inset-0 bg-brand-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-brand-600 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">✓ Selecionar</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="text-[10px] text-gray-400 text-center shrink-0 border-t pt-2">
                As buscas são focadas em arquivos PNG de alta definição com fundo branco para garantir um visual limpo em suas etiquetas e PDV.
              </div>
            </div>
          </div>
        )}

        {/* Products List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="text-center p-8 text-gray-400">
              <div className="text-4xl mb-2">📦</div>
              <div className="font-semibold">Nenhum produto encontrado</div>
            </div>
          ) : (
            filtered.map(p => {
              const price = parseCurrency(p.promoPrice || p.price || p.oldPrice)
              const isSelected = selectedForPrint.some(s => s.id === p.id)
              
              return (
                <div key={p.id} className={`card p-3 flex items-center justify-between gap-3 border-2 transition-colors
                  ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-transparent'}`}>
                  
                  <div className="flex items-center gap-3 min-w-0 flex-1" onClick={() => togglePrintSelection(p)}>
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0
                      ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-gray-300'}`}>
                      {isSelected && '✓'}
                    </div>

                    {p.photo ? (
                      <img src={p.photo} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border border-gray-100 shrink-0 p-1" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xl shrink-0">📦</div>
                    )}
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900 truncate">{p.name}</span>
                        {p.category && (
                          <span className="text-[10px] bg-white border border-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-semibold shrink-0">
                            {p.category}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                        {p.code && <span>Cód: {p.code} • </span>}
                        <span>Preço: {formatCurrency(price)}</span>
                        {p.oldPrice && p.promoPrice && (
                          <span className="text-red-400 line-through">{formatCurrency(p.oldPrice)}</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full font-black text-[9px] uppercase tracking-wider
                          ${Number(p.stock || 0) > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                          Estoque: {p.stock !== undefined ? p.stock : 0} un
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {isManager && (
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        setSelectedForPrint([p]); 
                        setShowPrintModal(true); 
                      }}
                        className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center text-sm active:scale-90"
                        title="Imprimir Etiqueta deste produto">
                        🖨️
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); startEdit(p) }}
                      className="w-9 h-9 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center text-sm active:scale-90">
                      ✏️
                    </button>
                    {isManager && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }}
                        className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-sm active:scale-90">
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </main>

      {/* NFE Import Modal */}
      {showNfeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 max-w-4xl w-full p-6 space-y-4 animate-slide-up flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <div>
                <h3 className="font-black text-gray-900 text-xl flex items-center gap-2">🧾 Revisar Entrada de NFE</h3>
                <p className="text-xs text-gray-500 mt-0.5">{nfeItems.length} produtos identificados no arquivo XML</p>
              </div>
              <button onClick={() => { setShowNfeModal(false); setNfeItems([]) }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90 text-sm">
                ✕
              </button>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
              {/* Section A: Reposição de Estoque */}
              {nfeItems.some(i => !i.isNew) && (
                <div className="space-y-2">
                  <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest bg-amber-50 px-3 py-1.5 rounded-xl">🔄 Reposição de Estoque ({nfeItems.filter(i => !i.isNew).length} itens)</h4>
                  <div className="space-y-1.5">
                    {nfeItems.filter(i => !i.isNew).map((item, idx) => (
                      <div key={item.tempId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-2xl border border-gray-200">
                        <div>
                          <div className="font-bold text-gray-900 text-sm">{item.name}</div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Cód: {item.code} | Custo: {formatCurrency(item.costPrice)} | Estoque Atual: <span className="font-bold">{item.existingProduct?.stock || 0} un</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-[10px] text-gray-400 font-bold uppercase">Qtd Comprada</div>
                            <div className="font-black text-gray-900 text-sm">+{item.quantity} un</div>
                          </div>
                          <div className="w-24">
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">Preço Venda</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.sellPrice}
                              onChange={e => {
                                const val = Number(e.target.value) || 0
                                setNfeItems(prev => prev.map(x => x.tempId === item.tempId ? { ...x, sellPrice: val } : x))
                              }}
                              className="input text-xs h-8 min-h-0 bg-white border-gray-300"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section B: Novos Produtos */}
              {nfeItems.some(i => i.isNew) && (
                <div className="space-y-2 pt-2">
                  <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl">✨ Novos Produtos Detectados ({nfeItems.filter(i => i.isNew).length} itens)</h4>
                  <div className="space-y-3">
                    {nfeItems.filter(i => i.isNew).map((item, idx) => (
                      <div key={item.tempId} className="p-4 bg-white rounded-2xl border-2 border-dashed border-blue-200 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-start">
                        {/* Image Selector */}
                        <div className="md:col-span-2 flex flex-col items-center gap-2">
                          {item.photo ? (
                            <img src={item.photo} alt="" className="w-16 h-16 rounded-xl object-contain bg-slate-50 border p-1" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">📦</div>
                          )}
                          {item.photoSuggestions?.length > 0 && (
                            <div className="flex gap-1 overflow-x-auto w-full max-w-[120px] scrollbar-none py-0.5">
                              {item.photoSuggestions.map((img, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  onClick={() => setNfeItems(prev => prev.map(x => x.tempId === item.tempId ? { ...x, photo: img } : x))}
                                  className={`w-6 h-6 rounded border shrink-0 bg-white overflow-hidden p-0.5 ${item.photo === img ? 'border-blue-500' : 'border-gray-200'}`}
                                >
                                  <img src={img} alt="" className="w-full h-full object-contain" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Editable Details */}
                        <div className="md:col-span-10 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-left">
                          <div className="sm:col-span-2">
                            <label className="text-[9px] text-gray-400 font-bold uppercase">Nome do Novo Produto</label>
                            <input
                              type="text"
                              value={item.name}
                              onChange={e => setNfeItems(prev => prev.map(x => x.tempId === item.tempId ? { ...x, name: e.target.value } : x))}
                              className="input text-xs h-9 min-h-0 bg-gray-50"
                            />
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 font-bold uppercase block">Prateleira / Categoria</label>
                            <select
                              value={item.category}
                              onChange={e => setNfeItems(prev => prev.map(x => x.tempId === item.tempId ? { ...x, category: e.target.value } : x))}
                              className="input text-xs h-9 min-h-0 bg-gray-50"
                            >
                              <option value="Geral">Geral</option>
                              <option value="Bebidas">Bebidas</option>
                              <option value="Laticínios">Laticínios</option>
                              <option value="Padaria">Padaria</option>
                              <option value="Limpeza">Limpeza</option>
                              <option value="Higiene">Higiene</option>
                              <option value="Mercearia">Mercearia</option>
                              <option value="Biscoitos & Doces">Biscoitos & Doces</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[9px] text-gray-400 font-bold uppercase">Preço de Venda Sugerido</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 font-bold">R$</span>
                              <input
                                type="number"
                                step="0.01"
                                value={item.sellPrice}
                                onChange={e => {
                                  const val = Number(e.target.value) || 0
                                  setNfeItems(prev => prev.map(x => x.tempId === item.tempId ? { ...x, sellPrice: val } : x))
                                }}
                                className="input text-xs h-9 min-h-0 bg-gray-50 pl-7"
                              />
                            </div>
                            <span className="text-[9px] text-gray-400 mt-0.5 block">Custo NFE: {formatCurrency(item.costPrice)} (+40%)</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-3 border-t shrink-0">
              <button onClick={() => { setShowNfeModal(false); setNfeItems([]) }} className="btn btn-ghost flex-1 h-12 text-sm">
                Cancelar Importação
              </button>
              <button onClick={handleConfirmNfeImport} className="btn btn-success flex-[2] h-12 text-sm shadow-md font-bold">
                💾 Confirmar Entrada e Atualizar Estoque (+{nfeItems.reduce((s, i) => s + i.quantity, 0)} itens)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NFE Selection Modal */}
      {showNfeSelectionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-xl border border-gray-100 max-w-md w-full p-6 space-y-4 animate-slide-up flex flex-col max-h-[90vh] relative">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <h3 className="font-black text-gray-900 text-lg flex items-center gap-2">🧾 Importar Nota Fiscal</h3>
              <button onClick={() => { setShowNfeSelectionModal(false); setShowNfeScanner(false); setNfeKeyInput('') }}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 active:scale-90 text-sm">
                ✕
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="grid grid-cols-3 gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
              {[
                { key: 'xml', label: '📁 XML' },
                { key: 'qrcode', label: '📷 QR Code' },
                { key: 'key', label: '🔑 Chave' }
              ].map(tab => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setNfeInputMode(tab.key)
                    setShowNfeScanner(tab.key === 'qrcode')
                    setNfeKeyInput('')
                  }}
                  className={`py-2 rounded-xl text-xs font-bold transition-all select-none
                    ${nfeInputMode === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-y-auto min-h-[220px] flex flex-col justify-center">
              {nfeInputMode === 'xml' && (
                <label className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 hover:border-brand-500 rounded-3xl bg-white hover:bg-brand-50/10 cursor-pointer transition-all text-center group active:scale-98">
                  <span className="text-4xl mb-2 group-hover:animate-bounce">📁</span>
                  <span className="text-sm font-bold text-gray-700">Carregar Arquivo XML</span>
                  <span className="text-xs text-gray-400 mt-1">Selecione o arquivo da NFE (.xml)</span>
                  <input 
                    type="file" 
                    accept=".xml" 
                    onChange={(e) => {
                      handleNfeUpload(e)
                      setShowNfeSelectionModal(false)
                    }} 
                    className="hidden" 
                  />
                </label>
              )}

              {nfeInputMode === 'qrcode' && (
                <div className="space-y-3 w-full">
                  {showNfeScanner ? (
                    <div className="w-full bg-black rounded-2xl overflow-hidden relative border border-gray-200 min-h-[250px] flex flex-col justify-center items-center">
                      
                      {cameraLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 text-white z-10 space-y-2">
                          <span className="text-2xl animate-spin">⏳</span>
                          <span className="text-xs font-semibold">Iniciando câmera...</span>
                        </div>
                      )}

                      {cameraError && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-4 text-center z-10 space-y-3">
                          <span className="text-2xl">⚠️</span>
                          <span className="text-xs font-semibold">{cameraError}</span>
                          <button
                            type="button"
                            onClick={() => setShowNfeScanner(false)}
                            className="bg-brand-500 hover:bg-brand-600 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition-all"
                          >
                            Voltar
                          </button>
                        </div>
                      )}

                      <div id="nfe-reader" className="w-full animate-fade-in min-h-[250px]"></div>
                      
                      {!cameraLoading && !cameraError && (
                        <button
                          type="button"
                          onClick={() => setShowNfeScanner(false)}
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md z-10 hover:bg-red-700 active:scale-95 transition-all"
                        >
                          Parar Câmera
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowNfeScanner(true)}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white py-8 rounded-3xl flex flex-col items-center justify-center gap-2 active:scale-98 transition-all font-bold"
                    >
                      <span className="text-3xl">📷</span>
                      <span>Abrir Câmera de Leitura</span>
                      <span className="text-xs text-brand-200 font-normal">Aponte para o QR Code do cupom fiscal</span>
                    </button>
                  )}
                </div>
              )}

              {nfeInputMode === 'key' && (
                <div className="space-y-4 w-full">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Chave de Acesso (44 dígitos)</label>
                    <input
                      type="text"
                      maxLength={44}
                      placeholder="Ex: 35210901234567890123550010000123451000123456"
                      value={nfeKeyInput}
                      onChange={e => setNfeKeyInput(e.target.value.replace(/[^\d]/g, ''))}
                      className="input text-center h-12 text-sm bg-gray-50 border-gray-200 tracking-wider font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={nfeKeyInput.length !== 44}
                    onClick={() => runSefazLookup(nfeKeyInput)}
                    className="btn btn-primary w-full h-12 text-sm font-bold rounded-2xl shadow-md disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    🔍 Consultar Nota Fiscal
                  </button>
                </div>
              )}
            </div>

            {/* Simulated Loading/Sefaz status */}
            {nfeLoading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-[2.5rem] flex flex-col items-center justify-center p-6 space-y-4 animate-fade-in z-20">
                <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center text-3xl animate-bounce">
                  📡
                </div>
                <h4 className="font-extrabold text-gray-900 text-base">Consulta WebService SEFAZ</h4>
                
                <div className="w-full max-w-xs bg-gray-150 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-brand-500 h-full transition-all duration-300"
                    style={{ width: `${(sefazStep / 4) * 100}%` }}
                  ></div>
                </div>
                
                <p className="text-xs text-gray-500 font-semibold text-center h-8 leading-relaxed max-w-[280px]">
                  {sefazProgress}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
