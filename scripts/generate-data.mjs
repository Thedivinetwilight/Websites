/**
 * Theru — demo dataset generator.
 *
 * Every business record below is synthetic. The generator is seeded and
 * deterministic so the demo workspace always looks the same. District names,
 * localities and the map geometry are real; the companies and people are not.
 *
 *   node scripts/generate-data.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const DATA_DIR = path.join(ROOT, 'src', 'data')

/* ------------------------------------------------------------------ */
/* seeded randomness                                                   */
/* ------------------------------------------------------------------ */

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(20261101)
const pick = (arr) => arr[Math.floor(rand() * arr.length)]
const pickWeighted = (entries) => {
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rand() * total
  for (const [value, w] of entries) {
    r -= w
    if (r <= 0) return value
  }
  return entries[entries.length - 1][0]
}
const int = (min, max) => Math.floor(rand() * (max - min + 1)) + min
const chance = (p) => rand() < p
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n))
const round = (n, d = 0) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}
const shuffle = (arr) => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const TODAY = new Date('2026-11-01T06:30:00+05:30')

/* ------------------------------------------------------------------ */
/* districts                                                           */
/* ------------------------------------------------------------------ */

const DISTRICTS = [
  {
    name: 'Chennai', region: 'North', weight: 30, growth: 12.4, tier: 1, std: '44',
    character: 'The state’s densest market. Services, finance and B2B software buyers sit within a five-kilometre radius.',
    localities: ['T. Nagar', 'Anna Nagar', 'Nungambakkam', 'Guindy', 'Mylapore', 'Velachery', 'Porur', 'Perungudi', 'Ambattur', 'Adyar'],
    sectors: [['IT & Professional Services', 26], ['Retail & Distribution', 15], ['Healthcare & Diagnostics', 13], ['Logistics & Warehousing', 10], ['Hospitality & Tourism', 9], ['Textiles & Apparel', 8], ['Building Materials & Construction', 7], ['Education & Training', 6], ['Chemicals & Plastics', 4], ['Energy & Solar', 2]],
  },
  {
    name: 'Coimbatore', region: 'West', weight: 19, growth: 10.1, tier: 1, std: '422',
    character: 'Engineering capital of the west. Pumps, precision components and exporters with real purchasing power.',
    localities: ['RS Puram', 'Gandhipuram', 'Peelamedu', 'Saibaba Colony', 'Singanallur', 'Kurichi', 'Avinashi Road', 'SIDCO'],
    sectors: [['Auto Components & Engineering', 30], ['Textiles & Apparel', 20], ['Healthcare & Diagnostics', 10], ['IT & Professional Services', 9], ['Food Processing & Agri', 8], ['Chemicals & Plastics', 6], ['Education & Training', 6], ['Retail & Distribution', 6], ['Building Materials & Construction', 3], ['Energy & Solar', 2]],
  },
  {
    name: 'Madurai', region: 'South', weight: 15, growth: 8.6, tier: 1, std: '452',
    character: 'The southern hub. Healthcare, education and trading businesses with multi-district reach.',
    localities: ['Anna Nagar', 'KK Nagar', 'Goripalayam', 'Tallakulam', 'Thirunagar', 'Bypass Road', 'Simmakkal'],
    sectors: [['Healthcare & Diagnostics', 22], ['Retail & Distribution', 16], ['Education & Training', 15], ['Hospitality & Tourism', 12], ['Food Processing & Agri', 9], ['Textiles & Apparel', 8], ['IT & Professional Services', 6], ['Logistics & Warehousing', 5], ['Auto Components & Engineering', 4], ['Energy & Solar', 3]],
  },
  {
    name: 'Tiruppur', region: 'West', weight: 13, growth: 13.8, tier: 1, std: '421',
    character: 'Knitwear country. Export-led units with fast cycles and a strong appetite for working capital.',
    localities: ['Avinashi Road', 'Dharapuram Road', 'Mangalam', 'Kangeyam Road', 'Nallur', 'SIDCO', 'Anupparpalayam'],
    sectors: [['Textiles & Apparel', 56], ['Logistics & Warehousing', 10], ['Auto Components & Engineering', 8], ['Chemicals & Plastics', 7], ['Food Processing & Agri', 5], ['Healthcare & Diagnostics', 4], ['IT & Professional Services', 3], ['Energy & Solar', 4], ['Retail & Distribution', 3]],
  },
  {
    name: 'Salem', region: 'West', weight: 11, growth: 7.9, tier: 2, std: '427',
    character: 'Steel, textiles and mango country. Steady mid-market companies around the Omalur corridor.',
    localities: ['Fairlands', 'Hasthampatti', 'Five Roads', 'Suramangalam', 'Omalur Main Road', 'Ammapet'],
    sectors: [['Auto Components & Engineering', 20], ['Textiles & Apparel', 17], ['Food Processing & Agri', 15], ['Healthcare & Diagnostics', 11], ['Retail & Distribution', 10], ['Building Materials & Construction', 8], ['Chemicals & Plastics', 7], ['Education & Training', 6], ['Logistics & Warehousing', 4], ['Energy & Solar', 2]],
  },
  {
    name: 'Tiruchirappalli', region: 'Central', weight: 10, growth: 8.9, tier: 2, std: '431',
    character: 'Central Tamil Nadu’s services and fabrication base, anchored by BHEL-linked suppliers.',
    localities: ['Thillai Nagar', 'Srirangam', 'Cantonment', 'KK Nagar', 'Puthur', 'Ariyamangalam'],
    sectors: [['Auto Components & Engineering', 24], ['Healthcare & Diagnostics', 14], ['Retail & Distribution', 13], ['Education & Training', 11], ['Food Processing & Agri', 9], ['Hospitality & Tourism', 8], ['Textiles & Apparel', 7], ['IT & Professional Services', 6], ['Logistics & Warehousing', 5], ['Energy & Solar', 3]],
  },
  {
    name: 'Erode', region: 'West', weight: 9, growth: 9.2, tier: 2, std: '424',
    character: 'Textiles, turmeric and transport. Family-run units modernising quickly.',
    localities: ['Perundurai Road', 'Surampatti', 'Brough Road', 'Veerappanchatram', 'Bhavani', 'Moolapalayam'],
    sectors: [['Textiles & Apparel', 34], ['Food Processing & Agri', 16], ['Logistics & Warehousing', 12], ['Auto Components & Engineering', 10], ['Healthcare & Diagnostics', 7], ['Retail & Distribution', 8], ['Chemicals & Plastics', 5], ['Building Materials & Construction', 4], ['Education & Training', 4]],
  },
  {
    name: 'Vellore', region: 'North', weight: 8, growth: 7.2, tier: 2, std: '416',
    character: 'Leather, healthcare and education. A young, mobile workforce around Katpadi.',
    localities: ['Katpadi', 'Gandhi Nagar', 'Sathuvachari', 'Thorapadi', 'Bagayam', 'Officer’s Line'],
    sectors: [['Healthcare & Diagnostics', 20], ['Education & Training', 15], ['Textiles & Apparel', 14], ['Auto Components & Engineering', 11], ['Retail & Distribution', 10], ['Chemicals & Plastics', 8], ['Food Processing & Agri', 7], ['Building Materials & Construction', 6], ['IT & Professional Services', 5], ['Energy & Solar', 4]],
  },
  {
    name: 'Tirunelveli', region: 'South', weight: 8, growth: 6.8, tier: 2, std: '462',
    character: 'Agri-processing and education, with strong distribution networks into the southern districts.',
    localities: ['Palayamkottai', 'Junction', 'Vannarpettai', 'Melapalayam', 'Tirunelveli Town'],
    sectors: [['Food Processing & Agri', 22], ['Retail & Distribution', 16], ['Healthcare & Diagnostics', 14], ['Education & Training', 13], ['Textiles & Apparel', 9], ['Auto Components & Engineering', 7], ['Building Materials & Construction', 7], ['Logistics & Warehousing', 5], ['Hospitality & Tourism', 4], ['Energy & Solar', 3]],
  },
  {
    name: 'Thanjavur', region: 'Central', weight: 7, growth: 6.4, tier: 2, std: '4362',
    character: 'The delta’s agri and temple-tourism economy. Food brands and hospitality are the quiet growth story.',
    localities: ['Medical College Road', 'Nanjikottai Road', 'East Gate', 'Rajagopal Nagar', 'Kumbakonam Road'],
    sectors: [['Food Processing & Agri', 28], ['Hospitality & Tourism', 15], ['Retail & Distribution', 14], ['Healthcare & Diagnostics', 11], ['Education & Training', 10], ['Textiles & Apparel', 7], ['Building Materials & Construction', 6], ['Auto Components & Engineering', 5], ['Energy & Solar', 4]],
  },
  {
    name: 'Kancheepuram', region: 'North', weight: 7, growth: 11.5, tier: 1, std: '44',
    character: 'Silk, temples and the western Chennai spill-over. Buyers here move between city and town.',
    localities: ['Ennaikaran', 'Pillaiyarpalayam', 'Orikkai', 'Sriperumbudur', 'Uthiramerur'],
    sectors: [['Textiles & Apparel', 30], ['Auto Components & Engineering', 18], ['Retail & Distribution', 12], ['Building Materials & Construction', 9], ['Healthcare & Diagnostics', 8], ['Education & Training', 7], ['Logistics & Warehousing', 6], ['IT & Professional Services', 5], ['Food Processing & Agri', 5]],
  },
  {
    name: 'Chengalpattu', region: 'North', weight: 7, growth: 16.2, tier: 1, std: '44',
    character: 'The fastest-growing industrial belt in the state. Mahindra World City and the GST Road corridor.',
    localities: ['GST Road', 'Mahindra World City', 'Thirukazhukundram', 'Maraimalai Nagar', 'Padappai'],
    sectors: [['Auto Components & Engineering', 26], ['IT & Professional Services', 17], ['Logistics & Warehousing', 14], ['Building Materials & Construction', 11], ['Chemicals & Plastics', 9], ['Healthcare & Diagnostics', 7], ['Retail & Distribution', 6], ['Textiles & Apparel', 5], ['Energy & Solar', 5]],
  },
  {
    name: 'Thiruvallur', region: 'North', weight: 7, growth: 13.1, tier: 1, std: '44',
    character: 'Auto clusters in Avadi and Sriperumbudur, plus one of the state’s largest warehousing catchments.',
    localities: ['Avadi', 'Pattabiram', 'Tiruvallur Town', 'Ponneri', 'Tiruttani'],
    sectors: [['Auto Components & Engineering', 32], ['Logistics & Warehousing', 17], ['Building Materials & Construction', 10], ['Chemicals & Plastics', 9], ['Retail & Distribution', 8], ['Textiles & Apparel', 7], ['Food Processing & Agri', 6], ['Healthcare & Diagnostics', 5], ['Energy & Solar', 6]],
  },
  {
    name: 'Krishnagiri', region: 'West', weight: 6, growth: 14.5, tier: 2, std: '4343',
    character: 'Hosur’s auto and electronics supplier belt, feeding two state capitals.',
    localities: ['Hosur', 'Krishnagiri Town', 'Bargur', 'Denkanikottai', 'Shoolagiri'],
    sectors: [['Auto Components & Engineering', 38], ['Chemicals & Plastics', 13], ['Logistics & Warehousing', 12], ['Textiles & Apparel', 9], ['Food Processing & Agri', 8], ['Retail & Distribution', 7], ['Building Materials & Construction', 6], ['Energy & Solar', 4], ['IT & Professional Services', 3]],
  },
  {
    name: 'Dindigul', region: 'South', weight: 6, growth: 7.5, tier: 3, std: '451',
    character: 'Locks, leather and textiles in a tight mid-market. Practical, price-aware buyers.',
    localities: ['Nagal Nagar', 'RM Colony', 'Palani Road', 'Batlagundu', 'Dindigul Town'],
    sectors: [['Textiles & Apparel', 22], ['Auto Components & Engineering', 18], ['Food Processing & Agri', 15], ['Chemicals & Plastics', 10], ['Retail & Distribution', 10], ['Healthcare & Diagnostics', 8], ['Building Materials & Construction', 7], ['Education & Training', 5], ['Logistics & Warehousing', 5]],
  },
  {
    name: 'Namakkal', region: 'West', weight: 5, growth: 8.1, tier: 3, std: '4286',
    character: 'Poultry, trucks and lorry finance. High transaction volume, thin margins.',
    localities: ['Mohanur Road', 'Salem Road', 'Namakkal Town', 'Rasipuram', 'Tiruchengode'],
    sectors: [['Logistics & Warehousing', 30], ['Food Processing & Agri', 22], ['Auto Components & Engineering', 15], ['Retail & Distribution', 10], ['Textiles & Apparel', 7], ['Healthcare & Diagnostics', 6], ['Building Materials & Construction', 5], ['Chemicals & Plastics', 5]],
  },
  {
    name: 'Karur', region: 'Central', weight: 5, growth: 9.4, tier: 2, std: '4324',
    character: 'Home textiles and bus-body building, with exporters who think in container loads.',
    localities: ['Thanthonimalai', 'Vengamedu', 'Kovai Road', 'Gandhi Nagar', 'Karur Town'],
    sectors: [['Textiles & Apparel', 42], ['Auto Components & Engineering', 16], ['Logistics & Warehousing', 10], ['Chemicals & Plastics', 8], ['Food Processing & Agri', 8], ['Retail & Distribution', 6], ['Healthcare & Diagnostics', 5], ['Energy & Solar', 5]],
  },
  {
    name: 'Virudhunagar', region: 'South', weight: 6, growth: 8.8, tier: 3, std: '4562',
    character: 'Sivakasi’s printing and fireworks clusters; Rajapalayam’s textile families.',
    localities: ['Sivakasi', 'Sattur', 'Rajapalayam', 'Srivilliputhur', 'Virudhunagar Town', 'Aruppukkottai'],
    sectors: [['Chemicals & Plastics', 25], ['Textiles & Apparel', 22], ['Auto Components & Engineering', 12], ['Logistics & Warehousing', 10], ['Food Processing & Agri', 9], ['Retail & Distribution', 8], ['Healthcare & Diagnostics', 6], ['Building Materials & Construction', 5], ['Energy & Solar', 3]],
  },
  {
    name: 'Kanyakumari', region: 'South', weight: 5, growth: 6.2, tier: 3, std: '4652',
    character: 'Rubber, fishing and tourism at the tip of the peninsula. Small firms, long relationships.',
    localities: ['Nagercoil', 'Marthandam', 'Padmanabhapuram', 'Colachel', 'Kanyakumari Town'],
    sectors: [['Food Processing & Agri', 22], ['Hospitality & Tourism', 18], ['Textiles & Apparel', 13], ['Chemicals & Plastics', 12], ['Retail & Distribution', 10], ['Healthcare & Diagnostics', 8], ['Education & Training', 7], ['Logistics & Warehousing', 5], ['Energy & Solar', 5]],
  },
  {
    name: 'Nilgiris', region: 'West', weight: 4, growth: 5.6, tier: 3, std: '423',
    character: 'Tea, hospitality and boutique retail in the hills. High-value, low-volume customers.',
    localities: ['Udhagamandalam', 'Coonoor', 'Kotagiri', 'Gudalur'],
    sectors: [['Hospitality & Tourism', 30], ['Food Processing & Agri', 26], ['Retail & Distribution', 12], ['Textiles & Apparel', 8], ['Healthcare & Diagnostics', 7], ['Education & Training', 5], ['Building Materials & Construction', 5], ['Energy & Solar', 4], ['IT & Professional Services', 3]],
  },
  {
    name: 'Thoothukkudi', region: 'South', weight: 5, growth: 7.1, tier: 3, std: '461',
    character: 'Port-led industry and salt. Logistics demand spikes with every shipping cycle.',
    localities: ['Thoothukkudi Town', 'Kovilpatti', 'Tiruchendur', 'Kayalpattinam', 'Ettayapuram'],
    sectors: [['Logistics & Warehousing', 24], ['Chemicals & Plastics', 18], ['Food Processing & Agri', 15], ['Auto Components & Engineering', 10], ['Textiles & Apparel', 9], ['Healthcare & Diagnostics', 8], ['Retail & Distribution', 8], ['Energy & Solar', 5], ['Building Materials & Construction', 3]],
  },
  {
    name: 'Cuddalore', region: 'Central', weight: 5, growth: 6.9, tier: 3, std: '4142',
    character: 'Chemical and power corridors around Neyveli, with a strong agri base inland.',
    localities: ['Chidambaram', 'Panruti', 'Vridhachalam', 'Neyveli', 'Cuddalore Town'],
    sectors: [['Chemicals & Plastics', 30], ['Food Processing & Agri', 18], ['Textiles & Apparel', 10], ['Auto Components & Engineering', 9], ['Retail & Distribution', 9], ['Healthcare & Diagnostics', 7], ['Logistics & Warehousing', 7], ['Energy & Solar', 6], ['Building Materials & Construction', 4]],
  },
  {
    name: 'Viluppuram', region: 'North', weight: 4, growth: 7.7, tier: 3, std: '4146',
    character: 'A crossroads district. Distribution and transport businesses that serve three neighbouring regions.',
    localities: ['Villupuram Town', 'Tindivanam', 'Marakkanam', 'Gingee'],
    sectors: [['Retail & Distribution', 22], ['Logistics & Warehousing', 20], ['Food Processing & Agri', 15], ['Textiles & Apparel', 9], ['Auto Components & Engineering', 8], ['Healthcare & Diagnostics', 7], ['Building Materials & Construction', 7], ['Chemicals & Plastics', 6], ['Energy & Solar', 6]],
  },
  {
    name: 'Sivaganga', region: 'South', weight: 4, growth: 6.1, tier: 3, std: '4575',
    character: 'Karaikudi’s trading families and the region’s food brands. Relationship-first selling.',
    localities: ['Karaikudi', 'Sivaganga Town', 'Devakottai', 'Manamadurai'],
    sectors: [['Food Processing & Agri', 25], ['Retail & Distribution', 20], ['Textiles & Apparel', 11], ['Healthcare & Diagnostics', 10], ['Building Materials & Construction', 8], ['Education & Training', 7], ['Auto Components & Engineering', 7], ['Logistics & Warehousing', 6], ['Hospitality & Tourism', 6]],
  },
  {
    name: 'Ramanathapuram', region: 'South', weight: 3, growth: 5.4, tier: 3, std: '4567',
    character: 'Coastal trade and pilgrimage tourism. Seasonal peaks, loyal repeat buyers.',
    localities: ['Rameswaram', 'Paramakudi', 'Ramanathapuram Town', 'Keelakarai'],
    sectors: [['Hospitality & Tourism', 24], ['Food Processing & Agri', 22], ['Retail & Distribution', 14], ['Textiles & Apparel', 9], ['Healthcare & Diagnostics', 8], ['Logistics & Warehousing', 8], ['Building Materials & Construction', 7], ['Energy & Solar', 8]],
  },
  {
    name: 'Pudukkottai', region: 'Central', weight: 4, growth: 6.3, tier: 3, std: '4322',
    character: 'Agri trading and cement. A margin-sensitive market with room for fintech products.',
    localities: ['Pudukkottai Town', 'Aranthangi', 'Ponnamaravathi', 'Illuppur'],
    sectors: [['Food Processing & Agri', 26], ['Retail & Distribution', 17], ['Building Materials & Construction', 14], ['Textiles & Apparel', 9], ['Auto Components & Engineering', 8], ['Healthcare & Diagnostics', 8], ['Chemicals & Plastics', 6], ['Logistics & Warehousing', 6], ['Energy & Solar', 6]],
  },
  {
    name: 'Theni', region: 'South', weight: 4, growth: 8.3, tier: 3, std: '4546',
    character: 'Spices, grapes and cardamom. Agri exporters with growing digital adoption.',
    localities: ['Theni Town', 'Periyakulam', 'Bodinayakanur', 'Cumbum'],
    sectors: [['Food Processing & Agri', 40], ['Retail & Distribution', 13], ['Hospitality & Tourism', 11], ['Textiles & Apparel', 8], ['Healthcare & Diagnostics', 7], ['Auto Components & Engineering', 6], ['Logistics & Warehousing', 6], ['Building Materials & Construction', 5], ['Energy & Solar', 4]],
  },
  {
    name: 'Tenkasi', region: 'South', weight: 3, growth: 5.9, tier: 3, std: '4633',
    character: 'Falls, temples and textile finishing units. Small market, quick decisions.',
    localities: ['Tenkasi Town', 'Shenkottai', 'Alangulam', 'Sivagiri'],
    sectors: [['Textiles & Apparel', 24], ['Food Processing & Agri', 19], ['Hospitality & Tourism', 14], ['Retail & Distribution', 12], ['Healthcare & Diagnostics', 8], ['Auto Components & Engineering', 7], ['Building Materials & Construction', 6], ['Logistics & Warehousing', 5], ['Energy & Solar', 5]],
  },
  {
    name: 'Tiruvannamalai', region: 'North', weight: 4, growth: 6.7, tier: 3, std: '4175',
    character: 'Pilgrimage economy and silk weaving. Strong seasonal hospitality demand.',
    localities: ['Tiruvannamalai Town', 'Arni', 'Polur', 'Cheyyar'],
    sectors: [['Textiles & Apparel', 24], ['Hospitality & Tourism', 18], ['Food Processing & Agri', 14], ['Retail & Distribution', 12], ['Healthcare & Diagnostics', 8], ['Building Materials & Construction', 7], ['Auto Components & Engineering', 6], ['Energy & Solar', 6], ['Education & Training', 5]],
  },
  {
    name: 'Kallakurichi', region: 'North', weight: 3, growth: 7.4, tier: 3, std: '4151',
    character: 'Agri-processing and textiles along the Salem–Chennai corridor.',
    localities: ['Kallakurichi Town', 'Sankarapuram', 'Chinnasalem'],
    sectors: [['Food Processing & Agri', 25], ['Textiles & Apparel', 18], ['Retail & Distribution', 13], ['Auto Components & Engineering', 9], ['Building Materials & Construction', 8], ['Healthcare & Diagnostics', 8], ['Chemicals & Plastics', 7], ['Logistics & Warehousing', 6], ['Energy & Solar', 6]],
  },
  {
    name: 'Ariyalur', region: 'Central', weight: 2, growth: 8.0, tier: 3, std: '4329',
    character: 'Cement country. Large industrial buyers and a thin but valuable SME layer.',
    localities: ['Ariyalur Town', 'Jayankondam', 'Sendurai'],
    sectors: [['Building Materials & Construction', 30], ['Food Processing & Agri', 18], ['Chemicals & Plastics', 12], ['Retail & Distribution', 10], ['Textiles & Apparel', 8], ['Logistics & Warehousing', 8], ['Auto Components & Engineering', 6], ['Healthcare & Diagnostics', 4], ['Energy & Solar', 4]],
  },
  {
    name: 'Perambalur', region: 'Central', weight: 2, growth: 5.2, tier: 3, std: '4328',
    character: 'A compact agri market between Trichy and Chennai. Long-cycle, referral-led sales.',
    localities: ['Perambalur Town', 'Kunnam', 'Veppanthattai'],
    sectors: [['Food Processing & Agri', 30], ['Retail & Distribution', 17], ['Building Materials & Construction', 12], ['Textiles & Apparel', 9], ['Auto Components & Engineering', 8], ['Healthcare & Diagnostics', 8], ['Chemicals & Plastics', 7], ['Logistics & Warehousing', 5], ['Energy & Solar', 4]],
  },
  {
    name: 'Dharmapuri', region: 'West', weight: 3, growth: 7.2, tier: 3, std: '4342',
    character: 'Mango, granite and the Hosur spill-over. Good entry point for regional distributors.',
    localities: ['Dharmapuri Town', 'Palacode', 'Harur', 'Pennagaram'],
    sectors: [['Food Processing & Agri', 26], ['Building Materials & Construction', 17], ['Textiles & Apparel', 11], ['Retail & Distribution', 11], ['Auto Components & Engineering', 9], ['Healthcare & Diagnostics', 7], ['Chemicals & Plastics', 6], ['Logistics & Warehousing', 6], ['Energy & Solar', 7]],
  },
  {
    name: 'Nagapattinam', region: 'Central', weight: 3, growth: 5.7, tier: 3, std: '4365',
    character: 'Delta rice, fishing harbours and coastal tourism. Monsoon-sensitive cash cycles.',
    localities: ['Nagapattinam Town', 'Mayiladuthurai', 'Sirkazhi', 'Velankanni'],
    sectors: [['Food Processing & Agri', 30], ['Hospitality & Tourism', 18], ['Retail & Distribution', 14], ['Textiles & Apparel', 8], ['Logistics & Warehousing', 8], ['Healthcare & Diagnostics', 7], ['Building Materials & Construction', 6], ['Auto Components & Engineering', 5], ['Energy & Solar', 4]],
  },
  {
    name: 'Thiruvarur', region: 'Central', weight: 3, growth: 5.5, tier: 3, std: '4366',
    character: 'The rice bowl. Mill owners and agri-input dealers dominate the buyer list.',
    localities: ['Thiruvarur Town', 'Mannargudi', 'Nannilam', 'Kudavasal'],
    sectors: [['Food Processing & Agri', 34], ['Retail & Distribution', 17], ['Textiles & Apparel', 9], ['Building Materials & Construction', 8], ['Auto Components & Engineering', 7], ['Healthcare & Diagnostics', 7], ['Logistics & Warehousing', 7], ['Chemicals & Plastics', 6], ['Energy & Solar', 5]],
  },
  {
    name: 'Ranipet', region: 'North', weight: 5, growth: 10.8, tier: 2, std: '4172',
    character: 'Leather and light engineering, with the Chennai–Bengaluru corridor running through it.',
    localities: ['Ranipet Town', 'Arcot', 'Walajapet', 'Sholinghur'],
    sectors: [['Auto Components & Engineering', 26], ['Chemicals & Plastics', 20], ['Textiles & Apparel', 15], ['Building Materials & Construction', 8], ['Retail & Distribution', 8], ['Logistics & Warehousing', 7], ['Healthcare & Diagnostics', 6], ['Food Processing & Agri', 5], ['Energy & Solar', 5]],
  },
  {
    name: 'Tirupathur', region: 'North', weight: 4, growth: 9.6, tier: 2, std: '4174',
    character: 'Ambur and Vaniyambadi’s leather export cluster. Global buyers, local owners.',
    localities: ['Tirupathur Town', 'Vaniyambadi', 'Ambur', 'Jolarpettai'],
    sectors: [['Textiles & Apparel', 30], ['Chemicals & Plastics', 18], ['Auto Components & Engineering', 13], ['Retail & Distribution', 8], ['Logistics & Warehousing', 8], ['Food Processing & Agri', 7], ['Healthcare & Diagnostics', 6], ['Building Materials & Construction', 6], ['Energy & Solar', 4]],
  },
]

