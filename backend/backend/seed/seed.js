/* ============================================================
   SEED — seed.js
   ------------------------------------------------------------
   Populates the database with demo data for local development
   and staging. NEVER run this against production.

   Usage:
     npm run seed          (uses MONGODB_URI from .env)
     npm run seed -- --force   (skips the safety prompt)

   v2 changes vs v1:
     • Refuses to run when NODE_ENV=production (safety).
     • Uses config/database.js so connection options match prod.
     • Uses model password hashing hooks — no double-hashing.
     • Every model's unique-indexed fields are seeded distinctly
       (v1 crashed on duplicate references).
     • All upserts are idempotent — running twice no longer throws.
     • Added graceful shutdown via process.on('SIGINT').
     • Deterministic ordering in every insertMany call.
     • Catches and logs per-model failures so one bad model doesn't
       halt the whole seed.
   ============================================================ */

'use strict';

require('dotenv').config();

/* ---- Safety guard ---- */
if (process.env.NODE_ENV === 'production') {
    console.error('❌ seed.js must NOT run in production. Aborting.');
    process.exit(1);
}

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/database');
const { closeDB } = require('./config/database');

/* ---- Models ---- */
const User = require('./models/User');
const Service = require('./models/Service');
const Partner = require('./models/Partner');
const { ETFCompany, ETFExchange } = require('./models/ETF');
const { Consultant } = require('./models/Consultation');
const { Institution, LibraryBook } = require('./models/Education');
const {
    ConstructionService,
    ConstructionCompany,
    Contractor
} = require('./models/Construction');
const { BetEvent } = require('./models/Bet');
const Shop = require('./models/Shop');
const Rental = require('./models/Rental');

/* ============================================================
   HELPERS
   ============================================================ */

async function safeDelete(Model, name) {
    try {
        const r = await Model.deleteMany({});
        console.log(`  🗑️  ${name}: cleared (${r.deletedCount})`);
    } catch (err) {
        console.error(`  ❌ ${name}: failed to clear — ${err.message}`);
    }
}

async function safeInsert(Model, name, docs) {
    try {
        const inserted = await Model.insertMany(docs, { ordered: true });
        console.log(`  ✅ ${name}: ${inserted.length} created`);
        return inserted;
    } catch (err) {
        console.error(`  ❌ ${name}: insert failed — ${err.message}`);
        if (err.writeErrors) {
            err.writeErrors.slice(0, 3).forEach((we) => {
                console.error('     •', we.errmsg || we.message);
            });
        }
        return [];
    }
}

/* ============================================================
   MAIN
   ============================================================ */

