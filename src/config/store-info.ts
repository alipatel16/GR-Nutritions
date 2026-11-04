// Public business details shown on About, Contact, Help and the legal pages.
// Edit here once; every page reads from this file.
export const storeInfo = {
  legalName: 'GR Nutritions',
  owner: 'Rohit Tomar',
  phones: ['+91 74900 20905', '+91 63531 22140'],
  // Digits only, with country code, for tel: and WhatsApp links.
  phoneLinks: ['917490020905', '916353122140'],
  whatsapp: '917490020905',
  email: 'grnutritionweb@gmail.com',
  website: 'https://grnutritions.web.app',
  address: {
    line1: 'Ground Floor, B/4 Shantiniketan Business Hub',
    line2: 'Near Gangotri Circle, Nikol',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '382350',
    country: 'India',
  },
  // Store pin (from the Google Maps "GR Nutrition" listing) for the Contact page map.
  coordinates: { latitude: 23.0453557, longitude: 72.6696762 } as null | { latitude: number; longitude: number },
  googleMapsPlace:
    'https://www.google.com/maps/place/GR+Nutrition/@23.0453557,72.6671013,17z/data=!4m6!3m5!1s0x395e870064624031:0xe28080da5c495da1!8m2!3d23.0453557!4d72.6696762!16s%2Fg%2F11vsxx_4qp',
  supportHours: 'Monday to Saturday, 10:00 am to 7:00 pm IST',
  // Order rules already enforced at checkout.
  delivery: {
    freeAboveRupees: 999,
    feeRupees: 50,
    codFeeRupees: 200,
  },
  // Owner to confirm before launch: the returns window used in Terms and Help.
  damageReportHours: 48,
  jurisdictionCity: 'Ahmedabad',
  policiesUpdated: '4 November 2026',
} as const;

export const fullAddress = [
  storeInfo.address.line1,
  storeInfo.address.line2,
  `${storeInfo.address.city}, ${storeInfo.address.state} ${storeInfo.address.pincode}`,
  storeInfo.address.country,
].join(', ');

export function mapsQuery(): string {
  const pin = storeInfo.coordinates;
  return pin ? `${pin.latitude},${pin.longitude}` : fullAddress;
}

export const mapsLink = () => storeInfo.googleMapsPlace;

export const directionsLink = () =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(mapsQuery())}`;

export const mapsEmbedUrl = () =>
  `https://www.google.com/maps?q=${encodeURIComponent(mapsQuery())}&z=16&output=embed`;

export const whatsappLink = (message: string) =>
  `https://wa.me/${storeInfo.whatsapp}?text=${encodeURIComponent(message)}`;

export const emailLink = (subject: string, body = '') =>
  `mailto:${storeInfo.email}?subject=${encodeURIComponent(subject)}${body ? `&body=${encodeURIComponent(body)}` : ''}`;