/* ------------------------------------------------------------------ */
/* sectors                                                             */
/* ------------------------------------------------------------------ */

const SECTORS = {
  'Textiles & Apparel': {
    compoundSuffixes: ['Home Textiles', 'Knitted Fabrics', 'Cotton Mills', 'Garment Exports'],
    subs: ['Knitwear', 'Home textiles', 'Spinning', 'Garmenting', 'Fabric processing'],
    suffixes: ['Textiles', 'Spintex', 'Knitwear', 'Fabrics', 'Garments', 'Weaves', 'Apparels', 'Hosiery'],
    cores: ['Knit', 'Spin', 'Weave', 'Tex', 'Fabric', 'Thread', 'Loom'],
    revPerEmpL: 9.5,
    acvL: 3.6,
    roles: ['Managing Director', 'Partner', 'Head of Exports', 'Finance Head'],
  },
  'Auto Components & Engineering': {
    compoundSuffixes: ['Precision Works', 'Pump Industries', 'Auto Components', 'Engineering Works'],
    subs: ['Precision machining', 'Pump manufacturing', 'Sheet metal', 'Foundry', 'Industrial automation'],
    suffixes: ['Precision', 'Pumps', 'Engineering', 'Works', 'Industries', 'Forgings', 'Castings', 'Techno'],
    cores: ['Mech', 'Forge', 'Cast', 'Tool', 'Gear', 'Motion', 'Precise'],
    revPerEmpL: 16,
    acvL: 8.4,
    roles: ['Managing Director', 'Plant Head', 'Director – Sales', 'Purchase Head'],
  },
  'Food Processing & Agri': {
    compoundSuffixes: ['Agro Foods', 'Rice Mills', 'Edible Oils', 'Spice Processors'],
    subs: ['Rice milling', 'Spice processing', 'Dairy', 'Edible oils', 'Snack foods'],
    suffixes: ['Foods', 'Agro Foods', 'Rice Mills', 'Oils', 'Dairy', 'Agro Products', 'Harvest'],
    cores: ['Harvest', 'Farm', 'Mill', 'Natur', 'Grain', 'Spice', 'Fresh'],
    revPerEmpL: 11,
    acvL: 2.9,
    roles: ['Proprietor', 'Managing Partner', 'Director', 'Operations Head'],
  },
  'Healthcare & Diagnostics': {
    compoundSuffixes: ['Diagnostic Centre', 'Health Services', 'Medical Centre', 'Speciality Clinic'],
    subs: ['Multi-specialty care', 'Diagnostics labs', 'Pharmacy retail', 'Dental care', 'Physiotherapy'],
    suffixes: ['Hospitals', 'Diagnostics', 'Health Centre', 'Medicals', 'Clinic', 'Care', 'Labs'],
    cores: ['Care', 'Life', 'Med', 'Health', 'Diag', 'Pulse', 'Cure'],
    revPerEmpL: 10.5,
    acvL: 6.9,
    roles: ['Medical Director', 'Managing Director', 'Hospital Administrator', 'Finance Head'],
  },
  'Education & Training': {
    compoundSuffixes: ['Public School', 'Matriculation School', 'Skill Academy', 'Institute of Technology'],
    subs: ['K-12 schools', 'Engineering colleges', 'Skill training', 'Test prep', 'EdTech'],
    suffixes: ['Academy', 'Institute', 'Vidyalaya', 'Matriculation', 'Training Centre', 'Learning Hub', 'Group'],
    cores: ['Vidhya', 'Learn', 'Skill', 'Gyan', 'Bright', 'Spark', 'Ariv'],
    revPerEmpL: 6.5,
    acvL: 4.2,
    roles: ['Correspondent', 'Director', 'Principal', 'Managing Trustee'],
  },
  'Hospitality & Tourism': {
    compoundSuffixes: ['Resorts & Spa', 'Business Hotel', 'Tourism Services', 'Heritage Stays'],
    subs: ['Business hotels', 'Resorts', 'Wedding venues', 'Travel operators', 'Homestays'],
    suffixes: ['Resorts', 'Hotels', 'Inns', 'Travels', 'Retreat', 'Stays', 'Tours'],
    cores: ['Stay', 'Haven', 'Breeze', 'Horizon', 'Palm', 'Nest', 'Serene'],
    revPerEmpL: 7.2,
    acvL: 3.1,
    roles: ['Managing Director', 'General Manager', 'Owner', 'Revenue Head'],
  },
  'Logistics & Warehousing': {
    compoundSuffixes: ['Transport Services', 'Warehousing Co.', 'Supply Chain', 'Cargo Movers'],
    subs: ['Full-truck load', 'Warehousing', 'Cold chain', 'Last-mile', 'Customs clearing'],
    suffixes: ['Logistics', 'Movers', 'Transport', 'Cargo', 'Warehousing', 'Freight', 'Supply Chain'],
    cores: ['Move', 'Freight', 'Cargo', 'Route', 'Trans', 'Speed', 'Link'],
    revPerEmpL: 14,
    acvL: 5.5,
    roles: ['Managing Director', 'Branch Head', 'Director', 'Fleet Manager'],
  },
  'IT & Professional Services': {
    compoundSuffixes: ['Tech Services', 'Digital Studio', 'Software Labs', 'Business Solutions'],
    subs: ['SaaS products', 'IT services', 'Digital marketing', 'Accounting & audit', 'Staffing'],
    suffixes: ['Technologies', 'Software', 'Solutions', 'Systems', 'Digital', 'Consulting', 'Labs'],
    cores: ['Byte', 'Cloud', 'Logic', 'Data', 'Pixel', 'Stack', 'Quanta'],
    revPerEmpL: 13,
    acvL: 7.8,
    roles: ['Founder & CEO', 'Managing Partner', 'CTO', 'Growth Head'],
  },
  'Chemicals & Plastics': {
    compoundSuffixes: ['Speciality Chemicals', 'Polymer Industries', 'Industrial Paints', 'Plastic Works'],
    subs: ['Polymer compounding', 'Industrial coatings', 'Fireworks & explosives', 'Specialty chemicals', 'Packaging'],
    suffixes: ['Polymers', 'Chemicals', 'Paints', 'Plastics', 'Industries', 'Specialities', 'Pack'],
    cores: ['Poly', 'Chem', 'Plast', 'Color', 'Blend', 'Chemi', 'Seal'],
    revPerEmpL: 18,
    acvL: 6.2,
    roles: ['Managing Director', 'Works Manager', 'Director', 'Purchase Head'],
  },
  'Building Materials & Construction': {
    compoundSuffixes: ['Builders & Developers', 'Cement Agencies', 'Steel Fabricators', 'Construction Co.'],
    subs: ['Ready-mix concrete', 'Cement trading', 'Steel fabrication', 'Interior fit-out', 'Real estate'],
    suffixes: ['Cements', 'Steels', 'Builders', 'Constructions', 'Hardware', 'Structures', 'Enterprises'],
    cores: ['Build', 'Stone', 'Struct', 'Brick', 'Gird', 'Solid', 'Span'],
    revPerEmpL: 15,
    acvL: 9.5,
    roles: ['Managing Partner', 'Managing Director', 'Projects Head', 'Finance Head'],
  },
  'Retail & Distribution': {
    compoundSuffixes: ['Trading Co.', 'Distribution Services', 'Wholesale Traders', 'Marketing Agencies'],
    subs: ['FMCG distribution', 'Consumer durables', 'Supermarkets', 'Pharma distribution', 'Auto spares'],
    suffixes: ['Traders', 'Agencies', 'Distributors', 'Enterprises', 'Mart', 'Bazaar', 'Sales'],
    cores: ['Trade', 'Supply', 'Mart', 'Bazaar', 'Deal', 'Stock', 'Vend'],
    revPerEmpL: 22,
    acvL: 2.4,
    roles: ['Proprietor', 'Managing Partner', 'Sales Head', 'Director'],
  },
  'Energy & Solar': {
    compoundSuffixes: ['Solar Solutions', 'Renewable Energy', 'Power Services', 'Energy Systems'],
    subs: ['Rooftop solar', 'Solar EPC', 'EV charging', 'Biogas', 'Energy audits'],
    suffixes: ['Solar', 'Power Systems', 'Energies', 'Renewables', 'Energy', 'Volt'],
    cores: ['Solar', 'Sun', 'Power', 'Volt', 'Ray', 'Watt', 'Ener'],
    revPerEmpL: 12,
    acvL: 5.8,
    roles: ['Founder', 'Managing Director', 'Business Head', 'Director – Projects'],
  },
}

