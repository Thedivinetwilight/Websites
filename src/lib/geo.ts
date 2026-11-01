import geoJson from '../data/geo.json'
import type { GeoCollection } from './types'

/**
 * Static map geometry. It is intentionally shipped with the frontend rather
 * than stored in SQLite: it never changes during a demo, so there is no reason
 * to send ~48 KB of polygons through the API on every interaction.
 *
 * Boundaries adapted from DataMeet Maps (MIT) and udit-001/india-maps-data.
 * The demo data itself is synthetic (see README).
 */
export const geo = geoJson as unknown as GeoCollection