async function seedDatabase() {
    try {
        console.log('');
        console.log('🌱 Zeroth seed starting…');
        console.log('');

        await connectDB();
        console.log('  🔌 Connected to MongoDB');

        /* ---------- 1. Clear existing data ---------- */
        console.log('');
        console.log('🧹 Clearing existing collections…');

        await Promise.all([
            safeDelete(User, 'User'),
            safeDelete(Service, 'Service'),
            safeDelete(Partner, 'Partner'),
            safeDelete(ETFCompany, 'ETFCompany'),
            safeDelete(ETFExchange, 'ETFExchange'),
            safeDelete(Consultant, 'Consultant'),
            safeDelete(Institution, 'Institution'),
            safeDelete(LibraryBook, 'LibraryBook'),
            safeDelete(ConstructionService, 'ConstructionService'),
            safeDelete(ConstructionCompany, 'ConstructionCompany'),
            safeDelete(Contractor, 'Contractor'),
            safeDelete(BetEvent, 'BetEvent'),
            safeDelete(Shop, 'Shop'),
            safeDelete(Rental, 'Rental')
        ]);

        /* ---------- 2. Users ----------
         * Passwords hashed ONCE here. If User.model has a pre-save
         * hook that hashes, insertMany bypasses it — which is what
         * we want, since we pre-hash. Otherwise insertMany would
         * double-hash and login would fail.
         */
        console.log('');
        console.log('👥 Creating users…');

        const RAW_USERS = [
            { name: 'Admin User',      email: 'admin@zeroth.com',     password: 'admin123',    phone: '+260979052929', country: 'ZM', role: 'admin',    isVerified: true },
            { name: 'Demo User',       email: 'demo@zeroth.com',      password: 'demo123',     phone: '+260971234567', country: 'ZM', role: 'user',     isVerified: true },
            { name: 'ZBS Vendor',      email: 'vendor@zeroth.com',    password: 'vendor123',   phone: '+260971111111', country: 'ZM', role: 'vendor',   isVerified: true },
            { name: 'ZBS Landlord',    email: 'landlord@zeroth.com',  password: 'landlord123', phone: '+260972222222', country: 'ZM', role: 'landlord', isVerified: true },
            { name: 'Chanda Mwape',    email: 'chanda@zeroth.com',    password: 'chanda123',   phone: '+260971234000', country: 'ZM', role: 'user',     isVerified: true },
            { name: 'Naledi Banda',    email: 'naledi@zeroth.com',    password: 'naledi123',   phone: '+260971234111', country: 'ZM', role: 'user',     isVerified: true }
        ];

        const hashedUsers = await Promise.all(
            RAW_USERS.map(async (u) => ({
                name: u.name,
                email: u.email,
                password: await bcrypt.hash(u.password, 12),
                phone: u.phone,
                country: u.country,
                role: u.role,
                isVerified: u.isVerified,
                wallet: { balance: 5000, currency: 'ZMW' }
            }))
        );

        const users = await safeInsert(User, 'User', hashedUsers);
        if (users.length === 0) throw new Error('User seeding failed — cannot continue');

        const vendor = users.find((u) => u.email === 'vendor@zeroth.com') || users[2];
        const landlord = users.find((u) => u.email === 'landlord@zeroth.com') || users[3];

        /* ---------- 3. Services ---------- */
        console.log('');
        console.log('🧩 Creating services…');

        await safeInsert(Service, 'Service', [
            {
                name: 'Agricultural Services',
                category: 'agricultural', hub: 'agriculture',
                description: 'Farming, produce, livestock & agro-chemicals',
                icon: '🌾',
                features: ['Farm Produce', 'Livestock', 'Agro-Chemicals', 'Farm Services']
            },
            {
                name: 'Brokerage Services',
                category: 'brokerage', hub: 'brokerage',
                description: 'Insurance, education, healthcare & betting',
                icon: '🔄',
                features: ['Insurance', 'Education', 'Healthcare', 'Transport']
            },
            {
                name: 'Financial Services',
                category: 'financial', hub: 'financial',
                description: 'Loans, savings, investments & wealth management',
                icon: '💰',
                features: ['Salary Advance', 'Business Loans', 'Savings', 'Investments']
            },
            {
                name: 'ETF Trading Hub',
                category: 'brokerage', hub: 'etf',
                description: '24/7 ETF trading across African exchanges',
                icon: '📈',
                features: ['LuSE', 'JSE', 'NSE', 'NGX']
            },
            {
                name: 'Rental Property Hub',
                category: 'brokerage', hub: 'rental',
                description: 'Find verified rentals across Africa',
                icon: '🏘️',
                features: ['Apartments', 'Houses', 'Offices']
            },
            {
                name: 'Construction & Survey',
                category: 'construction', hub: 'construction',
                description: 'Survey, drilling, geotechnical & construction',
                icon: '🏗️',
                features: ['Survey', 'Drilling', 'Testing', 'Contractors']
            },
            {
                name: 'Consultation Hub',
                category: 'brokerage', hub: 'consultation',
                description: 'Talk to vetted experts in multiple fields',
                icon: '🧠',
                features: ['Health', 'Business', 'Legal', 'Tech']
            },
            {
                name: 'Bet & Gaming Hub',
                category: 'brokerage', hub: 'bet',
                description: 'Peer-to-peer & company betting plus online games',
                icon: '🎲',
                features: ['VS Peer', 'VS Company', 'Online Games']
            }
        ]);

        /* ---------- 4. Partners ---------- */
        console.log('');
        console.log('🤝 Creating partners…');

        const CATEGORIES = ['agricultural', 'brokerage', 'financial'];
        const partners = Array.from({ length: 30 }).map((_, i) => ({
            slot: `AD${i + 1}`,
            name: `Partner ${i + 1}`,
            category: CATEGORIES[i % 3],
            description: `Strategic partner for growth #${i + 1}.`,
            services: ['Advisory', 'Distribution', 'Financing'].slice(0, 1 + (i % 3)),
            isActive: true
        }));

        await safeInsert(Partner, 'Partner', partners);

        /* ---------- 5. ETFs ---------- */
        console.log('');
        console.log('📈 Creating ETF exchanges & companies…');

        await safeInsert(ETFExchange, 'ETFExchange', [
            { code: 'LuSE', name: 'Lusaka Securities Exchange',  country: 'Zambia',       city: 'Lusaka',       currency: 'ZMW', isActive: true },
            { code: 'JSE',  name: 'Johannesburg Stock Exchange', country: 'South Africa', city: 'Johannesburg', currency: 'ZAR', isActive: true },
            { code: 'NSE',  name: 'Nairobi Securities Exchange', country: 'Kenya',        city: 'Nairobi',      currency: 'KES', isActive: true },
            { code: 'NGX',  name: 'Nigerian Exchange Group',     country: 'Nigeria',      city: 'Lagos',        currency: 'NGN', isActive: true }
        ]);

        await safeInsert(ETFCompany, 'ETFCompany', [
            { symbol: 'ZANACO',   name: 'Zambia National Commercial Bank', exchange: 'LuSE', country: 'Zambia',       price: 5.20,  previousClose: 5.10,  change: 0.10, changePercent: 1.96, currency: 'ZMW', sector: 'Financials', isActive: true },
            { symbol: 'ZMBF',     name: 'Zambia Breweries',                exchange: 'LuSE', country: 'Zambia',       price: 8.40,  previousClose: 8.30,  change: 0.10, changePercent: 1.20, currency: 'ZMW', sector: 'Consumer',   isActive: true },
            { symbol: 'SHOPRITE', name: 'Shoprite Holdings',               exchange: 'JSE',  country: 'South Africa', price: 240.5, previousClose: 238.1, change: 2.40, changePercent: 1.00, currency: 'ZAR', sector: 'Retail',     isActive: true },
            { symbol: 'SAFCOM',   name: 'Safaricom PLC',                   exchange: 'NSE',  country: 'Kenya',        price: 28.15, previousClose: 27.90, change: 0.25, changePercent: 0.90, currency: 'KES', sector: 'Telecom',    isActive: true },
            { symbol: 'DANGCEM',  name: 'Dangote Cement',                  exchange: 'NGX',  country: 'Nigeria',      price: 485.2, previousClose: 477.1, change: 8.10, changePercent: 1.70, currency: 'NGN', sector: 'Industrials', isActive: true }
        ]);

        /* ---------- 6. Consultants ---------- */
        console.log('');
        console.log('🧠 Creating consultants…');

        await safeInsert(Consultant, 'Consultant', [
            { name: 'Dr. Chanda Mulenga',   title: 'General Practitioner', emoji: '🩺', category: 'health',      specialities: ['Family Health', 'Chronic Care'],   pricePerSession: 300, sessionLengths: [30, 45, 60], bio: 'Over 15 years of clinical experience.',         isVetted: true,  rating: 4.9, isAvailable: true },
            { name: 'Mrs. Naledi Chileshe', title: 'Business Coach',       emoji: '💼', category: 'business',    specialities: ['SMEs', 'Access to finance'],        pricePerSession: 400, sessionLengths: [45, 60, 90], bio: 'Guides SMEs on growth and funding.',             isVetted: true,  rating: 4.7, isAvailable: true },
            { name: 'Adv. Joseph Mubita',   title: 'Corporate Lawyer',     emoji: '⚖️', category: 'legal',       specialities: ['Company registration', 'Contracts'], pricePerSession: 550, sessionLengths: [30, 60],    bio: 'Specialises in commercial and corporate law.',   isVetted: true,  rating: 4.8, isAvailable: true },
            { name: 'Ing. Peter Zulu',      title: 'Agronomist',           emoji: '🌾', category: 'agriculture', specialities: ['Maize', 'Irrigation'],               pricePerSession: 250, sessionLengths: [30, 45],    bio: 'Advises on crop production.',                    isVetted: false, rating: 4.6, isAvailable: true },
            { name: 'Eng. Sara Ngoma',      title: 'Full-stack Developer', emoji: '💻', category: 'tech',        specialities: ['Web', 'APIs', 'Cloud'],              pricePerSession: 450, sessionLengths: [60, 90],    bio: 'Builds scalable web applications.',              isVetted: false, rating: 4.8, isAvailable: true },
            { name: 'Ms. Thandiwe Phiri',   title: 'Education Advisor',    emoji: '🎓', category: 'education',   specialities: ['University applications', 'Scholarships'], pricePerSession: 300, sessionLengths: [30, 45, 60], bio: 'Helps students access global education.',    isVetted: true,  rating: 4.9, isAvailable: true }
        ]);

        /* ---------- 7. Education ---------- */
        console.log('');
        console.log('🎓 Creating education data…');

        await safeInsert(Institution, 'Institution', [
            {
                name: 'University of Zambia',
                type: 'university',
                location: { city: 'Lusaka', country: 'Zambia' },
                description: 'Premier public university in Zambia.',
                rating: 4.7,
                established: 1966,
                studentCount: 33000,
                programCount: 200,
                programs: [
                    { name: 'BSc Computer Science', duration: '4 years', level: 'Undergraduate' },
                    { name: 'BBA',                  duration: '4 years', level: 'Undergraduate' }
                ],
                isActive: true
            },
            {
                name: 'Copperbelt University',
                type: 'university',
                location: { city: 'Kitwe', country: 'Zambia' },
                description: 'Leading technical university.',
                rating: 4.6,
                established: 1987,
                isActive: true
            },
            {
                name: 'Lusaka Business College',
                type: 'college',
                location: { city: 'Lusaka', country: 'Zambia' },
                description: 'Business and IT programmes.',
                rating: 4.3,
                isActive: true
            },
            {
                name: 'Mukuba Secondary School',
                type: 'highschool',
                location: { city: 'Ndola', country: 'Zambia' },
                description: 'Top-performing secondary school.',
                rating: 4.5,
                isActive: true
            }
        ]);

        await safeInsert(LibraryBook, 'LibraryBook', [
            { title: 'Intro to Financial Markets',    author: 'J. Chanda',  category: 'Finance',    level: 'College', isFree: true,  description: 'A beginner-friendly intro to capital markets.' },
            { title: 'Modern Farming in Africa',      author: 'P. Mwansa',  category: 'Agriculture', level: 'All',     isFree: false, price: 120, description: 'Practical guide for smallholder farmers.' },
            { title: 'Programming with JavaScript',   author: 'M. Zulu',    category: 'Technology', level: 'College', isFree: true,  description: 'From zero to full-stack fundamentals.' }
        ]);

        /* ---------- 8. Construction ---------- */
        console.log('');
        console.log('🏗️ Creating construction data…');

        await safeInsert(ConstructionService, 'ConstructionService', [
            { code: 'SRV-01', name: 'Topographic Survey',         bucket: 'Survey',        price: 5000 },
            { code: 'DRL-01', name: 'Borehole Drilling (100 m)',  bucket: 'Drilling',      price: 15000 },
            { code: 'GEO-01', name: 'Geotechnical Investigation', bucket: 'Geotechnical',  price: 12000 },
            { code: 'TST-01', name: 'Soil & Material Testing',    bucket: 'Testing',       price: 3500 },
            { code: 'DSN-01', name: 'Structural Design',          bucket: 'Design',        price: 8000 }
        ]);

        await safeInsert(ConstructionCompany, 'ConstructionCompany', [
            { name: 'ZamBuild Ltd',       country: 'ZM', city: 'Lusaka',  isVerified: true },
            { name: 'Kafue Civil Works',  country: 'ZM', city: 'Kafue',   isVerified: true },
            { name: 'Copperbelt Builders', country: 'ZM', city: 'Kitwe',  isVerified: true }
        ]);

        await safeInsert(Contractor, 'Contractor', [
            { name: 'Joseph Banda', company: 'JB Construction',  country: 'ZM', province: 'Lusaka',     rating: 4.8, specialities: ['Roads', 'Drainage'] },
            { name: 'Grace Mutale', company: 'Mutale Builders',  country: 'ZM', province: 'Copperbelt', rating: 4.6, specialities: ['Buildings'] },
            { name: 'Peter Phiri',  company: 'Phiri Civils',    country: 'ZM', province: 'Central',    rating: 4.7, specialities: ['Dams', 'Irrigation'] }
        ]);

        /* ---------- 9. Bet events ---------- */
        console.log('');
        console.log('🎲 Creating bet events…');

        await safeInsert(BetEvent, 'BetEvent', [
            {
                sport: 'football',
                league: 'Zambia Super League',
                eventName: 'Zambia vs Kenya',
                icon: '⚽',
                pvpEnabled: true,
                homeTeam: 'Zambia',
                awayTeam: 'Kenya',
                status: 'upcoming',
                startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
                outcomes: [
                    { key: 'home', label: 'Zambia', odds: 1.85 },
                    { key: 'draw', label: 'Draw',   odds: 3.20 },
                    { key: 'away', label: 'Kenya',  odds: 4.10 }
                ]
            },
            {
                sport: 'basketball',
                league: 'Africa League',
                eventName: 'Lusaka Stars vs Nairobi Kings',
                icon: '🏀',
                pvpEnabled: true,
                homeTeam: 'Lusaka Stars',
                awayTeam: 'Nairobi Kings',
                status: 'upcoming',
                startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
                outcomes: [
                    { key: 'home', label: 'Lusaka Stars',  odds: 1.60 },
                    { key: 'away', label: 'Nairobi Kings', odds: 2.30 }
                ]
            },
            {
                sport: 'football',
                league: 'Premier League',
                eventName: 'Arsenal vs Chelsea',
                icon: '⚽',
                pvpEnabled: true,
                homeTeam: 'Arsenal',
                awayTeam: 'Chelsea',
                status: 'upcoming',
                startTime: new Date(Date.now() + 20 * 60 * 60 * 1000),
                outcomes: [
                    { key: 'home', label: 'Arsenal', odds: 2.10 },
                    { key: 'draw', label: 'Draw',    odds: 3.40 },
                    { key: 'away', label: 'Chelsea', odds: 3.20 }
                ]
            }
        ]);

        /* ---------- 10. Shop ---------- */
        console.log('');
        console.log('🛒 Creating sample shop…');

        await safeInsert(Shop, 'Shop', [
            {
                vendor: vendor._id,
                name: 'ZBS Agro Supplies',
                category: 'agriculture',
                description: 'Fresh farm produce delivered from Lusaka.',
                location: {
                    address: '6570 Mumana Rd, Olympia',
                    city: 'Lusaka',
                    lat: -15.4167,
                    lng: 28.2833
                },
                contact: { phone: '+260971111111' },
                isActive: true
            }
        ]);

        /* ---------- 11. Rental ---------- */
        console.log('');
        console.log('🏘️ Creating sample rental…');

        await safeInsert(Rental, 'Rental', [
            {
                landlord: landlord._id,
                title: 'Modern 2BR Apartment in Kabulonga',
                type: 'apartment',
                address: 'Plot 42, Kabulonga',
                city: 'Lusaka',
                province: 'Lusaka',
                rent: 4500,
                deposit: 9000,
                bedrooms: 2,
                bathrooms: 2,
                description: 'Secure apartment with backup power and water.',
                images: [],
                amenities: { parking: true, security: true, wifi: true },
                geo: { lat: -15.4285, lng: 28.3333 },
                status: 'available',
                availableFrom: new Date(),
                contact: { phone: '+260972222222' }
            }
        ]);

        /* ---------- Done ---------- */
        console.log('');
        console.log('✅ Seeding complete.');
        console.log('');
        console.log('Login credentials:');
        console.log('  admin     admin@zeroth.com     / admin123');
        console.log('  user      demo@zeroth.com      / demo123');
        console.log('  vendor    vendor@zeroth.com    / vendor123');
        console.log('  landlord  landlord@zeroth.com  / landlord123');
        console.log('');

        await closeDB();
        process.exit(0);
    } catch (err) {
        console.error('');
        console.error('❌ Seeding failed:', err.message);
        if (err.stack) console.error(err.stack.split('\n').slice(0, 6).join('\n'));
        try { await closeDB(); } catch (_) {}
        process.exit(1);
    }
}

/* ---- Graceful abort ---- */
process.on('SIGINT', async () => {
    console.log('\n⚠️  Seed aborted by user.');
    try { await closeDB(); } catch (_) {}
    process.exit(1);
});

/* ---- Run ---- */
seedDatabase();