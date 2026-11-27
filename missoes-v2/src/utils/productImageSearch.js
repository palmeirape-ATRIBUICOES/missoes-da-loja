/**
 * Multi-Engine Resilient Product Image Search (100% CORS-native, zero API keys or broken proxies)
 * Combines OpenFoodFacts Elastic v3, OpenFoodFacts Brasil, Wikimedia Commons, and PT Wikipedia PageImages
 * in parallel with strict per-source timeouts so slow sources never hang the UI.
 */

function fetchWithTimeout(url, timeoutMs = 4500) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timer))
}

function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  const lower = url.toLowerCase()
  if (lower.endsWith('.svg') || lower.endsWith('.pdf') || lower.endsWith('.tif') || lower.endsWith('.tiff') || lower.endsWith('.ogg') || lower.endsWith('.webm')) {
    return false
  }
  return true
}

// Engine 1: OpenFoodFacts Search-a-licious v3 (Fastest ~500ms, great product front photos)
async function searchOpenFoodFactsElastic(queryText) {
  const q = encodeURIComponent(queryText.trim())
  const url = `https://search.openfoodfacts.org/search?q=${q}&langs=pt&page_size=24&fields=product_name,product_name_pt,brands,countries_tags,image_front_url,image_front_small_url,image_url`
  const res = await fetchWithTimeout(url, 4500)
  if (!res.ok) return []
  const data = await res.json()
  const hits = Array.isArray(data?.hits) ? data.hits : []

  // Prioritize Brazilian & Portuguese-named products first
  const scored = hits
    .map(item => {
      const fullUrl = item.image_front_url || item.image_url || ''
      const thumbUrl = item.image_front_small_url || fullUrl
      if (!isValidImageUrl(fullUrl)) return null
      const countries = Array.isArray(item.countries_tags) ? item.countries_tags : []
      const isBr = countries.some(c => String(c).includes('brazil') || String(c).includes('brasil'))
      const title = item.product_name_pt || item.product_name || queryText
      const brand = Array.isArray(item.brands) ? item.brands[0]?.replace(/^xx:/, '') : (item.brands || '')
      return {
        url: fullUrl,
        thumbnail: thumbUrl,
        title: brand ? `${title} (${brand})` : title,
        score: (isBr ? 20 : 0) + (item.product_name_pt ? 10 : 0) + (item.image_front_url ? 5 : 0)
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)

  return scored
}

// Engine 2: OpenFoodFacts Brasil CGI (Rich catalog of Brazilian supermarket barcodes/brands)
async function searchOpenFoodFactsBrasil(queryText) {
  const q = encodeURIComponent(queryText.trim())
  const url = `https://br.openfoodfacts.org/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=20&fields=product_name,brands,image_front_url,image_front_small_url,image_url`
  const res = await fetchWithTimeout(url, 5000)
  if (!res.ok) return []
  const data = await res.json()
  const products = Array.isArray(data?.products) ? data.products : []

  return products
    .map(item => {
      const fullUrl = item.image_front_url || item.image_url || ''
      const thumbUrl = item.image_front_small_url || fullUrl
      if (!isValidImageUrl(fullUrl)) return null
      const title = item.product_name || queryText
      const brand = item.brands ? String(item.brands).split(',')[0].trim() : ''
      return {
        url: fullUrl,
        thumbnail: thumbUrl,
        title: brand ? `${title} (${brand})` : title,
        score: 25
      }
    })
    .filter(Boolean)
}

// Engine 3: Wikimedia Commons Media API (Great for fresh bakery items, fruits, drinks, non-packaged items)
async function searchWikimediaCommons(queryText) {
  const q = encodeURIComponent(`${queryText.trim()} filetype:bitmap`)
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrnamespace=6&gsrlimit=14&prop=imageinfo&iiprop=url|mime&iiurlwidth=400&format=json&origin=*`
  const res = await fetchWithTimeout(url, 4000)
  if (!res.ok) return []
  const data = await res.json()
  const pages = data?.query?.pages ? Object.values(data.query.pages) : []

  return pages
    .map(page => {
      const info = page?.imageinfo?.[0]
      if (!info) return null
      const mime = String(info.mime || '').toLowerCase()
      if (mime && !mime.startsWith('image/jpeg') && !mime.startsWith('image/png') && !mime.startsWith('image/webp')) {
        return null
      }
      const fullUrl = info.thumburl || info.url || ''
      const thumbUrl = info.thumburl || fullUrl
      if (!isValidImageUrl(fullUrl)) return null
      const cleanTitle = String(page.title || '').replace(/^File:/i, '').replace(/\.[^.]+$/, '')
      const isPng = mime.includes('png') || fullUrl.toLowerCase().includes('.png')
      return {
        url: fullUrl,
        thumbnail: thumbUrl,
        title: cleanTitle || queryText,
        score: isPng ? 12 : 6
      }
    })
    .filter(Boolean)
}

// Engine 4: Portuguese Wikipedia PageImages (Great for Brazilian foods like Pão de Queijo, Coxinha, Brigadeiro)
async function searchPtWikipediaImages(queryText) {
  const q = encodeURIComponent(queryText.trim())
  const url = `https://pt.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${q}&gsrlimit=8&prop=pageimages&piprop=original|thumbnail&pithumbsize=400&format=json&origin=*`
  const res = await fetchWithTimeout(url, 3500)
  if (!res.ok) return []
  const data = await res.json()
  const pages = data?.query?.pages ? Object.values(data.query.pages) : []

  return pages
    .map(page => {
      const thumbUrl = page?.thumbnail?.source || ''
      const fullUrl = thumbUrl || page?.original?.source || ''
      if (!isValidImageUrl(fullUrl)) return null
      return {
        url: fullUrl,
        thumbnail: thumbUrl || fullUrl,
        title: page.title || queryText,
        score: 8
      }
    })
    .filter(Boolean)
}

export async function searchProductImages(queryText, maxResults = 21) {
  const cleaned = String(queryText || '').trim()
  if (!cleaned) return []

  const settled = await Promise.allSettled([
    searchOpenFoodFactsBrasil(cleaned),
    searchOpenFoodFactsElastic(cleaned),
    searchWikimediaCommons(cleaned),
    searchPtWikipediaImages(cleaned)
  ])

  const combined = []
  settled.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      combined.push(...res.value)
    }
  })

  // Deduplicate by normalized image URL and sort by relevance score
  const seen = new Set()
  const unique = []
  combined
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .forEach(item => {
      const key = item.url.split('?')[0]
      if (!seen.has(key)) {
        seen.add(key)
        unique.push({
          url: item.url,
          thumbnail: item.thumbnail || item.url,
          title: item.title || cleaned
        })
      }
    })

  return unique.slice(0, maxResults)
}