const SECTOR_NAMES = Object.keys(SECTORS)

/* ------------------------------------------------------------------ */
/* names                                                               */
/* ------------------------------------------------------------------ */

// Business-name prefixes: auspicious words, family names and initials, the way
// most Tamil Nadu SMEs actually register themselves.
const PREFIXES = ['Sri', 'Sree', 'Shri', 'Sri Balaji', 'Sri Meenakshi', 'Sree Anandha', 'Sri Lakshmi', 'Sree Karpagam', 'Sri Sakthi', 'Sri Murugan', 'Sri Kumaran', 'Sri Ganesh', 'Sri Velan', 'Anandha', 'Karpagam', 'Meenakshi', 'Lakshmi', 'Vetri', 'Velan', 'Sakthi', 'Kumaran', 'Thirumalai', 'Vallalar', 'Vasanth', 'Vijay', 'Sudha', 'Sivam', 'Prakash', 'Rathinam', 'Ponni', 'Bharathi', 'Devi', 'Jaya', 'Kamala', 'Nandhini', 'Saravanan', 'Tamil', 'Uma', 'Vidhya', 'Yamuna', 'Ambal', 'Senthil', 'KRS', 'SPS', 'ARS', 'GKS', 'SMK', 'VKS', 'AVM', 'SKM', 'RVK', 'JKS', 'SMV', 'RVS', 'SKS']
const SURNAMES_FOR_FIRMS = ['Subramanian', 'Ramanathan', 'Venkatesan', 'Krishnamurthy', 'Natarajan', 'Sundaram', 'Srinivasan', 'Palanisamy', 'Manickam', 'Chidambaram']
const FIRST_NAMES = ['Arjun', 'Karthik', 'Suresh', 'Ramesh', 'Priya', 'Divya', 'Meena', 'Lakshmi', 'Ganesh', 'Senthil', 'Prakash', 'Saravanan', 'Vignesh', 'Nithya', 'Keerthi', 'Anitha', 'Ravi', 'Sathish', 'Manikandan', 'Revathi', 'Bhuvana', 'Deepak', 'Harish', 'Jeyanthi', 'Kalaiselvi', 'Mahesh', 'Nandhini', 'Poongodi', 'Rajkumar', 'Shankar', 'Tamilselvi', 'Uma', 'Velmurugan', 'Yamini', 'Aravind', 'Bala', 'Chithra', 'Ezhil', 'Gowri', 'Janani', 'Kavin', 'Logesh', 'Mythili', 'Naveen', 'Pooja', 'Raghav', 'Swetha', 'Tharun', 'Varsha', 'Yuvaraj']
const LAST_NAMES = ['Krishnan', 'Raman', 'Subramanian', 'Natarajan', 'Murugesan', 'Iyer', 'Iyengar', 'Pillai', 'Gounder', 'Nadar', 'Chettiar', 'Rao', 'Menon', 'Nair', 'Rajan', 'Selvam', 'Sundaram', 'Varadarajan', 'Venkatesh', 'Balaji', 'Kumar', 'Srinivasan', 'Chandran', 'Devan', 'Kannan']
const COUNTRIES = ['UAE', 'UAE', 'UK', 'Germany', 'Singapore', 'USA', 'Netherlands', 'Sri Lanka', 'Kenya', 'Australia']

