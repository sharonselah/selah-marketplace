// Small pools; the factories cycle through them deterministically for variety.

export const FIRST_NAMES = [
  'Wanjiru', 'Otieno', 'Akinyi', 'Kamau', 'Njeri', 'Mutua', 'Chebet', 'Omondi', 'Wambui', 'Kiprono',
  'Atieno', 'Mwangi', 'Nyambura', 'Barasa', 'Wairimu', 'Juma', 'Moraa', 'Onyango', 'Jeptoo', 'Kariuki',
] as const;

export const LAST_NAMES = [
  'Mwangi', 'Odhiambo', 'Kamau', 'Wanjiku', 'Kiptoo', 'Achieng', 'Mutiso', 'Njoroge', 'Owino', 'Chege',
] as const;

export const STAGE_PREFIXES = ['DJ', 'MC', '', 'The', 'Selector', ''] as const;
export const STAGE_WORDS = [
  'Shiru', 'Kace', 'Mzee', 'Vybz', 'Nyota', 'Bass', 'Kenji', 'Lulu', 'Rafiki', 'Zuri', 'Tembo', 'Simba', 'Pili', 'Neno', 'Kito', 'Jua',
] as const;

export const AREAS = [
  'Westlands', 'Kilimani', 'Karen', 'Lavington', 'Kileleshwa', 'CBD', 'Ngong Road', 'Thika Road', 'Mombasa', 'Kisumu', 'Nakuru', 'Diani',
] as const;

export const GENRES = [
  'Afrobeats', 'Amapiano', 'Gengetone', 'Bongo', 'Hip hop', 'R&B', 'Dancehall', 'House', 'Rhumba', 'Gospel', 'Reggae', 'Benga',
] as const;

export const LANGUAGES = ['English', 'Swahili', 'Sheng', 'Kikuyu', 'Luo', 'Kalenjin'] as const;

export const CREATOR_NICHES = ['Nightlife', 'Lifestyle', 'Food & drink', 'Fashion', 'Music', 'Comedy', 'Travel', 'Tech'] as const;

export const VENUE_NAMES = ['Kiza Lounge', 'Mercury Rooftop', 'The Waterfront', 'Bao Box', 'Nyama Mama Club', 'Sky Deck'] as const;

export const EVENT_TITLES = [
  'Amapiano Fridays', 'Gengetone Takeover', 'Afro Sunset Sessions', 'Throwback Thursday', 'Rooftop Rhumba Night',
  'Ladies Night Live', 'Hip Hop Cypher', 'Sunday Chill & Grill', 'Bass Culture', 'New Year Countdown',
] as const;

export const BOTTLES = ['Hennessy VS', 'Jameson 1L', 'Moët Brut', 'Ciroc Vodka', 'Tusker Bucket (6)', 'Gilbey’s Gin'] as const;

/** Cover art is a CSS gradient keyed by index; see <Cover>. */
export const COVER_COUNT = 8;
export const cover = (i: number) => `g${i % COVER_COUNT}`;
