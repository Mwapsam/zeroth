/* ============================================================================
   ProHire Hub — professional hiring marketplace
   v1.4.0 — Country-aware currency (registration country → baseline),
            city filter as override, clean scope, runtime add-pro
   ========================================================================== */
(function () {
  'use strict';

  if (window.__proHireInitialised) return;
  window.__proHireInitialised = true;

  /* ---------------------------------------------------------------- CITIES */

  var PH_CITIES = {
    nairobi:      { lat: -1.2921,  lng: 36.8219,   label: 'Nairobi, Kenya' },
    mombasa:      { lat: -4.0435,  lng: 39.6682,   label: 'Mombasa, Kenya' },
    kisumu:       { lat: -0.0917,  lng: 34.7680,   label: 'Kisumu, Kenya' },
    newyork:      { lat: 40.7128,  lng: -74.0060,  label: 'New York, USA' },
    losangeles:   { lat: 34.0522,  lng: -118.2437, label: 'Los Angeles, USA' },
    london:       { lat: 51.5074,  lng: -0.1278,   label: 'London, UK' },
    dubai:        { lat: 25.2048,  lng: 55.2708,   label: 'Dubai, UAE' },
    johannesburg: { lat: -26.2041, lng: 28.0473,   label: 'Johannesburg, South Africa' },
    capetown:     { lat: -33.9249, lng: 18.4241,   label: 'Cape Town, South Africa' },
    durban:       { lat: -29.8587, lng: 31.0218,   label: 'Durban, South Africa' },
    gaborone:     { lat: -24.6282, lng: 25.9231,   label: 'Gaborone, Botswana' },
    windhoek:     { lat: -22.5609, lng: 17.0658,   label: 'Windhoek, Namibia' },

    /* Zambia */
    lusaka:       { lat: -15.3875, lng: 28.3228,   label: 'Lusaka, Zambia' },
    mazabuka:     { lat: -15.8565, lng: 27.7531,   label: 'Mazabuka, Zambia' },
    livingstone:  { lat: -17.8575, lng: 25.8544,   label: 'Livingstone, Zambia' },
    kitwe:        { lat: -12.8024, lng: 28.2132,   label: 'Kitwe, Zambia' },
    ndola:        { lat: -12.9587, lng: 28.6366,   label: 'Ndola, Zambia' },
    kabwe:        { lat: -14.4469, lng: 28.4464,   label: 'Kabwe, Zambia' },
    chingola:     { lat: -12.5290, lng: 27.8530,   label: 'Chingola, Zambia' },
    solwezi:      { lat: -12.1833, lng: 26.4000,   label: 'Solwezi, Zambia' },
    chipata:      { lat: -13.6333, lng: 32.6500,   label: 'Chipata, Zambia' },
    mongu:        { lat: -15.2500, lng: 23.1333,   label: 'Mongu, Zambia' },
    kasama:       { lat: -10.2000, lng: 31.1833,   label: 'Kasama, Zambia' },
    choma:        { lat: -16.8000, lng: 26.9833,   label: 'Choma, Zambia' },

    /* Other */
    lilongwe:     { lat: -13.9626, lng: 33.7741,   label: 'Lilongwe, Malawi' },
    maputo:       { lat: -25.9692, lng: 32.5732,   label: 'Maputo, Mozambique' },
    harare:       { lat: -17.8252, lng: 31.0335,   label: 'Harare, Zimbabwe' },
    maseru:       { lat: -29.3151, lng: 27.4869,   label: 'Maseru, Lesotho' },
    mbabane:      { lat: -26.3054, lng: 31.1367,   label: 'Mbabane, Eswatini' },
    arusha:       { lat: -3.3869,  lng: 36.6830,   label: 'Arusha, Tanzania' }
  };

  var PH_CURRENCIES = {
    USD: { code: 'USD', symbol: '$',    rate: 1,     step: 1,   locale: 'en-US' },
    KES: { code: 'KES', symbol: 'KSh ', rate: 129,   step: 50,  locale: 'en-KE' },
    GBP: { code: 'GBP', symbol: '£',    rate: 0.79,  step: 5,   locale: 'en-GB' },
    AED: { code: 'AED', symbol: 'AED ', rate: 3.67,  step: 5,   locale: 'en-AE' },
    ZAR: { code: 'ZAR', symbol: 'R',    rate: 16.51, step: 10,  locale: 'en-ZA' },
    BWP: { code: 'BWP', symbol: 'P',    rate: 13.74, step: 5,   locale: 'en-BW' },
    NAD: { code: 'NAD', symbol: 'N$',   rate: 16.64, step: 10,  locale: 'en-NA' },
    ZMW: { code: 'ZMW', symbol: 'K ',   rate: 26.50, step: 50,  locale: 'en-ZM' },
    MWK: { code: 'MWK', symbol: 'MK',   rate: 1717,  step: 500, locale: 'en-MW' },
    MZN: { code: 'MZN', symbol: 'MT',   rate: 63.83, step: 50,  locale: 'pt-MZ' },
    ZWG: { code: 'ZWG', symbol: 'ZiG',  rate: 25.34, step: 5,   locale: 'en-ZW' },
    LSL: { code: 'LSL', symbol: 'L',    rate: 16.58, step: 10,  locale: 'en-LS' },
    SZL: { code: 'SZL', symbol: 'E',    rate: 16.51, step: 10,  locale: 'en-SZ' },
    TZS: { code: 'TZS', symbol: 'TSh ', rate: 2550,  step: 500, locale: 'en-TZ' },
    NGN: { code: 'NGN', symbol: '₦',    rate: 1550,  step: 500, locale: 'en-NG' },
    UGX: { code: 'UGX', symbol: 'USh ', rate: 3750,  step: 500, locale: 'en-UG' },
    GHS: { code: 'GHS', symbol: '₵',    rate: 15.2,  step: 5,   locale: 'en-GH' },
    EUR: { code: 'EUR', symbol: '€',    rate: 0.92,  step: 5,   locale: 'de-DE' }
  };

  var PH_CITY_CURRENCY = {
    nairobi: 'KES', mombasa: 'KES', kisumu: 'KES',
    newyork: 'USD', losangeles: 'USD',
    london: 'GBP', dubai: 'AED',
    johannesburg: 'ZAR', capetown: 'ZAR', durban: 'ZAR',
    gaborone: 'BWP', windhoek: 'NAD',

    lusaka: 'ZMW', mazabuka: 'ZMW', livingstone: 'ZMW',
    kitwe: 'ZMW', ndola: 'ZMW', kabwe: 'ZMW',
    chingola: 'ZMW', solwezi: 'ZMW', chipata: 'ZMW',
    mongu: 'ZMW', kasama: 'ZMW', choma: 'ZMW',

    lilongwe: 'MWK', maputo: 'MZN', harare: 'ZWG',
    maseru: 'LSL', mbabane: 'SZL', arusha: 'TZS'
  };

  /* Country (ISO-2) → currency code. Used as the default currency
     when the user is registered but no city filter is active. */
  var PH_COUNTRY_CURRENCY = {
    ZM: 'ZMW',
    ZA: 'ZAR',
    KE: 'KES',
    NG: 'NGN',
    TZ: 'TZS',
    UG: 'UGX',
    GH: 'GHS',
    BW: 'BWP',
    NA: 'NAD',
    ZW: 'ZWG',
    MW: 'MWK',
    MZ: 'MZN',
    LS: 'LSL',
    SZ: 'SZL',
    US: 'USD',
    GB: 'GBP',
    EU: 'EUR',
    AE: 'AED'
  };

  var PH_DEFAULT_CURRENCY = 'USD';

  var PH_CAT_QUALS = {
    doctor:        ['Medical degree (MBBS / MD)', 'Licensed to practise', 'Board certified', 'Malpractice insured'],
    nurse:         ['Registered nurse (RN)', 'Nursing council licensed', 'BLS / ACLS certified', 'Police clearance'],
    electrician:   ['Certified electrician', 'Electrical safety certificate', 'Public liability insured', 'ID verified'],
    plumber:       ['Certified plumber', 'Gas safety registered', 'Public liability insured', 'ID verified'],
    mechanic:      ['Trade-certified mechanic', 'Automotive diploma', 'Garage insured', 'ID verified'],
    cleaner:       ['Background checked', 'Police clearance', 'Cleaning certificate', 'Public liability insured'],
    barber:        ['Certified barber', 'Hygiene & sanitation cert.', 'ID verified', 'Portfolio reviewed'],
    hairdresser:   ['Certified hairdresser', 'Colour & chemical trained', 'Hygiene certified', 'Portfolio reviewed'],
    cosmetologist: ['Beauty therapy diploma', 'Skin & product certified', 'Hygiene certified', 'ID verified'],
    bricklayer:    ['Trade-certified mason', 'Construction safety (OSHA)', 'Own tools & equipment', 'Public liability insured'],
    carpenter:     ['Trade-certified carpenter', 'Joinery qualification', 'Workshop insured', 'Portfolio reviewed'],
    driver:        ['Valid driving licence', 'Defensive driving cert.', 'Clean driving record', 'Police clearance'],
    security:      ['Licensed security guard', 'Police clearance', 'First aid certified', 'Self-defence trained'],
    vehicles:      ['Commercial passenger licence', 'Comprehensive insurance', 'Roadworthy certificate', 'Vetted chauffeur']
  };

  var PH_OCCASIONS = {
    wedding:   { label: 'Weddings',       icon: '💍' },
    safari:    { label: 'Safari & tours', icon: '🦁' },
    airport:   { label: 'Airport',        icon: '✈️' },
    corporate: { label: 'Corporate',      icon: '💼' },
    events:    { label: 'Events',         icon: '🎉' },
    selfdrive: { label: 'Self-drive',     icon: '🔑' },
    vip:       { label: 'VIP',            icon: '⭐' },
    funeral:   { label: 'Funerals',       icon: '🕊️' }
  };

  /* ------------------------------------------------------------------ PROS */

  var PH_PROS = [
    { id: 1,  name: 'Dr. Sarah Chen',       cat: 'doctor',        icon: 'fa-user-md',            spec: 'General practitioner',        rating: 4.9, reviews: 127,  price: 89,  unit: 'visit',   city: 'nairobi',      lat: -1.2860, lng: 36.8170, years: 12, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 2,  name: 'James Okonkwo',        cat: 'nurse',         icon: 'fa-user-nurse',         spec: 'Registered nurse',            rating: 5.0, reviews: 84,   price: 65,  unit: 'hour',    city: 'nairobi',      lat: -1.3000, lng: 36.8300, years: 8,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 3,  name: 'David Mwangi',         cat: 'electrician',   icon: 'fa-bolt',               spec: 'Certified electrician',       rating: 4.8, reviews: 203,  price: 120, unit: 'call-out',city: 'mombasa',      lat: -4.0400, lng: 39.6600, years: 15, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 4,  name: 'Dr. Aisha Patel',      cat: 'doctor',        icon: 'fa-user-md',            spec: 'Paediatrician',               rating: 4.9, reviews: 156,  price: 95,  unit: 'visit',   city: 'nairobi',      lat: -1.2750, lng: 36.8100, years: 10, avail: true, night: false, sameDay: true,  homeVisit: false, insured: true },
    { id: 5,  name: 'Grace Wanjiku',        cat: 'cleaner',       icon: 'fa-broom',              spec: 'Deep cleaning specialist',    rating: 4.7, reviews: 312,  price: 25,  unit: 'hour',    city: 'nairobi',      lat: -1.3100, lng: 36.8400, years: 6,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 6,  name: 'Brian Otieno',         cat: 'mechanic',      icon: 'fa-screwdriver-wrench', spec: 'Auto mechanic',               rating: 4.8, reviews: 178,  price: 70,  unit: 'hour',    city: 'kisumu',       lat: -0.0900, lng: 34.7600, years: 11, avail: true, night: false, sameDay: false, homeVisit: true,  insured: true },
    { id: 7,  name: 'Fatima Al-Rashid',     cat: 'cosmetologist', icon: 'fa-spa',                spec: 'Skin & beauty therapist',     rating: 4.9, reviews: 241,  price: 55,  unit: 'session', city: 'dubai',        lat: 25.2100, lng: 55.2800, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 8,  name: 'Michael Osei',         cat: 'barber',        icon: 'fa-cut',                spec: 'Master barber',               rating: 4.9, reviews: 389,  price: 30,  unit: 'session', city: 'nairobi',      lat: -1.2880, lng: 36.8260, years: 7,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: false },
    { id: 9,  name: 'Dr. Emily Ross',       cat: 'doctor',        icon: 'fa-user-md',            spec: 'Cardiologist',                rating: 5.0, reviews: 92,   price: 150, unit: 'visit',   city: 'newyork',      lat: 40.7200, lng: -74.0100, years: 18, avail: true, night: false, sameDay: false, homeVisit: false, insured: true },
    { id: 10, name: 'Samuel Kiprop',        cat: 'plumber',       icon: 'fa-faucet',             spec: 'Emergency plumber',           rating: 4.7, reviews: 145,  price: 85,  unit: 'hour',    city: 'nairobi',      lat: -1.2950, lng: 36.8150, years: 13, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 11, name: 'Lucy Achieng',         cat: 'nurse',         icon: 'fa-user-nurse',         spec: 'Paediatric nurse',            rating: 4.8, reviews: 118,  price: 58,  unit: 'hour',    city: 'kisumu',       lat: -0.0950, lng: 34.7700, years: 7,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 12, name: 'Daniel Kimani',        cat: 'cleaner',       icon: 'fa-broom',              spec: 'Office & post-construction',  rating: 4.6, reviews: 224,  price: 28,  unit: 'hour',    city: 'mombasa',      lat: -4.0500, lng: 39.6720, years: 5,  avail: false,night: false, sameDay: false, homeVisit: true,  insured: true },
    { id: 13, name: 'Zainab Hassan',        cat: 'hairdresser',   icon: 'fa-scissors',           spec: 'Braiding & styling',          rating: 4.9, reviews: 402,  price: 45,  unit: 'session', city: 'mombasa',      lat: -4.0380, lng: 39.6650, years: 10, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: false },
    { id: 14, name: 'Peter Njoroge',        cat: 'electrician',   icon: 'fa-bolt',               spec: 'Solar & wiring',              rating: 4.9, reviews: 167,  price: 110, unit: 'call-out',city: 'nairobi',      lat: -1.2820, lng: 36.8350, years: 14, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 15, name: 'Dr. Rajesh Menon',     cat: 'doctor',        icon: 'fa-user-md',            spec: 'Dermatologist',               rating: 4.8, reviews: 210,  price: 120, unit: 'visit',   city: 'london',       lat: 51.5100, lng: -0.1300, years: 16, avail: true, night: false, sameDay: true,  homeVisit: false, insured: true },
    { id: 16, name: 'Christine Adhiambo',   cat: 'cleaner',       icon: 'fa-broom',              spec: 'Home sanitisation',           rating: 4.8, reviews: 198,  price: 22,  unit: 'hour',    city: 'kisumu',       lat: -0.0880, lng: 34.7750, years: 4,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 17, name: 'Kevin Mutua',          cat: 'mechanic',      icon: 'fa-screwdriver-wrench', spec: 'Motorcycle & car',            rating: 4.7, reviews: 133,  price: 60,  unit: 'hour',    city: 'nairobi',      lat: -1.3050, lng: 36.8000, years: 9,  avail: false,night: false, sameDay: false, homeVisit: true,  insured: false },
    { id: 18, name: 'Sophie Bennett',       cat: 'hairdresser',   icon: 'fa-scissors',           spec: 'Colour specialist',           rating: 5.0, reviews: 156,  price: 75,  unit: 'session', city: 'london',       lat: 51.5000, lng: -0.1200, years: 8,  avail: true, night: false, sameDay: false, homeVisit: true,  insured: true },
    { id: 19, name: 'Ali Mohammed',         cat: 'barber',        icon: 'fa-cut',                spec: 'Fade & beard',                rating: 4.8, reviews: 276,  price: 35,  unit: 'session', city: 'dubai',        lat: 25.2000, lng: 55.2650, years: 6,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: false },
    { id: 20, name: 'Dr. Naomi Okafor',     cat: 'doctor',        icon: 'fa-user-md',            spec: 'Emergency physician',         rating: 4.9, reviews: 143,  price: 130, unit: 'visit',   city: 'losangeles',   lat: 34.0600, lng: -118.2500,years: 11, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 21, name: 'Hassan Yusuf',         cat: 'plumber',       icon: 'fa-faucet',             spec: 'Bathroom & pipefitting',      rating: 4.6, reviews: 97,   price: 75,  unit: 'hour',    city: 'mombasa',      lat: -4.0600, lng: 39.6800, years: 10, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 22, name: 'Esther Nyambura',      cat: 'cosmetologist', icon: 'fa-spa',                spec: 'Nails & lashes',              rating: 4.8, reviews: 187,  price: 40,  unit: 'session', city: 'nairobi',      lat: -1.2920, lng: 36.8220, years: 5,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: false },

    { id: 23, name: 'Patrick Njoroge',      cat: 'bricklayer',    icon: 'fa-trowel-bricks',      spec: 'Masonry & blockwork',         rating: 4.8, reviews: 142,  price: 45,  unit: 'hour',    city: 'nairobi',      lat: -1.2840, lng: 36.8390, years: 13, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 24, name: 'Musa Juma',            cat: 'bricklayer',    icon: 'fa-trowel-bricks',      spec: 'Plastering & finishes',       rating: 4.7, reviews: 98,   price: 40,  unit: 'hour',    city: 'mombasa',      lat: -4.0450, lng: 39.6650, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 25, name: 'John Kiplagat',        cat: 'bricklayer',    icon: 'fa-trowel-bricks',      spec: 'Paving & foundations',        rating: 4.9, reviews: 76,   price: 55,  unit: 'hour',    city: 'kisumu',       lat: -0.0930, lng: 34.7720, years: 15, avail: true, night: false, sameDay: false, homeVisit: true,  insured: true },

    { id: 26, name: 'Joseph Kamau',         cat: 'carpenter',     icon: 'fa-hammer',             spec: 'Custom furniture',            rating: 4.9, reviews: 214,  price: 50,  unit: 'hour',    city: 'nairobi',      lat: -1.2980, lng: 36.8180, years: 12, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 27, name: 'Thomas Odhiambo',      cat: 'carpenter',     icon: 'fa-hammer',             spec: 'Doors, windows & frames',     rating: 4.8, reviews: 156,  price: 45,  unit: 'hour',    city: 'kisumu',       lat: -0.0860, lng: 34.7650, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 28, name: 'Grace Muthoni',        cat: 'carpenter',     icon: 'fa-hammer',             spec: 'Kitchen & wardrobe fit-out',  rating: 5.0, reviews: 88,   price: 60,  unit: 'hour',    city: 'nairobi',      lat: -1.2900, lng: 36.8300, years: 10, avail: true, night: false, sameDay: false, homeVisit: true,  insured: true },

    { id: 29, name: 'Samuel Mwangi',        cat: 'driver',        icon: 'fa-car-side',           spec: 'Personal & executive',        rating: 4.9, reviews: 267,  price: 35,  unit: 'hour',    city: 'nairobi',      lat: -1.2880, lng: 36.8200, years: 10, avail: true, night: true,  sameDay: true,  homeVisit: false, insured: true },
    { id: 30, name: 'Aisha Bakari',         cat: 'driver',        icon: 'fa-car-side',           spec: 'Airport & city transfers',    rating: 4.8, reviews: 189,  price: 30,  unit: 'hour',    city: 'mombasa',      lat: -4.0420, lng: 39.6700, years: 7,  avail: true, night: true,  sameDay: true,  homeVisit: false, insured: true },
    { id: 31, name: 'David Ochieng',        cat: 'driver',        icon: 'fa-car-side',           spec: 'Long-distance & errands',     rating: 4.7, reviews: 134,  price: 32,  unit: 'hour',    city: 'nairobi',      lat: -1.3100, lng: 36.8100, years: 5,  avail: true, night: false, sameDay: true,  homeVisit: false, insured: true },

    { id: 32, name: 'Emmanuel Barasa',      cat: 'security',      icon: 'fa-shield-halved',      spec: 'Residential & estate patrol', rating: 4.9, reviews: 231,  price: 22,  unit: 'hour',    city: 'nairobi',      lat: -1.2870, lng: 36.8250, years: 11, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, quals: ['Licensed security officer', 'Police clearance (DCI)', 'First aid certified', 'Self-defence trained', 'Ex-military'] },
    { id: 33, name: 'Halima Noor',          cat: 'security',      icon: 'fa-shield-halved',      spec: 'Event & crowd security',      rating: 4.8, reviews: 164,  price: 28,  unit: 'hour',    city: 'mombasa',      lat: -4.0480, lng: 39.6690, years: 8,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, quals: ['Licensed security officer', 'Crowd management cert.', 'Police clearance', 'First aid certified', 'Conflict de-escalation'] },
    { id: 34, name: 'Victor Omondi',        cat: 'security',      icon: 'fa-shield-halved',      spec: 'Corporate & retail guarding', rating: 5.0, reviews: 98,   price: 35,  unit: 'hour',    city: 'nairobi',      lat: -1.2800, lng: 36.8150, years: 14, avail: true, night: true,  sameDay: false, homeVisit: true,  insured: true, quals: ['Licensed security officer', 'CCTV & access control cert.', 'Police clearance (DCI)', 'First aid certified', 'K9 handling trained'] },
    { id: 35, name: 'Ibrahim Suleiman',     cat: 'security',      icon: 'fa-shield-halved',      spec: 'Close protection (armed)',    rating: 4.9, reviews: 76,   price: 55,  unit: 'hour',    city: 'dubai',        lat: 25.2080, lng: 55.2750, years: 16, avail: true, night: true,  sameDay: false, homeVisit: true,  insured: true, quals: ['SIA-licensed close protection', 'Firearms licence', 'Advanced defensive driving', 'First aid & trauma care', 'Background-checked (Interpol)'] },
    { id: 36, name: 'Cynthia Wambui',       cat: 'security',      icon: 'fa-shield-halved',      spec: 'School & hospital security',  rating: 4.8, reviews: 142,  price: 24,  unit: 'hour',    city: 'kisumu',       lat: -0.0920, lng: 34.7680, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, quals: ['Licensed security officer', 'Police clearance', 'Child safeguarding cert.', 'First aid certified', 'CCTV monitoring'] },

    { id: 37, name: 'Dr. Thandiwe Nkosi',   cat: 'doctor',        icon: 'fa-user-md',            spec: 'General practitioner',        rating: 4.9, reviews: 189,  price: 75,  unit: 'consult', city: 'johannesburg', lat: -26.2000, lng: 28.0500, years: 12, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 38, name: 'Pieter van der Merwe', cat: 'electrician',   icon: 'fa-bolt',               spec: 'Solar & backup power',        rating: 4.8, reviews: 267,  price: 450, unit: 'call-out',city: 'capetown',     lat: -33.9200, lng: 18.4300, years: 15, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 39, name: 'Nomsa Dlamini',        cat: 'cleaner',       icon: 'fa-broom',              spec: 'Domestic & deep cleaning',    rating: 4.9, reviews: 341,  price: 120, unit: 'hour',    city: 'durban',       lat: -29.8600, lng: 31.0200, years: 8,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },

    { id: 40, name: 'Dr. Kagiso Molefe',    cat: 'doctor',        icon: 'fa-user-md',            spec: 'Paediatrician',               rating: 4.9, reviews: 112,  price: 85,  unit: 'consult', city: 'gaborone',     lat: -24.6300, lng: 25.9250, years: 10, avail: true, night: false, sameDay: true,  homeVisit: false, insured: true },
    { id: 41, name: 'Tebogo Segwabe',       cat: 'plumber',       icon: 'fa-faucet',             spec: 'Residential plumbing',        rating: 4.7, reviews: 98,   price: 280, unit: 'call-out',city: 'gaborone',     lat: -24.6250, lng: 25.9200, years: 9,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },

    { id: 42, name: 'Dr. Maria Shikongo',   cat: 'doctor',        icon: 'fa-user-md',            spec: 'Emergency physician',         rating: 4.8, reviews: 87,   price: 95,  unit: 'visit',   city: 'windhoek',     lat: -22.5600, lng: 17.0700, years: 11, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 43, name: 'Johan Pretorius',      cat: 'carpenter',     icon: 'fa-hammer',             spec: 'Built-in cupboards',          rating: 4.9, reviews: 156,  price: 420, unit: 'hour',    city: 'windhoek',     lat: -22.5650, lng: 17.0600, years: 14, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },

    { id: 44, name: 'Dr. Chanda Mulenga',   cat: 'doctor',        icon: 'fa-user-md',            spec: 'General practitioner',        rating: 4.8, reviews: 134,  price: 65,  unit: 'consult', city: 'lusaka',       lat: -15.3900, lng: 28.3250, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 45, name: 'Mwamba Chileshe',      cat: 'bricklayer',    icon: 'fa-trowel-bricks',      spec: 'Masonry & blockwork',         rating: 4.7, reviews: 78,   price: 180, unit: 'hour',    city: 'lusaka',       lat: -15.3950, lng: 28.3200, years: 11, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 46, name: 'Chileshe Bwalya',      cat: 'security',      icon: 'fa-shield-halved',      spec: 'Residential security',        rating: 4.8, reviews: 92,   price: 90,  unit: 'hour',    city: 'lusaka',       lat: -15.3900, lng: 28.3300, years: 8,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, quals: ['Licensed security officer (Zambia)', 'Police clearance', 'First aid certified', 'Self-defence trained'] },

    { id: 47, name: 'Dr. Ana Macuácua',     cat: 'doctor',        icon: 'fa-user-md',            spec: 'General practitioner',        rating: 4.8, reviews: 92,   price: 3200,unit: 'consult', city: 'maputo',       lat: -25.9700, lng: 32.5750, years: 10, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 48, name: 'Dr. Tendai Moyo',      cat: 'doctor',        icon: 'fa-user-md',            spec: 'General practitioner',        rating: 4.7, reviews: 76,   price: 50,  unit: 'consult', city: 'harare',       lat: -17.8300, lng: 31.0400, years: 8,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true },
    { id: 49, name: 'Thabo Mokoena',        cat: 'carpenter',     icon: 'fa-hammer',             spec: 'Custom furniture & roofing',  rating: 4.8, reviews: 64,   price: 280, unit: 'hour',    city: 'maseru',       lat: -29.3200, lng: 27.4900, years: 12, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true },
    { id: 50, name: 'Sipho Dlamini',        cat: 'security',      icon: 'fa-shield-halved',      spec: 'Residential & estate patrol', rating: 4.8, reviews: 88,   price: 95,  unit: 'hour',    city: 'mbabane',      lat: -26.3100, lng: 31.1400, years: 10, avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, quals: ['Licensed security officer (Eswatini)', 'Police clearance', 'First aid certified', 'Self-defence trained'] },

    /* ── NEW — one per category (added batch) ─────────────────────── */

    { id: 101, name: 'Dr. Mwamba Chileshe', cat: 'doctor',        icon: 'fa-user-md',
      spec: 'General practitioner',          rating: 4.9, reviews: 87,
      price: 15, unit: 'visit',              city: 'lusaka',
      lat: -15.3875, lng: 28.3228,           years: 12,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    { id: 102, name: 'Caristsr Chikwanda',  cat: 'nurse',         icon: 'fa-user-nurse',
      spec: 'Registered nurse — home care',  rating: 4.7, reviews: 41,
      price: 5,  unit: 'hour',               city: 'lusaka',
      lat: -15.3900, lng: 28.3300,           years: 6,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 103, name: 'Doreen Chilala',      cat: 'nurse',         icon: 'fa-user-nurse',
      spec: 'Registered nurse — home care',  rating: 4.7, reviews: 41,
      price: 5,  unit: 'hour',               city: 'mazabuka',
      lat: -15.8565, lng: 27.7531,           years: 6,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 104, name: 'Sister Thandi Mokoena', cat: 'nurse',       icon: 'fa-user-nurse',
      spec: 'Midwife',                       rating: 4.9, reviews: 63,
      price: 21, unit: 'hour',               city: 'johannesburg',
      lat: -26.2041, lng: 28.0473,           years: 10,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 105, name: 'Joseph Phiri',        cat: 'electrician',   icon: 'fa-bolt',
      spec: 'Residential & commercial wiring', rating: 4.6, reviews: 112,
      price: 7,  unit: 'call-out',           city: 'lusaka',
      lat: -15.3875, lng: 28.3228,           years: 9,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 106, name: 'Peter Okello',        cat: 'mechanic',      icon: 'fa-screwdriver-wrench',
      spec: 'Auto mechanic — Toyota / Nissan', rating: 4.7, reviews: 78,
      price: 4,  unit: 'hour',               city: 'mombasa',
      lat: -4.0435, lng: 39.6682,            years: 11,
      avail: true, night: false, sameDay: false, homeVisit: true, insured: true },

    { id: 107, name: 'Mercy Ndlovu',        cat: 'cleaner',       icon: 'fa-broom',
      spec: 'Deep cleaning & post-construction', rating: 4.8, reviews: 45,
      price: 5,  unit: 'hour',               city: 'windhoek',
      lat: -22.5609, lng: 17.0658,           years: 5,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    { id: 108, name: 'Brian Tembo',         cat: 'plumber',       icon: 'fa-faucet',
      spec: 'Plumbing & leak repairs',       rating: 4.5, reviews: 39,
      price: 6,  unit: 'hour',               city: 'lusaka',
      lat: -15.3900, lng: 28.3300,           years: 7,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 109, name: 'Kelvin Mutale',       cat: 'barber',        icon: 'fa-cut',
      spec: 'Men\u2019s cuts & beard grooming', rating: 4.9, reviews: 210,
      price: 2,  unit: 'session',            city: 'lusaka',
      lat: -15.3875, lng: 28.3228,           years: 4,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: false },

    { id: 110, name: 'Naledi Khumalo',      cat: 'hairdresser',   icon: 'fa-scissors',
      spec: 'Braids, weaves & natural hair', rating: 4.8, reviews: 156,
      price: 13, unit: 'session',            city: 'durban',
      lat: -29.8587, lng: 31.0218,           years: 8,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: false },

    { id: 111, name: 'Fatima Yusuf',        cat: 'cosmetologist', icon: 'fa-spa',
      spec: 'Skincare & makeup artist',      rating: 4.9, reviews: 98,
      price: 109, unit: 'session',           city: 'dubai',
      lat: 25.2048, lng: 55.2708,            years: 6,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    { id: 112, name: 'Moses Chanda',        cat: 'bricklayer',    icon: 'fa-trowel-bricks',
      spec: 'Masonry & bricklaying',         rating: 4.6, reviews: 33,
      price: 3,  unit: 'hour',               city: 'livingstone',
      lat: -17.8575, lng: 25.8544,           years: 14,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    { id: 113, name: 'Daniel Mwale',        cat: 'carpenter',     icon: 'fa-hammer',
      spec: 'Fitted kitchens & wardrobes',   rating: 4.7, reviews: 52,
      price: 5,  unit: 'hour',               city: 'lusaka',
      lat: -15.3950, lng: 28.3200,           years: 10,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    { id: 114, name: 'Emmanuel Kariuki',    cat: 'driver',        icon: 'fa-car-side',
      spec: 'Personal & corporate driver',   rating: 4.8, reviews: 67,
      price: 3,  unit: 'hour',               city: 'nairobi',
      lat: -1.2921, lng: 36.8219,            years: 9,
      avail: true, night: true, sameDay: true, homeVisit: false, insured: true },

    { id: 115, name: 'Isaac Banda',         cat: 'security',      icon: 'fa-shield-halved',
      spec: 'Residential security guard',    rating: 4.5, reviews: 28,
      price: 2,  unit: 'hour',               city: 'lusaka',
      lat: -15.3900, lng: 28.3300,           years: 5,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true,
      quals: ['Licensed security officer (Zambia)','Police clearance','First aid certified','Self-defence trained'] },

    { id: 116, name: 'Grace Phiri',         cat: 'nurse',         icon: 'fa-user-nurse',
      spec: 'Registered nurse — home care',  rating: 4.8, reviews: 27,
      price: 4,  unit: 'hour',               city: 'kitwe',
      lat: -12.8024, lng: 28.2132,           years: 5,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true },

    { id: 117, name: 'Moses Sakala',        cat: 'electrician',   icon: 'fa-bolt',
      spec: 'Residential wiring',            rating: 4.7, reviews: 41,
      price: 5,  unit: 'call-out',           city: 'ndola',
      lat: -12.9587, lng: 28.6366,           years: 8,
      avail: true, night: false, sameDay: true, homeVisit: true, insured: true },

    /* ── VEHICLES ────────────────────────────────────────────────── */

    { id: 51, name: 'Mercedes E-Class + Chauffeur', cat: 'vehicles', icon: 'fa-car-side',      spec: 'Executive wedding sedan',     rating: 5.0, reviews: 112,  price: 185, unit: 'day',     city: 'lusaka',       lat: -15.3900, lng: 28.3250, years: 6,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, occasions: ['wedding','vip','corporate','airport'], capacity: 3 },
    { id: 52, name: 'Land Cruiser Safari 4×4',      cat: 'vehicles', icon: 'fa-truck-monster', spec: 'Open-roof game viewer',       rating: 4.9, reviews: 187,  price: 220, unit: 'day',     city: 'lusaka',       lat: -15.4000, lng: 28.3100, years: 8,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, occasions: ['safari','vip','selfdrive'], capacity: 7 },
    { id: 53, name: 'Toyota Camry Airport Transfer',cat: 'vehicles', icon: 'fa-car-side',      spec: 'Executive airport transfers', rating: 4.8, reviews: 241,  price: 95,  unit: 'day',     city: 'lusaka',       lat: -15.3200, lng: 28.4500, years: 5,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, occasions: ['airport','corporate','vip'], capacity: 4 },
    { id: 54, name: 'Toyota Hiace Corporate Shuttle',cat: 'vehicles',icon: 'fa-van-shuttle',   spec: '14-seater conference shuttle',rating: 4.7, reviews: 168,  price: 160, unit: 'day',     city: 'lusaka',       lat: -15.4100, lng: 28.2900, years: 9,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, occasions: ['corporate','events','airport'], capacity: 14 },
    { id: 55, name: 'Party Minibus (26 seats)',     cat: 'vehicles', icon: 'fa-bus',           spec: 'Events, weddings & parties', rating: 4.8, reviews: 96,   price: 240, unit: 'day',     city: 'lusaka',       lat: -15.3800, lng: 28.3400, years: 7,  avail: true, night: true,  sameDay: true,  homeVisit: true,  insured: true, occasions: ['events','wedding','funeral'], capacity: 26 },
    { id: 56, name: 'Toyota Fortuner Self-Drive',   cat: 'vehicles', icon: 'fa-truck-monster', spec: 'Self-drive SUV · unlimited km',rating: 4.7,reviews: 134,  price: 135, unit: 'day',     city: 'lusaka',       lat: -15.3950, lng: 28.3150, years: 4,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, occasions: ['selfdrive','safari','events'], capacity: 5 },
    { id: 57, name: 'Victoria Falls Safari Jeep',   cat: 'vehicles', icon: 'fa-truck-monster', spec: 'Livingstone & Falls tours',  rating: 4.9, reviews: 203,  price: 195, unit: 'day',     city: 'livingstone',  lat: -17.8600, lng: 25.8500, years: 9,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, occasions: ['safari','vip','events'], capacity: 6 },
    { id: 58, name: 'Nairobi Safari Land Cruiser',  cat: 'vehicles', icon: 'fa-truck-monster', spec: 'Maasai Mara & Amboseli tours',rating: 4.9,reviews: 276,  price: 210, unit: 'day',     city: 'nairobi',      lat: -1.2864, lng: 36.8172, years: 10, avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, occasions: ['safari','vip','selfdrive'], capacity: 7 },
    { id: 59, name: 'Stretch Limousine',            cat: 'vehicles', icon: 'fa-car-side',      spec: 'Weddings & VIP occasions',   rating: 5.0, reviews: 142,  price: 320, unit: 'day',     city: 'johannesburg', lat: -26.2100, lng: 28.0500, years: 8,  avail: true, night: true,  sameDay: false, homeVisit: true,  insured: true, occasions: ['wedding','vip','events'], capacity: 8 },
    { id: 60, name: 'Vintage Kombi Tour Bus',       cat: 'vehicles', icon: 'fa-bus',           spec: 'Cape Town wine & city tours',rating: 4.8,reviews: 189,  price: 165, unit: 'day',     city: 'capetown',     lat: -33.9250, lng: 18.4250, years: 6,  avail: true, night: false, sameDay: true,  homeVisit: true,  insured: true, occasions: ['safari','events','selfdrive'], capacity: 10 },
    { id: 61, name: 'Rolls-Royce Phantom',          cat: 'vehicles', icon: 'fa-car-side',      spec: 'Ultra-luxury VIP chauffeur', rating: 5.0, reviews: 78,   price: 550, unit: 'day',     city: 'dubai',        lat: 25.2100, lng: 55.2700, years: 5,  avail: true, night: true,  sameDay: false, homeVisit: true,  insured: true, occasions: ['wedding','vip','corporate'], capacity: 3 },

    { id: 201, name: 'Toyota Land Cruiser V8',  cat: 'vehicles', icon: 'fa-truck-monster',
      spec: 'Chauffeur-driven VIP SUV',         rating: 4.9, reviews: 44,
      price: 68, unit: 'day',                   city: 'lusaka',
      lat: -15.3875, lng: 28.3228,              years: 8,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true,
      occasions: ['wedding','safari','vip','airport','corporate'], capacity: 7 },

    { id: 202, name: 'Mercedes-Benz E-Class',   cat: 'vehicles', icon: 'fa-car-side',
      spec: 'Executive sedan + suited chauffeur', rating: 4.8, reviews: 31,
      price: 95, unit: 'day',                   city: 'johannesburg',
      lat: -26.2041, lng: 28.0473,              years: 6,
      avail: true, night: true, sameDay: false, homeVisit: true, insured: true,
      occasions: ['wedding','corporate','vip','events'], capacity: 4 },

    { id: 203, name: 'Toyota Hiace (14-seater)', cat: 'vehicles', icon: 'fa-van-shuttle',
      spec: 'Group transfers & airport shuttles', rating: 4.6, reviews: 58,
      price: 93, unit: 'day',                   city: 'nairobi',
      lat: -1.2921, lng: 36.8219,               years: 9,
      avail: true, night: true, sameDay: true, homeVisit: true, insured: true,
      occasions: ['airport','events','corporate','selfdrive'], capacity: 14 }
  ];

  /* ----------------------------------------------------------------- STATE */

  var state = {
    q: '',
    city: '',
    category: '',
    sort: 'rating',
    currency: PH_DEFAULT_CURRENCY,
    occasion: '',
    userLoc: null,
    overrideCurrency: false     // true when the city filter set the currency
  };

  var pendingPro = null;

  /* --------------------------------------------------------------- HELPERS */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function esc(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }

  function haversine(lat1, lng1, lat2, lng2) {
    var R = 6371;
    function toRad(d) { return d * Math.PI / 180; }
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(a));
  }

  function distanceFor(p) {
    var origin = state.userLoc || (state.city ? PH_CITIES[state.city] : null);
    if (!origin) return null;
    return haversine(origin.lat, origin.lng, p.lat, p.lng);
  }

  function fmtDist(km) {
    if (km < 1) return Math.max(50, Math.round(km * 1000 / 50) * 50) + ' m';
    if (km < 10) return km.toFixed(1) + ' km';
    return Math.round(km) + ' km';
  }

  function stars(rating) {
    var out = '';
    for (var i = 1; i <= 5; i++) {
      if (rating >= i) out += '<i class="fas fa-star"></i>';
      else if (rating >= i - 0.5) out += '<i class="fas fa-star-half-alt"></i>';
      else out += '<i class="far fa-star"></i>';
    }
    return out;
  }

  function convert(usd) {
    var c = PH_CURRENCIES[state.currency] || PH_CURRENCIES.USD;
    var raw = usd * c.rate;
    return {
      symbol: c.symbol,
      value: Math.round(raw / c.step) * c.step,
      code: c.code,
      locale: c.locale
    };
  }

  function money(usd) {
    var c = convert(usd);
    return c.symbol + c.value.toLocaleString(c.locale);
  }

  function getQuals(p) {
    if (p.quals && p.quals.length) return p.quals;
    return PH_CAT_QUALS[p.cat] || [];
  }

  /* --------------------------------------------------- COUNTRY CURRENCY */

  /**
   * Read the user's registered country from localStorage.
   * Checks multiple keys because different parts of the site
   * (auth modal, wallet, etc.) store it under different names.
   * Returns an ISO-2 code (e.g. 'ZM') or '' if not found.
   */
  function getUserCountry() {
    var candidates = ['zbs_auth_user', 'zbs_user', 'authUser', 'user'];
    for (var i = 0; i < candidates.length; i++) {
      try {
        var raw = localStorage.getItem(candidates[i]);
        if (!raw) continue;
        var parsed = JSON.parse(raw);
        if (parsed && parsed.country) {
          return String(parsed.country).toUpperCase();
        }
      } catch (e) { /* not JSON — skip */ }
    }
    return '';
  }

  /**
   * Baseline currency = registered country → PH_COUNTRY_CURRENCY → USD.
   */
  function getBaselineCurrency() {
    var country = getUserCountry();
    if (country && PH_COUNTRY_CURRENCY[country]) {
      var code = PH_COUNTRY_CURRENCY[country];
      return PH_CURRENCIES[code] ? code : PH_DEFAULT_CURRENCY;
    }
    return PH_DEFAULT_CURRENCY;
  }

  /**
   * ISO-2 → regional-indicator emoji flag.
   */
  function countryToFlag(cc) {
    if (!cc || cc.length !== 2) return '';
    try {
      var base = 0x1F1E6;
      return String.fromCodePoint(
        base + (cc.charCodeAt(0) - 65),
        base + (cc.charCodeAt(1) - 65)
      );
    } catch (e) { return ''; }
  }

  /* ---------------------------------------------------------------- FILTER */

  function filterPros() {
    var q = state.q.trim().toLowerCase();
    return PH_PROS.filter(function (p) {
      if (p.cat === 'vehicles') return false;
      if (q) {
        var hay = (p.name + ' ' + p.spec + ' ' + p.cat).toLowerCase();
        if (hay.indexOf(q) === -1) return false;
      }
      if (state.city && p.city !== state.city) return false;
      if (state.category && p.cat !== state.category) return false;
      return true;
    }).sort(function (a, b) {
      if (state.sort === 'price-low')  return a.price - b.price;
      if (state.sort === 'price-high') return b.price - a.price;
      if (state.sort === 'experience') return b.years - a.years;
      if (state.sort === 'distance') {
        var da = distanceFor(a), db = distanceFor(b);
        if (da === null && db === null) return b.rating - a.rating;
        if (da === null) return 1;
        if (db === null) return -1;
        return da - db;
      }
      return b.rating - a.rating || b.reviews - a.reviews;
    });
  }

  function filterVehicles() {
    return PH_PROS.filter(function (p) {
      if (p.cat !== 'vehicles') return false;
      if (state.occasion && (p.occasions || []).indexOf(state.occasion) === -1) return false;
      return true;
    }).sort(function (a, b) { return b.rating - a.rating; });
  }

  /* ---------------------------------------------------------------- RENDER */

  function qualsBlock(p) {
    var list = getQuals(p);
    if (!list.length) return '';
    var shown = list.slice(0, 3);
    var extra = list.length - shown.length;
    return '' +
      '<div class="prohire-quals">' +
        '<div class="prohire-quals-title"><i class="fas fa-certificate"></i> Verified qualifications</div>' +
        '<div class="prohire-qual-list">' +
          shown.map(function (q) {
            return '<span class="prohire-qual"><i class="fas fa-check"></i> ' + esc(q) + '</span>';
          }).join('') +
          (extra > 0
            ? '<span class="prohire-qual prohire-qual-more" title="' + esc(list.slice(3).join(' · ')) + '">+' + extra + ' more</span>'
            : '') +
        '</div>' +
      '</div>';
  }

  function proCard(p) {
    var d = distanceFor(p);
    var cityInfo = PH_CITIES[p.city];
    var cityLabel = cityInfo ? cityInfo.label.split(',')[0] : p.city;

    var distBadge = d !== null
      ? '<span class="prohire-dist"><i class="fas fa-map-marker-alt"></i> ' + fmtDist(d) + '</span>'
      : '<span class="prohire-dist" style="background:#eef2f8;color:#5e6f88"><i class="fas fa-map-marker-alt"></i> ' + esc(cityLabel) + '</span>';

    return '' +
      '<article class="prohire-card" data-id="' + p.id + '">' +
        '<div class="prohire-card-top">' +
          '<div class="prohire-avatar"><i class="fas ' + p.icon + '"></i></div>' +
          '<div>' +
            '<div class="prohire-card-name">' + esc(p.name) + '</div>' +
            '<div class="prohire-card-spec"><i class="fas fa-briefcase"></i> ' + esc(p.spec) + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="prohire-card-rating">' + stars(p.rating) +
          '<span>' + p.rating.toFixed(1) + '</span>' +
          '<span class="reviews">(' + p.reviews + ')</span>' +
          distBadge +
        '</div>' +
        qualsBlock(p) +
        '<div class="prohire-card-footer">' +
          '<div class="prohire-price">' + money(p.price) + ' <small>/ ' + esc(p.unit) + '</small></div>' +
          '<button class="prohire-hire-btn" type="button" data-prohire-book="' + p.id + '">' +
            '<i class="fas fa-calendar-check"></i> Hire' +
          '</button>' +
        '</div>' +
      '</article>';
  }

  function vehicleCard(p) {
    var occs = (p.occasions || []).map(function (k) {
      var o = PH_OCCASIONS[k];
      return o ? '<span class="prohire-occ-badge">' + o.icon + ' ' + esc(o.label) + '</span>' : '';
    }).join('');

    var cap = p.capacity
      ? '<span class="prohire-vehicle-cap"><i class="fas fa-user-group"></i> ' + p.capacity + '</span>'
      : '';

    var cityName = PH_CITIES[p.city] ? PH_CITIES[p.city].label.split(',')[0] : p.city;

    return '' +
      '<article class="prohire-vehicle-card">' +
        '<div class="prohire-vehicle-hero">' +
          '<i class="fas ' + p.icon + '"></i>' + cap +
        '</div>' +
        '<div class="prohire-vehicle-body">' +
          '<div class="prohire-vehicle-name">' + esc(p.name) + '</div>' +
          '<div class="prohire-vehicle-loc"><i class="fas fa-location-dot"></i> ' + esc(cityName) + '</div>' +
          '<div class="prohire-vehicle-occs">' + occs + '</div>' +
          '<div class="prohire-vehicle-footer">' +
            '<div class="prohire-vehicle-price">' + money(p.price) + ' <small>/ day</small></div>' +
            '<button class="prohire-hire-btn" type="button" data-prohire-book="' + p.id + '">' +
              '<i class="fas fa-calendar-check"></i> Book' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
  }

  function renderPros() {
    var grid = $('#prohireGrid');
    if (!grid) return;
    var list = filterPros();
    grid.innerHTML = list.map(proCard).join('');
    var empty = $('#prohireEmpty');
    if (empty) empty.hidden = list.length > 0;
    var count = $('#prohireResultCount');
    if (count) count.textContent = list.length;
  }

  function renderVehicles() {
    var grid = $('#prohireVehiclesGrid');
    if (!grid) return;
    grid.innerHTML = filterVehicles().map(vehicleCard).join('');
  }

  /**
   * Apply the currency badge + re-render.
   * Label shows the reason: user country vs city override.
   */
  function refreshCurrency() {
    var c = PH_CURRENCIES[state.currency] || PH_CURRENCIES.USD;
    var badge = $('#prohireCurrencyBadge');
    if (badge) {
      var country = getUserCountry();
      var flag = countryToFlag(country);
      badge.textContent = (flag ? flag + ' ' : '') + c.code;

      if (state.overrideCurrency && state.city) {
        badge.title = 'Prices shown in ' + c.code + ' (city override: ' + state.city + ')';
      } else if (country) {
        badge.title = 'Prices shown in ' + c.code + ' based on your registered country';
      } else {
        badge.title = 'Prices shown in ' + c.code;
      }
    }
    renderPros();
    renderVehicles();
  }

  function applyCurrency(code, isCityOverride) {
    if (!PH_CURRENCIES[code]) code = PH_DEFAULT_CURRENCY;
    state.overrideCurrency = !!isCityOverride;
    if (state.currency === code) { refreshCurrency(); return; }
    state.currency = code;
    refreshCurrency();
  }

  /** Reset the currency to the user's registered country (or USD). */
  function resetCurrencyToUserCountry() {
    state.city = '';
    var locSel = $('#prohireLocationFilter');
    if (locSel) locSel.value = '';
    applyCurrency(getBaselineCurrency(), false);
  }

  /* ----------------------------------------------------------- CITY INJECTION */

  function injectCityOptions() {
    var sel = document.getElementById('prohireLocationFilter');
    if (!sel) return;

    var old = sel.querySelector('optgroup[data-remote="1"]');
    if (old) old.remove();

    var entries = Object.keys(PH_CITIES)
      .filter(function (k) {
        return !sel.querySelector('option[value="' + k + '"]');
      })
      .map(function (k) { return { key: k, label: PH_CITIES[k].label || k }; })
      .sort(function (a, b) { return a.label.localeCompare(b.label); });

    if (!entries.length) return;

    var group = document.createElement('optgroup');
    group.label = 'Other cities';
    group.setAttribute('data-remote', '1');

    entries.forEach(function (e) {
      var opt = document.createElement('option');
      opt.value = e.key;
      opt.textContent = e.label;
      group.appendChild(opt);
    });

    sel.appendChild(group);
  }

  /* ----------------------------------------------------------- ADD-PRO FLOW */

  function openAddProModal() {
    var m = document.getElementById('prohireAddProModal');
    if (!m) {
      if (typeof window.showToast === 'function') {
        window.showToast('Add-Pro form not found in the page.', 'fa-circle-exclamation');
      }
      return;
    }
    m.hidden = false;

    var list = document.getElementById('phCityList');
    if (list) {
      list.innerHTML = Object.keys(PH_CITIES)
        .map(function (k) { return '<option value="' + k + '">' + PH_CITIES[k].label + '</option>'; })
        .join('');
    }

    var geoBtn = document.getElementById('addProGeoBtn');
    if (geoBtn && !geoBtn._wired) {
      geoBtn._wired = true;
      geoBtn.addEventListener('click', function () {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(function (pos) {
          var latEl = document.getElementById('addProLat');
          var lngEl = document.getElementById('addProLng');
          if (latEl) latEl.value = pos.coords.latitude.toFixed(6);
          if (lngEl) lngEl.value = pos.coords.longitude.toFixed(6);
        });
      });
    }

    var form = document.getElementById('prohireAddProForm');
    if (form && !form._wired) {
      form._wired = true;
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        addProFromForm(form);
      });
    }
  }

  function closeAddProModal() {
    var m = document.getElementById('prohireAddProModal');
    if (m) m.hidden = true;
  }

  function addProFromForm(form) {
    var status = document.getElementById('addProStatus');
    var name   = (form.querySelector('#addProName')   || {}).value || '';
    var cat    = (form.querySelector('#addProCat')    || {}).value || '';
    var spec   = (form.querySelector('#addProSpec')   || {}).value || '';
    var cityRaw= (form.querySelector('#addProCity')   || {}).value || '';
    var price  = parseInt((form.querySelector('#addProPrice') || {}).value, 10);
    var unit   = (form.querySelector('#addProUnit')   || {}).value || 'hour';
    var years  = parseInt((form.querySelector('#addProYears') || {}).value, 10) || 0;

    name = String(name).trim();
    spec = String(spec).trim();
    cityRaw = String(cityRaw).trim();

    if (!name || !cat || !spec || !cityRaw || !price) {
      if (status) {
        status.hidden = false;
        status.style.color = '#b91c1c';
        status.textContent = 'Please fill all required fields.';
      }
      return;
    }

    var cityKey = cityRaw.toLowerCase().replace(/[^a-z0-9]+/g, '');
    var lat = parseFloat((form.querySelector('#addProLat') || {}).value);
    var lng = parseFloat((form.querySelector('#addProLng') || {}).value);

    if (!PH_CITIES[cityKey]) {
      if (isNaN(lat) || isNaN(lng)) {
        if (status) {
          status.hidden = false;
          status.style.color = '#b91c1c';
          status.textContent = 'New city "' + cityRaw + '" — please enter coordinates or click "Use my current location".';
        }
        return;
      }
      PH_CITIES[cityKey] = { lat: lat, lng: lng, label: cityRaw + ', (added)' };
      /* Default currency for the new city = user's own country */
      PH_CITY_CURRENCY[cityKey] = PH_CITY_CURRENCY[cityKey] || getBaselineCurrency();
    }

    var nextId = PH_PROS.reduce(function (m, p) { return p.id > m ? p.id : m; }, 0) + 1;
    var iconMap = {
      doctor:'fa-user-md', nurse:'fa-user-nurse', electrician:'fa-bolt',
      plumber:'fa-faucet', mechanic:'fa-screwdriver-wrench', cleaner:'fa-broom',
      barber:'fa-cut', hairdresser:'fa-scissors', cosmetologist:'fa-spa',
      bricklayer:'fa-trowel-bricks', carpenter:'fa-hammer',
      driver:'fa-car-side', security:'fa-shield-halved'
    };

    var newPro = {
      id: nextId, name: name, cat: cat,
      icon: iconMap[cat] || 'fa-user',
      spec: spec, rating: 5.0, reviews: 0,
      price: price, unit: unit, city: cityKey,
      lat: PH_CITIES[cityKey].lat, lng: PH_CITIES[cityKey].lng,
      years: years, avail: true, night: true, sameDay: true,
      homeVisit: true, insured: true
    };

    PH_PROS.push(newPro);

    try {
      var stored = JSON.parse(localStorage.getItem('prohire_extra_pros') || '[]');
      stored.push(newPro);
      localStorage.setItem('prohire_extra_pros', JSON.stringify(stored));
    } catch (e) {}

    if (status) {
      status.hidden = false;
      status.style.color = '#1f7a3d';
      status.textContent = '✓ ' + name + ' added.';
    }

    setTimeout(function () {
      closeAddProModal();
      form.reset();
      injectCityOptions();
      refreshCurrency();
    }, 900);
  }

  function restoreLocalPros() {
    try {
      var stored = JSON.parse(localStorage.getItem('prohire_extra_pros') || '[]');
      stored.forEach(function (p) {
        if (!p || p.id == null) return;
        if (PH_PROS.some(function (x) { return x.id === p.id; })) return;
        if (!PH_CITIES[p.city]) {
          PH_CITIES[p.city] = {
            lat: Number(p.lat) || 0,
            lng: Number(p.lng) || 0,
            label: p.city + ', (added)'
          };
          PH_CITY_CURRENCY[p.city] = getBaselineCurrency();
        }
        PH_PROS.push(p);
      });
    } catch (e) {}
  }

  /* ----------------------------------------------------------- VEHICLES SCROLL */

  function scrollToVehicles() {
    var modal = $('#prohireModal');
    if (!modal) return;
    var section = modal.querySelector('.prohire-vehicles-section');
    if (!section) return;

    var scroller = modal.querySelector('.prohire-content') || modal;
    var targetTop = section.offsetTop - 8;

    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top: targetTop, behavior: 'smooth' });
    } else {
      scroller.scrollTop = targetTop;
    }

    section.classList.add('prohire-vehicles-flash');
    setTimeout(function () {
      section.classList.remove('prohire-vehicles-flash');
    }, 1500);
  }

  /* ----------------------------------------------------------- OPEN/CLOSE */

  function openProHire() {
    var modal = $('#prohireModal');
    if (!modal) {
      console.warn('[ProHire] #prohireModal not found in DOM');
      return;
    }
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    refreshCurrency();
    var content = modal.querySelector('.prohire-content');
    if (content) content.scrollTop = 0;
  }

  function closeProHire() {
    var modal = $('#prohireModal');
    if (!modal) return;
    modal.hidden = true;
    if (!$('#prohireBookingModal') || $('#prohireBookingModal').hidden) {
      document.body.style.overflow = '';
    }
  }

  function openBooking(id) {
    var p = PH_PROS.find(function (x) { return x.id === Number(id); });
    if (!p) return;
    pendingPro = p;

    var iconEl  = $('#prohireBookingIcon');
    var titleEl = $('#prohireBookingTitle');
    var rateEl  = $('#prohireBookingRate');
    var qualsWrap = $('#prohireBookingQuals');
    var qualsList = $('#prohireBookingQualsList');
    var statusEl = $('#prohireBookingStatus');

    if (iconEl)  iconEl.className = 'fas ' + p.icon;
    if (titleEl) titleEl.textContent = 'Book ' + p.name;
    if (rateEl)  rateEl.textContent = money(p.price) + ' / ' + p.unit;
    if (statusEl) { statusEl.hidden = true; statusEl.className = 'prohire-booking-status'; }

    var quals = getQuals(p);
    if (qualsWrap && qualsList) {
      if (quals.length) {
        qualsList.innerHTML = quals.map(function (q) {
          return '<span class="prohire-qual"><i class="fas fa-check"></i> ' + esc(q) + '</span>';
        }).join('');
        qualsWrap.classList.add('show');
      } else {
        qualsList.innerHTML = '';
        qualsWrap.classList.remove('show');
      }
    }

    var notes = $('#prohireBookingNotes');
    var when  = $('#prohireBookingWhen');
    if (notes) notes.value = '';
    if (when)  when.value = 'asap';

    var bm = $('#prohireBookingModal');
    if (bm) {
      bm.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(function () {
        var sel = $('#prohireBookingWhen');
        if (sel) sel.focus();
      }, 60);
    }
  }

  function closeBooking() {
    var bm = $('#prohireBookingModal');
    if (!bm) return;
    bm.hidden = true;
    if (!$('#prohireModal') || $('#prohireModal').hidden) {
      document.body.style.overflow = '';
    }
    pendingPro = null;
  }

  function confirmBooking() {
    if (!pendingPro) return;
    var when = $('#prohireBookingWhen');
    var whenLabel = when && when.selectedOptions[0]
      ? when.selectedOptions[0].textContent
      : 'as soon as possible';
    var name = pendingPro.name;

    var statusEl = $('#prohireBookingStatus');
    if (statusEl) {
      statusEl.className = 'prohire-booking-status';
      statusEl.textContent = '✓ Request sent to ' + name + ' — ' + whenLabel.toLowerCase() + '.';
      statusEl.hidden = false;
    }

    if (typeof window.showToast === 'function') {
      window.showToast('Request sent to ' + name + '.', 'fa-circle-check');
    }

    setTimeout(function () {
      closeBooking();
    }, 1400);
  }

  /* -------------------------------------------------------- GEOLOCATION */

  function useLocation() {
    var btn = $('#prohireUseLocation');
    var txt = $('#prohireLocText');

    if (!navigator.geolocation) {
      if (typeof window.showToast === 'function') {
        window.showToast('Geolocation is not supported by this browser.', 'fa-circle-exclamation');
      }
      return;
    }

    if (btn) btn.classList.add('loading');
    if (txt) txt.textContent = 'Detecting…';

    navigator.geolocation.getCurrentPosition(function (pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      state.userLoc = { lat: lat, lng: lng };

      var nearest = null;
      var nearestDist = Infinity;
      Object.keys(PH_CITIES).forEach(function (k) {
        var c = PH_CITIES[k];
        var d = haversine(lat, lng, c.lat, c.lng);
        if (d < nearestDist) { nearestDist = d; nearest = k; }
      });

      if (btn) { btn.classList.remove('loading'); btn.classList.add('detected'); }

      if (nearestDist <= 120) {
        state.city = nearest;
        var locSel = $('#prohireLocationFilter');
        if (locSel) locSel.value = nearest;
        if (txt) txt.textContent = PH_CITIES[nearest].label.split(',')[0];
        /* Location pinning = city override */
        applyCurrency(PH_CITY_CURRENCY[nearest] || getBaselineCurrency(), true);
      } else {
        state.city = '';
        var locSel2 = $('#prohireLocationFilter');
        if (locSel2) locSel2.value = '';
        if (txt) txt.textContent = 'Location detected';
        state.sort = 'distance';
        var sortSel = $('#prohireSortBy');
        if (sortSel) sortSel.value = 'distance';
        /* No city match — fall back to user's country */
        applyCurrency(getBaselineCurrency(), false);
      }

      renderPros();
      renderVehicles();

      if (typeof window.showToast === 'function') {
        window.showToast('Location detected — distances updated.', 'fa-location-dot');
      }
    }, function (err) {
      if (btn) btn.classList.remove('loading');
      if (txt) txt.textContent = 'Use my location';

      var msg = 'Could not detect your location.';
      if (err && err.code === 1) msg = 'Location permission denied.';
      else if (err && err.code === 2) msg = 'Location unavailable.';
      else if (err && err.code === 3) msg = 'Location request timed out.';

      if (typeof window.showToast === 'function') {
        window.showToast(msg, 'fa-circle-exclamation');
      }
    }, {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    });
  }

  /* --------------------------------------------------------------- EVENTS */

  document.addEventListener('click', function (e) {
    var actionEl = e.target.closest('[data-action]');

    if (actionEl && actionEl.dataset.action === 'openProHireHub') {
      e.preventDefault(); e.stopPropagation();
      openProHire();
      return;
    }

    if (actionEl && actionEl.dataset.action === 'openProHireVehicles') {
      e.preventDefault(); e.stopPropagation();
      state.category = 'vehicles';
      var sel = $('#prohireCategoryFilter');
      if (sel) sel.value = 'vehicles';
      $$('#prohireCategoryBar .prohire-cat-chip').forEach(function (c) {
        c.classList.toggle('active', c.dataset.cat === 'vehicles');
      });
      openProHire();
      setTimeout(scrollToVehicles, 150);
      return;
    }

    if (actionEl && actionEl.dataset.action === 'closeProHireHub') {
      e.preventDefault(); e.stopPropagation();
      closeProHire();
      return;
    }

    if (actionEl && actionEl.dataset.action === 'closeProHireBooking') {
      e.preventDefault(); e.stopPropagation();
      closeBooking();
      return;
    }

    if (actionEl && actionEl.dataset.action === 'openProHireAddPro') {
      e.preventDefault(); e.stopPropagation();
      openAddProModal();
      return;
    }

    if (actionEl && actionEl.dataset.action === 'closeProHireAddPro') {
      e.preventDefault(); e.stopPropagation();
      closeAddProModal();
      return;
    }

    var bookBtn = e.target.closest('[data-prohire-book]');
    if (bookBtn) {
      e.preventDefault(); e.stopPropagation();
      openBooking(bookBtn.dataset.prohireBook);
      return;
    }

    var modal = $('#prohireModal');
    if (modal && !modal.hidden && e.target === modal) {
      closeProHire();
      return;
    }
    var bm = $('#prohireBookingModal');
    if (bm && !bm.hidden && e.target === bm) {
      closeBooking();
    }
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var ap = document.getElementById('prohireAddProModal');
    if (ap && !ap.hidden) { closeAddProModal(); return; }
    var bm = $('#prohireBookingModal');
    if (bm && !bm.hidden) { closeBooking(); return; }
    var modal = $('#prohireModal');
    if (modal && !modal.hidden) closeProHire();
  });

  /* ---------------------------------------------------------------- INIT */

  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    /* Restore any locally-added pros before first render */
    restoreLocalPros();

    var search = $('#prohireSearchInput');
    if (search) {
      var t;
      search.addEventListener('input', function () {
        clearTimeout(t);
        var v = search.value;
        t = setTimeout(function () {
          state.q = v;
          renderPros();
        }, 180);
      });
    }

    var locSel = $('#prohireLocationFilter');
    if (locSel) {
      locSel.addEventListener('change', function () {
        state.city = locSel.value;
        /* City overrides; empty = fall back to registration country */
        var code = state.city
          ? (PH_CITY_CURRENCY[state.city] || getBaselineCurrency())
          : getBaselineCurrency();
        applyCurrency(code, !!state.city);
        renderPros();
      });
    }

    var sortSel = $('#prohireSortBy');
    if (sortSel) {
      sortSel.addEventListener('change', function () {
        state.sort = sortSel.value;
        renderPros();
      });
    }

    var catSel = $('#prohireCategoryFilter');
    if (catSel) {
      catSel.addEventListener('change', function () {
        state.category = catSel.value;
        $$('#prohireCategoryBar .prohire-cat-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.cat === state.category);
        });
        renderPros();
        if (state.category === 'vehicles') scrollToVehicles();
      });
    }

    var catBar = $('#prohireCategoryBar');
    if (catBar) {
      catBar.addEventListener('click', function (e) {
        var chip = e.target.closest('.prohire-cat-chip');
        if (!chip) return;
        var cat = chip.dataset.cat || '';
        state.category = cat;
        $$('#prohireCategoryBar .prohire-cat-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.cat === cat);
        });
        var sel = $('#prohireCategoryFilter');
        if (sel) sel.value = cat;
        renderPros();
        if (cat === 'vehicles') scrollToVehicles();
      });
    }

    var occBar = $('#prohireOccasionBar');
    if (occBar) {
      occBar.addEventListener('click', function (e) {
        var chip = e.target.closest('.prohire-occasion-chip');
        if (!chip) return;
        var occ = chip.dataset.occasion || '';
        state.occasion = occ;
        $$('#prohireOccasionBar .prohire-occasion-chip').forEach(function (c) {
          c.classList.toggle('active', c.dataset.occasion === occ);
        });
        renderVehicles();
      });
    }

    var locBtn = $('#prohireUseLocation');
    if (locBtn) locBtn.addEventListener('click', useLocation);

    var confirmBtn = $('#prohireBookingConfirm');
    if (confirmBtn) confirmBtn.addEventListener('click', confirmBooking);

    /* Baseline currency = user's registered country */
    state.currency = getBaselineCurrency();
    state.overrideCurrency = false;

    injectCityOptions();
    refreshCurrency();

    /* If the user logs in / out on another tab, react to storage changes */
    window.addEventListener('storage', function (e) {
      if (e.key === 'zbs_auth_user' || e.key === 'zbs_user' ||
          e.key === 'authUser' || e.key === 'user') {
        /* Only reset when there's no active city override */
        if (!state.overrideCurrency) {
          applyCurrency(getBaselineCurrency(), false);
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  /* --------------------------------------------------------- PUBLIC API */

  window.ProHire = {
    open: openProHire,
    close: closeProHire,
    openBooking: openBooking,
    openAddPro: openAddProModal,
    closeAddPro: closeAddProModal,
    scrollToVehicles: scrollToVehicles,

    /* Re-render after external data changes */
    refresh: refreshCurrency,
    injectCityOptions: injectCityOptions,

    /* Country-based currency helpers — call these after login/logout */
    resetCurrencyToUserCountry: resetCurrencyToUserCountry,
    getUserCountry: getUserCountry,
    getBaselineCurrency: getBaselineCurrency,

    /* Data exposed for external scripts */
    CITIES:           PH_CITIES,
    CURRENCIES:       PH_CURRENCIES,
    CITY_CURRENCY:    PH_CITY_CURRENCY,
    COUNTRY_CURRENCY: PH_COUNTRY_CURRENCY,
    DEFAULT_CURRENCY: PH_DEFAULT_CURRENCY,
    PROS:             PH_PROS,

    /* Register a new city at runtime */
    addCity: function (key, lat, lng, label, currencyCode) {
      if (!key || lat == null || lng == null) return false;
      PH_CITIES[key] = { lat: Number(lat), lng: Number(lng), label: label || key };
      if (currencyCode && PH_CURRENCIES[currencyCode]) {
        PH_CITY_CURRENCY[key] = currencyCode;
      }
      injectCityOptions();
      return true;
    },

    /* Register a new pro at runtime */
    addPro: function (pro) {
      if (!pro || pro.id == null || !pro.name || !pro.city) return false;
      if (!PH_CITIES[pro.city]) {
        if (pro.lat == null || pro.lng == null) return false;
        PH_CITIES[pro.city] = {
          lat: Number(pro.lat),
          lng: Number(pro.lng),
          label: pro.city + ', (added)'
        };
      }
      if (PH_PROS.some(function (x) { return x.id === pro.id; })) return false;
      PH_PROS.push(pro);
      injectCityOptions();
      refreshCurrency();
      return true;
    }
  };

})();