/* ------------------------------------------------------------------ */
/* generation                                                          */
/* ------------------------------------------------------------------ */

const usedNames = new Set()
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 26)

function makeName(sector, district, locality) {
  const spec = SECTORS[sector]
  for (let attempt = 0; attempt < 40; attempt++) {
    const pattern = rand()
    let name
    if (pattern < 0.72) {
      name = `${pick(PREFIXES)} ${pick(spec.suffixes)}`
    } else if (pattern < 0.9) {
      name = `${pick(PREFIXES)} ${pick(spec.compoundSuffixes)}`
    } else {
      const initial = pick(['K', 'S', 'R', 'M', 'V', 'P', 'N', 'G', 'T', 'A'])
      name = `${initial}. ${pick(SURNAMES_FOR_FIRMS)} ${pick(['& Co.', '& Sons', '& Co.'])}`
    }
    if (!usedNames.has(name)) {
      usedNames.add(name)
      return name
    }
    if (attempt === 30) {
      const alt = `${pick(PREFIXES)} ${locality.replace(/[^A-Za-z]/g, '')} ${pick(spec.suffixes)}`
      if (!usedNames.has(alt)) {
        usedNames.add(alt)
        return alt
      }
    }
  }
  const fallback = `${pick(PREFIXES)} ${pick(spec.suffixes)} ${usedNames.size}`
  usedNames.add(fallback)
  return fallback
}

