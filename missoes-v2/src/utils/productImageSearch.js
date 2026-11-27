/**
 * Multi-Engine Resilient Product Image Search (100% CORS-native, zero API keys or broken proxies)
 * Combines:
 *  1. OpenFoodFacts Search v3 (food & beverages, ~500ms, native CORS)
 *  2. OpenFoodFacts Brasil (Brazilian barcode catalog, CORS: *)
 *  3. OpenProductsFacts & OpenBeautyFacts (cleaning, household, hygiene, CORS: *)
 *  4. Wikimedia Commons & PT Wikipedia PageImages (fresh bakery, produce, dishes, CORS: *)
 *  5. Automatic smart query fallback (strips weights like 5KG/2L/500ML or brand suffixes if exact query has <4 results)
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
  if (
    lower.endsWith('.svg') ||
    lower.endsWith('.pdf') ||
    lower.endsWith('.tif') ||
    lower.endsWith('.tiff') ||
    lower.endsWith('.ogg') ||
    lower.endsWith('.webm')
  ) {
    return false
  }
  return true
}

export function simplifyProductQuery(rawQuery) {
  const cleaned = String(rawQuery || '')
    .replace(/\b\d+([.,]\d+)?\s*(kg|g|mg|ml|l|lt|lts|un|und|unid|pct|cx|fd|pack)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return cleaned || String(rawQuery || '').trim()
}

// Engine 1: OpenFoodFacts Search-a-licious v3 (Fastest ~500ms, great product front photos)
async function searchOpenFoodFactsElastic(queryText) {
  const q = encodeURIComponent(queryText.trim())
  const url = `https://search.openfoodfacts.org/search?q=${q}&langs=pt&page_size=24&fields=product_name,product_name_pt,brands,countries_tags,image_front_url,image_front_small_url,image_url`
  const res = await fetchWithTimeout(url, 4500)
  if (!res.ok) return []
  const data = await res.json()
  const hits = Array.isArray(data?.hits) ? data.hits : []

  return hits
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
        score: (isBr ? 25 : 0) + (item.product_name_pt ? 12 : 0) + (item.image_front_url ? 5 : 0)
      }
    })
    .filter(Boolean)
}

// Engine 2: OpenFoodFacts Brasil / OpenProductsFacts / OpenBeautyFacts CGI (CORS: *)
async function searchOpenFactsCgi(domain, queryText, baseScore = 22) {
  const q = encodeURIComponent(queryText.trim())
  const url = `https://${domain}/cgi/search.pl?search_terms=${q}&search_simple=1&action=process&json=1&page_size=16&fields=product_name,brands,image_front_url,image_front_small_url,image_url`
  const res = await fetchWithTimeout(url, 4500)
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
        score: baseScore
      }
    })
    .filter(Boolean)
}

// Engine 3: Wikimedia Commons Media API (Fresh bakery items, fruits, drinks, non-packaged items)
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
        score: isPng ? 14 : 7
      }
    })
    .filter(Boolean)
}

// Engine 4: Portuguese Wikipedia PageImages (Brazilian foods like Pão de Queijo, Coxinha, Brigadeiro)
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
        score: 9
      }
    })
    .filter(Boolean)
}

async function runMultiSourceBatch(term) {
  const settled = await Promise.allSettled([
    searchOpenFoodFactsElastic(term),
    searchOpenFactsCgi('br.openfoodfacts.org', term, 26),
    searchOpenFactsCgi('world.openproductsfacts.org', term, 18),
    searchOpenFactsCgi('world.openbeautyfacts.org', term, 16),
    searchWikimediaCommons(term),
    searchPtWikipediaImages(term)
  ])

  const combined = []
  settled.forEach(res => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      combined.push(...res.value)
    }
  })
  return combined
}

export async function searchProductImages(queryText, maxResults = 24) {
  const raw = String(queryText || '').trim()
  if (!raw) return []

  const simplified = simplifyProductQuery(raw)
  let combined = await runMultiSourceBatch(simplified)

  // Smart fallback: if multi-word query had <4 hits (e.g. "DETERGENTE YPE 500ML"), also search first main keyword ("DETERGENTE")
  const words = simplified.split(' ').filter(w => w.length >= 3)
  if (combined.length < 4 && words.length > 1) {
    const fallbackItems = await runMultiSourceBatch(words[0])
    combined = [...combined, ...fallbackItems]
  }

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
          title: item.title || raw
        })
      }
    })

  return unique.slice(0, maxResults)
}
