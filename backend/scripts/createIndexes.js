require('dotenv').config();
const mongoose = require('mongoose');

// Import every model so they register with Mongoose
require('../models/User');
require('../models/Service');
require('../models/Application');
require('../models/Payment');
require('../models/HardwareItem');
require('../models/Order');
require('../models/Contact');
require('../models/Shop');
require('../models/Rental');
require('../models/AnimalPermit');
require('../models/ETF');
require('../models/Bet');
require('../models/Consultation');
require('../models/Entertainment');
require('../models/Education');
require('../models/Construction');
require('../models/Partner');
require('../models/Advert');
require('../models/Social');
require('../models/Notification');

(async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected. Creating indexes...');
        for (const name of mongoose.modelNames()) {
            await mongoose.model(name).createIndexes();
            console.log(`  ✅ ${name}`);
        }
        console.log('All indexes created.');
    } catch (err) {
        console.error('❌ Failed:', err);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
})();