function makeContact(sector, companySlug) {
  const first = pick(FIRST_NAMES)
  const last = pick(LAST_NAMES)
  const spec = SECTORS[sector]
  const role = pick(spec.roles)
  const domain = `${companySlug}.${pick(['in', 'com', 'co.in', 'in'])}`
  const email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`
  return { name: `${first} ${last}`, role, email, phone: '' }
}

const SIGNAL_BANK = {
  growth: [
    (p) => `GST turnover up ${int(14, 48)}% year on year`,
    (p) => `New unit registered in ${p.locality}`,
    (p) => `Filed a fresh trade licence for a second line`,
    (p) => `Opened a branch outside ${p.district}`,
    (p) => `Annual returns show ${int(9, 26)}% revenue growth`,
  ],
  hiring: [
    (p) => `${int(4, 22)} new roles posted in the last 30 days`,
    () => `Hiring a finance lead for the first time`,
    (p) => `Headcount up ${int(8, 24)}% since last Deepavali`,
    () => `Posted 3 senior sales roles this month`,
  ],
  digital: [
    () => `Website relaunched on a new commerce stack`,
    () => `Active on LinkedIn — 4 posts this quarter`,
    () => `Ad spend visible across Meta and Google`,
    () => `Added online payments and e-invoicing`,
  ],
  credit: [
    () => `Working-capital facility of ₹${int(40, 260)}L cleared`,
    () => `Credit rating upgraded one notch`,
    () => `Eight quarters of on-time GST filings`,
    () => `New charge registered with a private bank`,
  ],
  export: [
    () => `First export order shipped to ${pick(COUNTRIES)}`,
    () => `IEC renewed; shipment logged to ${pick(COUNTRIES)}`,
    () => `Buyer enquiry from ${pick(COUNTRIES)} on trade directory`,
  ],
  energy: [
    () => `Rooftop solar sanctioned — ${int(40, 240)} kW`,
    () => `Energy audit completed with a payback plan`,
    () => `Diesel genset being replaced this quarter`,
  ],
  compliance: [
    () => `Compliance status clean for ${int(3, 9)} years`,
    () => `New partnership deed registered`,
    () => `Factory licence renewed without objections`,
  ],
}

const SIGNAL_TYPES = Object.keys(SIGNAL_BANK)
const SIGNAL_WEIGHTS = { growth: 16, hiring: 14, credit: 12, export: 15, digital: 8, energy: 6, compliance: 4 }

const SECTOR_SIGNAL_TYPES = {
  'Textiles & Apparel': ['growth', 'hiring', 'export', 'credit', 'energy', 'digital', 'compliance'],
  'Healthcare & Diagnostics': ['growth', 'hiring', 'credit', 'digital', 'compliance', 'energy'],
  'IT & Professional Services': ['growth', 'hiring', 'digital', 'credit', 'export'],
  'Hospitality & Tourism': ['growth', 'hiring', 'digital', 'credit', 'energy', 'compliance'],
  'Education & Training': ['growth', 'hiring', 'digital', 'compliance', 'energy'],
  'Retail & Distribution': ['growth', 'hiring', 'credit', 'digital', 'compliance'],
  'Food Processing & Agri': ['growth', 'export', 'credit', 'compliance', 'energy', 'digital'],
  'Auto Components & Engineering': ['growth', 'hiring', 'export', 'credit', 'energy', 'digital', 'compliance'],
  'Chemicals & Plastics': ['growth', 'export', 'credit', 'compliance', 'energy', 'hiring'],
  'Building Materials & Construction': ['growth', 'hiring', 'credit', 'compliance', 'energy'],
  'Logistics & Warehousing': ['growth', 'hiring', 'credit', 'digital', 'energy', 'compliance'],
  'Energy & Solar': ['growth', 'hiring', 'credit', 'digital', 'compliance'],
}

// A few sector-specific phrasings so the signal feed reads like real research
// rather than a generic template.
const SECTOR_SIGNAL_LABELS = {
  'Healthcare & Diagnostics|digital': [() => 'Online appointment booking went live last month', () => 'Patient portal and e-prescriptions launched'],
  'Healthcare & Diagnostics|hiring': [() => 'Hiring 6 technicians for the new lab', () => 'Posted roles for two duty doctors'],
  'IT & Professional Services|hiring': [() => 'Hiring 6 engineers this quarter', () => 'Opened 4 new delivery roles'],
  'IT & Professional Services|growth': [() => 'Closed a seed round in September', () => 'Added a second delivery floor in the same building'],
  'Hospitality & Tourism|digital': [() => 'Direct booking engine now live', () => 'Listed on three new travel platforms'],
  'Hospitality & Tourism|growth': [() => 'Weekend occupancy up 18% this quarter', () => 'New banquet block cleared for opening'],
  'Education & Training|digital': [() => 'Admissions portal launched for the next session'],
  'Food Processing & Agri|growth': [() => 'New cold-storage line commissioned'],
  'Food Processing & Agri|export': [() => `Shipped the first container to ${pick(COUNTRIES)}`],
  'Textiles & Apparel|growth': [() => 'Commissioned a second knitting line', () => 'Added a solar-powered stitching unit'],
  'Retail & Distribution|growth': [() => 'Opened a third outlet in the district'],
  'Logistics & Warehousing|growth': [() => 'Leased a new 40,000 sq ft warehouse', () => `Added ${int(4, 18)} trucks to the fleet`],
  'Auto Components & Engineering|growth': [() => 'New CNC cell commissioned at the Hosur unit'],
  'Chemicals & Plastics|growth': [() => 'Expanded the compounding line in Neyveli'],
}

function makeSignals(prospect) {
  const count = pickWeighted([[2, 28], [3, 46], [4, 26]])
  const allowed = SECTOR_SIGNAL_TYPES[prospect.sector] || SIGNAL_TYPES
  const types = shuffle(allowed).slice(0, Math.min(count, allowed.length))
  return types
    .map((type) => {
      const daysAgo = int(1, 96)
      const date = new Date(TODAY.getTime() - daysAgo * 86400000)
      return {
        type,
        label: pick(
          SECTOR_SIGNAL_LABELS[`${prospect.sector}|${type}`] || SIGNAL_BANK[type],
        )(prospect),
        date: date.toISOString().slice(0, 10),
        daysAgo,
        weight: SIGNAL_WEIGHTS[type] + int(-2, 3),
      }
    })
    .sort((a, b) => a.daysAgo - b.daysAgo)
}

function phoneFor(std) {
  const a = int(2000, 8999)
  const b = int(1000, 9999)
  return std === '44' ? `+91 44 ${a} ${b.toString().padStart(5, '0').slice(0, 5)}` : `+91 ${std} ${a} ${b}`
}

/* Build a per-district target count so the whole set is ~250. */
const districtTargets = DISTRICTS.map((d) => ({ d, target: Math.max(6, Math.round(d.weight * 1.6)) }))
const prospects = []
let counter = 1040


/* ------------------------------------------------------------------ */
/* curated anchor accounts                                             */
/* ------------------------------------------------------------------ */

// A handful of accounts with hand-written names, contacts and notes. These
// anchor the demo narrative (morning brief, route, featured lists) so that the
// story reads like a real workspace rather than an anonymous spreadsheet.
const SPOTLIGHT = [
  {
    name: 'Anandhaa Knitwear', subSector: 'Knitwear', sector: 'Textiles & Apparel', district: 'Tiruppur', locality: 'Mangalam',
    employees: 238, foundedYear: 1998, scores: { fit: 88, momentum: 93, footprint: 79, reach: 74 },
    status: 'meeting', owner: 'Priya Raman', spotlight: true,
    notes: 'Second unit commissioned in August. Buyer in the UAE wants a 40% larger order — capacity is the bottleneck.',
  },
  {
    name: 'Meenakshi Diagnostics', subSector: 'Diagnostics labs', sector: 'Healthcare & Diagnostics', district: 'Madurai', locality: 'Anna Nagar',
    employees: 96, foundedYear: 2011, scores: { fit: 90, momentum: 86, footprint: 72, reach: 88 },
    status: 'contacted', owner: 'Priya Raman', spotlight: true,
    notes: 'Opening a second lab in KK Nagar. Procurement is centralised with the managing director.',
  },
  {
    name: 'Sri Velan Logistics', subSector: 'Warehousing', sector: 'Logistics & Warehousing', district: 'Chennai', locality: 'Guindy',
    employees: 312, foundedYear: 2005, scores: { fit: 84, momentum: 91, footprint: 88, reach: 82 },
    status: 'meeting', owner: 'Priya Raman', spotlight: true,
    notes: 'Fleet expansion is on hold until the new warehouse in Sriperumbudur is leased. Follow up after Diwali.',
  },
  {
    name: 'Vanathi Technologies', subSector: 'SaaS products', sector: 'IT & Professional Services', district: 'Chennai', locality: 'Perungudi',
    employees: 78, foundedYear: 2016, scores: { fit: 89, momentum: 94, footprint: 61, reach: 92 },
    status: 'new', owner: 'Priya Raman', spotlight: true,
    notes: 'Raised a seed round in September. Hiring across sales and delivery.',
  },
  {
    name: 'Sakthi Pumps', subSector: 'Pump manufacturing', sector: 'Auto Components & Engineering', district: 'Coimbatore', locality: 'Peelamedu',
    employees: 186, foundedYear: 1994, scores: { fit: 92, momentum: 80, footprint: 84, reach: 76 },
    status: 'contacted', owner: 'Karthik Selvam', spotlight: true,
    notes: 'Exports to Kenya and Tanzania. The finance head is the buying centre for anything above ₹5 lakh.',
  },
  {
    name: 'Ponni Agro Foods', subSector: 'Rice milling', sector: 'Food Processing & Agri', district: 'Thanjavur', locality: 'Nanjikottai Road',
    employees: 142, foundedYear: 2009, scores: { fit: 87, momentum: 74, footprint: 68, reach: 71 },
    status: 'new', owner: 'Divya Mani', spotlight: true,
    notes: 'FSSAI renewal handled in-house. Interested in retail placement across the delta.',
  },
  {
    name: 'KRS Home Textiles', subSector: 'Home textiles', sector: 'Textiles & Apparel', district: 'Karur', locality: 'Thanthonimalai',
    employees: 264, foundedYear: 2001, scores: { fit: 86, momentum: 82, footprint: 81, reach: 70 },
    status: 'contacted', owner: 'Karthik Selvam', spotlight: true,
    notes: 'Container volumes to the US are up. Wants a better forecasting process before the next season.',
  },
  {
    name: 'Kurinji Retreat', subSector: 'Resorts', sector: 'Hospitality & Tourism', district: 'Nilgiris', locality: 'Coonoor',
    employees: 46, foundedYear: 2014, scores: { fit: 83, momentum: 88, footprint: 56, reach: 86 },
    status: 'new', owner: 'Divya Mani', spotlight: true,
    notes: 'Weekend occupancy crosses 90% from October. Owner is evaluating a second property in Kotagiri.',
  },
  {
    name: 'Sree Karpagam Vidyalaya', subSector: 'K-12 schools', sector: 'Education & Training', district: 'Coimbatore', locality: 'Saibaba Colony',
    employees: 168, foundedYear: 2003, scores: { fit: 85, momentum: 78, footprint: 74, reach: 83 },
    status: 'customer', owner: 'Priya Raman', spotlight: true,
    notes: 'Running a second academic year with us. Referral conversations started with two neighbouring schools.',
  },
  {
    name: 'AVM Precision Components', subSector: 'Precision machining', sector: 'Auto Components & Engineering', district: 'Chengalpattu', locality: 'Mahindra World City',
    employees: 348, foundedYear: 1999, scores: { fit: 88, momentum: 85, footprint: 92, reach: 68 },
    status: 'contacted', owner: 'Arun Prakash', spotlight: true,
    notes: 'Tier-2 supplier to two OEMs. Approval cycles are slow but contract values are the largest in the workspace.',
  },
  {
    name: 'Rathinam Speciality Chemicals', subSector: 'Specialty chemicals', sector: 'Chemicals & Plastics', district: 'Cuddalore', locality: 'Neyveli',
    employees: 214, foundedYear: 1996, scores: { fit: 82, momentum: 72, footprint: 86, reach: 67 },
    status: 'new', owner: 'Arun Prakash', spotlight: true,
    notes: 'Compliance-heavy buyer. Needs documentation support before the first commercial call.',
  },
  {
    name: 'Senthil Traders', subSector: 'FMCG distribution', sector: 'Retail & Distribution', district: 'Salem', locality: 'Hasthampatti',
    employees: 64, foundedYear: 2008, scores: { fit: 81, momentum: 76, footprint: 59, reach: 88 },
    status: 'meeting', owner: 'Divya Mani', spotlight: true,
    notes: 'Handles FMCG distribution across four taluks. Fast decision-maker; prefers WhatsApp follow-ups.',
  },
]

const spotlightProspects = SPOTLIGHT.map((s, i) => {
  const spec = SECTORS[s.sector]
  const d = DISTRICTS.find((x) => x.name === s.district)
  usedNames.add(s.name)
  const slug = slugify(s.name)
  const p = {
    id: `TH-${1000 + i}`,
    name: s.name,
    sector: s.sector,
    subSector: s.subSector || pick(spec.subs),
    district: s.district,
    locality: s.locality,
    employees: s.employees,
    revenueCr: round((s.employees * spec.revPerEmpL) / 100 * (0.8 + rand() * 0.4), 1),
    foundedYear: s.foundedYear,
    scores: s.scores,
    signals: [],
    contact: makeContact(s.sector, slug),
    website: `www.${slug}.in`,
    owner: s.owner,
    status: s.status,
    lastTouchDays: int(1, 18),
    potentialL: Math.round(spec.acvL * (0.6 + s.employees / 300) * (0.8 + rand() * 0.6) * 10) / 10,
    accountTier: s.employees > 320 ? 'Key account' : s.employees > 120 ? 'Mid-market' : 'SME',
    notes: s.notes,
    spotlight: true,
  }
  p.contact.phone = phoneFor(d.std)
  p.signals = makeSignals(p)
  return p
})

prospects.push(...spotlightProspects)

for (const { d, target } of districtTargets) {
  for (let i = 0; i < target; i++) {
    const sector = pickWeighted(d.sectors)
    const spec = SECTORS[sector]
    const locality = pick(d.localities)
    const name = makeName(sector, d.name, locality)
    const slug = slugify(name)

    // size profile: mostly SME, a few larger anchors
    const sizeBand = pickWeighted([[1, 34], [2, 42], [3, 19], [4, 5]])
    const employees =
      sizeBand === 1 ? int(8, 39) : sizeBand === 2 ? int(40, 149) : sizeBand === 3 ? int(150, 420) : int(420, 980)
    const foundedYear = int(1978, 2022)
    const revenueCr = round((employees * spec.revPerEmpL) / 100 * (0.75 + rand() * 0.6), 1)

    const localityTier = d.tier === 1 ? 1 : d.tier === 2 ? 2 : 3
    const idealLow = 40
    const idealHigh = 260
    const sizeFit =
      employees < idealLow
        ? 62 - (idealLow - employees) * 0.45
        : employees > idealHigh
          ? 74 - (employees - idealHigh) * 0.05
          : 88 - Math.abs(employees - 120) * 0.06
    const sectorAffinity = pickWeighted([[1, 55], [2, 30], [3, 15]])
    const fit = clamp(Math.round(sizeFit * 0.72 + (sectorAffinity === 1 ? 84 : sectorAffinity === 2 ? 70 : 58) * 0.28 + int(-7, 7)))

    const momentum = clamp(
      Math.round(42 + d.growth * 2.1 + int(-13, 15) + (chance(0.3) ? int(6, 16) : 0)),
    )
    const footprint = clamp(
      Math.round(
        34 +
          Math.min(38, employees / 16) +
          Math.min(16, revenueCr / 2.4) +
          (TODAY.getFullYear() - foundedYear > 15 ? 10 : 4) +
          int(-8, 9),
      ),
    )
    const reach = clamp(
      Math.round(46 + (chance(0.62) ? 22 : 0) + (localityTier === 1 ? 12 : localityTier === 2 ? 5 : 0) + int(-9, 11)),
    )

    const p = {
      id: `TH-${counter++}`,
      name,
      sector,
      subSector: pick(spec.subs),
      district: d.name,
      locality,
      employees,
      revenueCr,
      foundedYear,
      scores: { fit, momentum, footprint, reach },
      signals: [],
      contact: makeContact(sector, slug),
      website: chance(0.78) ? `www.${slug}.in` : null,
      owner: pickWeighted([['Priya Raman', 44], ['Karthik Selvam', 22], ['Divya Mani', 18], ['Arun Prakash', 16]]),
      status: pickWeighted([['new', 61], ['contacted', 24], ['meeting', 11], ['customer', 4]]),
      lastTouchDays: chance(0.4) ? int(1, 20) : int(21, 120),
      potentialL: Math.round(spec.acvL * (0.6 + employees / 300) * (0.8 + rand() * 0.6) * 10) / 10,
      accountTier: employees > 320 ? 'Key account' : employees > 120 ? 'Mid-market' : 'SME',
      notes: '',
    }
    p.contact.phone = phoneFor(d.std)
    p.signals = makeSignals(p)
    p.potentialL = Math.round(p.potentialL * 10) / 10
    prospects.push(p)
  }
}

prospects.sort((a, b) => a.id.localeCompare(b.id))

/* Notes: a short, human line for roughly a third of records. */
const NOTE_POOL = [
  'Prefers a call before 10 a.m. Owner handles purchases directly.',
  'Second generation is now running operations — faster decisions than the sector norm.',
  'Already evaluating two vendors. Timing matters here.',
  'Long-standing family business; warm intro via the local association works best.',
  'Exports are growing faster than their ERP can handle. Good fit for ops tooling.',
  'Budget cycle closes in March. Worth a discovery call now.',
  'Referred by an existing customer in the same district.',
  'Site visit needed — the decision-maker is rarely at the registered office.',
]
for (const p of prospects) {
  if (chance(0.34)) p.notes = pick(NOTE_POOL)
}

/* ------------------------------------------------------------------ */
/* district rollups                                                    */
/* ------------------------------------------------------------------ */

const monthKeys = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2025, 11 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

const districts = DISTRICTS.map((d, idx) => {
  const rows = prospects.filter((p) => p.district === d.name)
  const avgScore = Math.round(
    rows.reduce((s, p) => s + (p.scores.fit * 0.32 + p.scores.momentum * 0.3 + p.scores.footprint * 0.22 + p.scores.reach * 0.16), 0) /
      Math.max(1, rows.length),
  )
  const avgMomentum = Math.round(rows.reduce((s, p) => s + p.scores.momentum, 0) / Math.max(1, rows.length))
  const sectorCounts = {}
  for (const p of rows) sectorCounts[p.sector] = (sectorCounts[p.sector] || 0) + 1
  const topSectors = Object.entries(sectorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count]) => ({ name, count }))
  const totalPotentialL = Math.round(rows.reduce((s, p) => s + p.potentialL, 0))
  const pulse = Array.from({ length: 12 }, (_, i) =>
    Math.round(avgMomentum * (0.74 + i * 0.024) + Math.sin((i + idx) * 0.9) * 5 + int(-3, 3)),
  )
  return {
    name: d.name,
    region: d.region,
    growth: d.growth,
    tier: d.tier,
    character: d.character,
    prospects: rows.length,
    avgScore,
    momentum: avgMomentum,
    signalCount: rows.reduce((s, p) => s + p.signals.length, 0),
    potentialL: totalPotentialL,
    topSectors,
    pulse,
    hotspot: d.localities[0],
  }
})

/* ------------------------------------------------------------------ */
/* geo                                                                 */
/* ------------------------------------------------------------------ */

const geoSource = JSON.parse(fs.readFileSync(path.join(ROOT, '.scratch', 'tn-districts.geojson'), 'utf8'))
const ALIASES = { Thiruvallur: 'Thiruvallur', Thoothukkudi: 'Thoothukkudi' }

function simplifyRing(ring, tolerance) {
  // Douglas–Peucker
  const sqTol = tolerance * tolerance
  const sqSegDist = (p, a, b) => {
    let x = a[0]
    let y = a[1]
    let dx = b[0] - x
    let dy = b[1] - y
    if (dx !== 0 || dy !== 0) {
      const t = ((p[0] - x) * dx + (p[1] - y) * dy) / (dx * dx + dy * dy)
      if (t > 1) {
        x = b[0]
        y = b[1]
      } else if (t > 0) {
        x += dx * t
        y += dy * t
      }
    }
    dx = p[0] - x
    dy = p[1] - y
    return dx * dx + dy * dy
  }
  const getSqSegDist = sqSegDist
  const step = (first, last, out) => {
    let maxDist = sqTol
    let index = -1
    for (let i = first + 1; i < last; i++) {
      const d = getSqSegDist(ring[i], ring[first], ring[last])
      if (d > maxDist) {
        index = i
        maxDist = d
      }
    }
    if (index > 0) {
      if (index - first > 1) step(first, index, out)
      out.push(ring[index])
      if (last - index > 1) step(index, last, out)
    }
  }
  const out = [ring[0]]
  step(0, ring.length - 1, out)
  out.push(ring[ring.length - 1])
  return out
}

const roundCoord = (c) => [round(c[0], 3), round(c[1], 3)]

const geo = {
  type: 'FeatureCollection',
  attribution: 'District boundaries adapted from DataMeet Maps (MIT) / udit-001 india-maps-data',
  features: geoSource.features.map((f) => {
    const district = ALIASES[f.properties.district] || f.properties.district
    const polygons = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    const simplified = polygons
      .map((poly) =>
        poly
          .map((ring) => simplifyRing(ring, 0.004).map(roundCoord))
          .filter((ring) => ring.length >= 4),
      )
      .filter((poly) => poly.length > 0)
    return { type: 'Feature', properties: { district }, geometry: { type: 'MultiPolygon', coordinates: simplified } }
  }),
}

/* Centroids for label placement (area-weighted, largest ring only is fine) */
for (const f of geo.features) {
  let best = null
  let bestArea = 0
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const poly of f.geometry.coordinates) {
    const ring = poly[0]
    let area = 0
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
    }
    area = Math.abs(area / 2)
    for (const [x, y] of ring) {
      minX = Math.min(minX, x); minY = Math.min(minY, y)
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y)
    }
    if (area > bestArea) {
      bestArea = area
      let cx = 0, cy = 0, A = 0
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const f2 = ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1]
        cx += (ring[j][0] + ring[i][0]) * f2
        cy += (ring[j][1] + ring[i][1]) * f2
        A += f2
      }
      A *= 3
      best = A === 0 ? [ring[0][0], ring[0][1]] : [cx / A, cy / A]
    }
  }
  f.properties.centroid = [round(best[0], 3), round(best[1], 3)]
  f.properties.bbox = [round(minX, 3), round(minY, 3), round(maxX, 3), round(maxY, 3)]
}

/* ------------------------------------------------------------------ */
/* write                                                               */
/* ------------------------------------------------------------------ */

fs.mkdirSync(DATA_DIR, { recursive: true })
fs.writeFileSync(path.join(DATA_DIR, 'prospects.json'), JSON.stringify(prospects, null, 0) + '\n')
fs.writeFileSync(path.join(DATA_DIR, 'districts.json'), JSON.stringify({ months: monthKeys, districts }, null, 0) + '\n')
fs.writeFileSync(path.join(DATA_DIR, 'geo.json'), JSON.stringify(geo, null, 0) + '\n')

const geoSize = fs.statSync(path.join(DATA_DIR, 'geo.json')).size
const pSize = fs.statSync(path.join(DATA_DIR, 'prospects.json')).size
console.log(`prospects: ${prospects.length} (${(pSize / 1024).toFixed(0)} KB)`)
console.log(`districts: ${districts.length}`)
console.log(`geo: ${(geoSize / 1024).toFixed(0)} KB, features: ${geo.features.length}`)
console.log('sectors:', SECTOR_NAMES.map((s) => `${s}=${prospects.filter((p) => p.sector === s).length}`).join(', '))
console.log('avg score:', Math.round(prospects.reduce((s, p) => s + p.scores.fit * 0.32 + p.scores.momentum * 0.3 + p.scores.footprint * 0.22 + p.scores.reach * 0.16, 0) / prospects.length))
console.log('top 8:', prospects
  .map((p) => ({ n: p.name, d: p.district, s: Math.round(p.scores.fit * 0.32 + p.scores.momentum * 0.3 + p.scores.footprint * 0.22 + p.scores.reach * 0.16) }))
  .sort((a, b) => b.s - a.s)
  .slice(0, 8)
  .map((x) => `${x.n} (${x.d}) ${x.s}`)
  .join(' | '))
