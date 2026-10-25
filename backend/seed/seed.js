const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Service = require('../models/Service');
const Partner = require('../models/Partner');
const { ETFCompany, ETFExchange } = require('../models/ETF');
const { Consultant } = require('../models/Consultation');
const { Institution, LibraryBook } = require('../models/Education');
const {
    ConstructionService, ConstructionCompany, Contractor
} = require('../models/Construction');
const { BetEvent } = require('../models/Bet');
const Shop = require('../models/Shop');
const Rental = require('../models/Rental');

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to database');

        await Promise.all([
            User.deleteMany({}),
            Service.deleteMany({}),
            Partner.deleteMany({}),
            ETFCompany.deleteMany({}),
            ETFExchange.deleteMany({}),
            Consultant.deleteMany({}),
            Institution.deleteMany({}),
            LibraryBook.deleteMany({}),
            ConstructionService.deleteMany({}),
            ConstructionCompany.deleteMany({}),
            Contractor.deleteMany({}),
            BetEvent.deleteMany({}),
            Shop.deleteMany({}),
            Rental.deleteMany({})
        ]);
        console.log('Cleared existing data');

        // ---------- Users ----------
        const usersData = [
            { name: 'Admin User', email: 'admin@zeroth.com', password: 'admin123',
              phone: '+260979052929', country: 'ZM', role: 'admin', isVerified: true },
            { name: 'Demo User', email: 'demo@zeroth.com', password: 'demo123',
              phone: '+260971234567', country: 'ZM', role: 'user', isVerified: true },
            { name: 'ZBS Vendor', email: 'vendor@zeroth.com', password: 'vendor123',
              phone: '+260971111111', country: 'ZM', role: 'vendor', isVerified: true },
            { name: 'ZBS Landlord', email: 'landlord@zeroth.com', password: 'landlord123',
              phone: '+260972222222', country: 'ZM', role: 'landlord', isVerified: true }
        ];
        const hashedUsers = await Promise.all(
            usersData.map(async (u) => ({
                ...u,
                password: await bcrypt.hash(u.password, 12),
                wallet: { balance: 5000, currency: 'ZMW' }
            }))
        );
        const users = await User.insertMany(hashedUsers);
        console.log(`✅ Created ${users.length} users`);

        const [, , vendor, landlord] = users;

        // ---------- Services ----------
        await Service.insertMany([
            { name: 'Agricultural Services', category: 'agricultural', hub: 'agriculture',
              description: 'Farming, produce, livestock & agro-chemicals', icon: '🌾',
              features: ['Farm Produce', 'Livestock', 'Agro-Chemicals', 'Farm Services'] },
            { name: 'Brokerage Services', category: 'brokerage', hub: 'brokerage',
              description: 'Insurance, education, healthcare & betting', icon: '🔄',
              features: ['Insurance', 'Education', 'Healthcare', 'Transport'] },
            { name: 'Financial Services', category: 'financial', hub: 'financial',
              description: 'Loans, savings, investments & wealth management', icon: '💰',
              features: ['Salary Advance', 'Business Loans', 'Savings', 'Investments'] },
            { name: 'ETF Trading Hub', category: 'brokerage', hub: 'etf',
              description: '24/7 ETF trading across African exchanges', icon: '📈' },
            { name: 'Rental Property Hub', category: 'brokerage', hub: 'rental',
              description: 'Find verified rentals across Africa', icon: '🏘️' },
            { name: 'Construction & Survey', category: 'construction', hub: 'construction',
              description: 'Survey, drilling, geotechnical & construction', icon: '🏗️' },
            { name: 'Consultation Hub', category: 'brokerage', hub: 'consultation',
              description: 'Talk to vetted experts in multiple fields', icon: '🧠' },
            { name: 'Bet & Gaming Hub', category: 'brokerage', hub: 'bet',
              description: 'Peer-to-peer & company betting plus online games', icon: '🎲' }
        ]);
        console.log('✅ Created services');

        // ---------- Partners ----------
        const partners = Array.from({ length: 30 }).map((_, i) => ({
            slot: `AD${i + 1}`,
            name: `Partner ${i + 1}`,
            category: ['agricultural', 'brokerage', 'financial'][i % 3],
            description: `Strategic partner for growth #${i + 1}.`,
            services: ['Advisory', 'Distribution', 'Financing'].slice(0, 1 + (i % 3))
        }));
        await Partner.insertMany(partners);
        console.log('✅ Created partners');

        // ---------- ETFs ----------
        await ETFExchange.insertMany([
            { code: 'LuSE', name: 'Lusaka Securities Exchange',
              country: 'Zambia', city: 'Lusaka', currency: 'ZMW' },
            { code: 'JSE', name: 'Johannesburg Stock Exchange',
              country: 'South Africa', city: 'Johannesburg', currency: 'ZAR' },
            { code: 'NSE', name: 'Nairobi Securities Exchange',
              country: 'Kenya', city: 'Nairobi', currency: 'KES' }
        ]);

        await ETFCompany.insertMany([
            { symbol: 'ZANACO', name: 'Zambia National Commercial Bank', exchange: 'LuSE',
              country: 'Zambia', price: 5.2, previousClose: 5.1, change: 0.1,
              changePercent: 1.96, currency: 'ZMW', sector: 'Financials' },
            { symbol: 'ZMBF', name: 'Zambia Breweries', exchange: 'LuSE',
              country: 'Zambia', price: 8.4, previousClose: 8.3, change: 0.1,
              changePercent: 1.2, currency: 'ZMW', sector: 'Consumer' },
            { symbol: 'SHOPRITE', name: 'Shoprite Holdings', exchange: 'JSE',
              country: 'South Africa', price: 240.5, previousClose: 238.1,
              change: 2.4, changePercent: 1.0, currency: 'ZAR', sector: 'Retail' },
            { symbol: 'SAFCOM', name: 'Safaricom PLC', exchange: 'NSE',
              country: 'Kenya', price: 28.15, previousClose: 27.9, change: 0.25,
              changePercent: 0.9, currency: 'KES', sector: 'Telecom' }
        ]);
        console.log('✅ Created ETFs');

        // ---------- Consultants ----------
        await Consultant.insertMany([
            { name: 'Dr. Chanda Mulenga', title: 'General Practitioner', emoji: '🩺',
              category: 'health', specialities: ['Family Health', 'Chronic Care'],
              pricePerSession: 300, sessionLengths: [30, 45, 60],
              bio: 'Over 15 years of clinical experience.', isVetted: true, rating: 4.9 },
            { name: 'Mrs. Naledi Chileshe', title: 'Business Coach', emoji: '💼',
              category: 'business', specialities: ['SMEs', 'Access to finance'],
              pricePerSession: 400, sessionLengths: [45, 60, 90],
              bio: 'Guides SMEs on growth and funding.', isVetted: true, rating: 4.7 },
            { name: 'Adv. Joseph Mubita', title: 'Corporate Lawyer', emoji: '⚖️',
              category: 'legal', specialities: ['Company registration', 'Contracts'],
              pricePerSession: 550, sessionLengths: [30, 60],
              bio: 'Specialises in commercial and corporate law.', isVetted: true, rating: 4.8 },
            { name: 'Ing. Peter Zulu', title: 'Agronomist', emoji: '🌾',
              category: 'agriculture', specialities: ['Maize', 'Irrigation'],
              pricePerSession: 250, sessionLengths: [30, 45],
              bio: 'Advises on crop production.', rating: 4.6 },
            { name: 'Eng. Sara Ngoma', title: 'Full-stack Developer', emoji: '💻',
              category: 'tech', specialities: ['Web', 'APIs', 'Cloud'],
              pricePerSession: 450, sessionLengths: [60, 90],
              bio: 'Builds scalable web applications.', rating: 4.8 }
        ]);
        console.log('✅ Created consultants');

        // ---------- Education ----------
        await Institution.insertMany([
            { name: 'University of Zambia', type: 'university',
              location: { city: 'Lusaka', country: 'Zambia' },
              description: 'Premier public university in Zambia.',
              rating: 4.7, established: 1966, studentCount: 33000, programCount: 200,
              programs: [
                { name: 'BSc Computer Science', duration: '4 years', level: 'Undergraduate' },
                { name: 'BBA', duration: '4 years', level: 'Undergraduate' }
              ] },
            { name: 'Copperbelt University', type: 'university',
              location: { city: 'Kitwe', country: 'Zambia' },
              description: 'Leading technical university.', rating: 4.6, established: 1987 },
            { name: 'Lusaka Business College', type: 'college',
              location: { city: 'Lusaka', country: 'Zambia' },
              description: 'Business and IT programmes.', rating: 4.3 }
        ]);
        console.log('✅ Created institutions');

        await LibraryBook.insertMany([
            { title: 'Intro to Financial Markets', author: 'J. Chanda',
              category: 'Finance', level: 'College', isFree: true,
              description: 'A beginner-friendly intro to capital markets.' },
            { title: 'Modern Farming in Africa', author: 'P. Mwansa',
              category: 'Agriculture', level: 'All', isFree: false, price: 120 },
            { title: 'Programming with JavaScript', author: 'M. Zulu',
              category: 'Technology', level: 'College', isFree: true }
        ]);
        console.log('✅ Created library books');

        // ---------- Construction ----------
        await ConstructionService.insertMany([
            { code: 'SRV-01', name: 'Topographic Survey', bucket: 'Survey', price: 5000 },
            { code: 'DRL-01', name: 'Borehole Drilling (100m)', bucket: 'Drilling', price: 15000 },
            { code: 'GEO-01', name: 'Geotechnical Investigation', bucket: 'Geotechnical', price: 12000 },
            { code: 'TST-01', name: 'Soil & Material Testing', bucket: 'Testing', price: 3500 }
        ]);
        await ConstructionCompany.insertMany([
            { name: 'ZamBuild Ltd', country: 'ZM', city: 'Lusaka', isVerified: true },
            { name: 'Kafue Civil Works', country: 'ZM', city: 'Kafue', isVerified: true }
        ]);
        await Contractor.insertMany([
            { name: 'Joseph Banda', company: 'JB Construction', country: 'ZM',
              province: 'Lusaka', rating: 4.8, specialities: ['Roads', 'Drainage'] },
            { name: 'Grace Mutale', company: 'Mutale Builders', country: 'ZM',
              province: 'Copperbelt', rating: 4.6, specialities: ['Buildings'] }
        ]);
        console.log('✅ Created construction data');

        // ---------- Bet events ----------
        await BetEvent.insertMany([
            { sport: 'football', league: 'Zambia Super League',
              eventName: 'Zambia vs Kenya', icon: '⚽', pvpEnabled: true,
              homeTeam: 'Zambia', awayTeam: 'Kenya',
              startTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
              outcomes: [
                { key: 'home', label: 'Zambia', odds: 1.85 },
                { key: 'draw', label: 'Draw', odds: 3.2 },
                { key: 'away', label: 'Kenya', odds: 4.1 }
              ] },
            { sport: 'basketball', league: 'Africa League',
              eventName: 'Lusaka Stars vs Nairobi Kings', icon: '🏀', pvpEnabled: true,
              homeTeam: 'Lusaka Stars', awayTeam: 'Nairobi Kings',
              startTime: new Date(Date.now() + 5 * 60 * 60 * 1000),
              outcomes: [
                { key: 'home', label: 'Lusaka Stars', odds: 1.6 },
                { key: 'away', label: 'Nairobi Kings', odds: 2.3 }
              ] }
        ]);
        console.log('✅ Created bet events');

        // ---------- Shop & Rental ----------
        await Shop.create({
            vendor: vendor._id, name: 'ZBS Agro Supplies',
            category: 'agriculture',
            location: {
                address: '6570 Mumana Rd, Olympia', city: 'Lusaka',
                lat: -15.4167, lng: 28.2833
            },
            contact: { phone: '+260971111111' }
        });

        await Rental.create({
            landlord: landlord._id, title: 'Modern 2BR Apartment in Kabulonga',
            type: 'apartment', address: 'Plot 42, Kabulonga', city: 'Lusaka',
            province: 'Lusaka', rent: 4500, deposit: 9000, bedrooms: 2, bathrooms: 2,
            description: 'Secure apartment with backup power and water.',
            images: [], amenities: { parking: true, security: true, wifi: true },
            availableFrom: new Date(), contact: { phone: '+260972222222' }
        });

        console.log('✅ Created sample shop and rental');
        console.log('✅ Database seeding completed successfully');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error seeding:', err);
        process.exit(1);
    }
};

seedDatabase();