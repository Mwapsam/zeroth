const express = require('express');
const router = express.Router();

const Partner = require('../models/Partner');
const Advert = require('../models/Advert');
const Rental = require('../models/Rental');
const AgricultureListing = require('../models/AgricultureListing');
const EducationResource = require('../models/EducationResource');
const ProHire = require('../models/ProHire');
const { asyncHandler } = require('../middleware/errorHandler');

router.get('/', asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json({ success: true, items: [] });
  const rx = new RegExp(q, 'i');

  const [partners, adverts, rentals, agri, edu, pro] = await Promise.all([
    Partner.find({ isActive: true, name: rx }).limit(10).lean(),
    Advert.find({ status: 'active', title: rx }).limit(10).lean(),
    Rental.find({ isActive: true, title: rx }).limit(10).lean(),
    AgricultureListing.find({ isActive: true, name: rx }).limit(10).lean(),
    EducationResource.find({ isActive: true, title: rx }).limit(10).lean(),
    ProHire.find({ isActive: true, title: rx }).limit(10).lean()
  ]);

  const items = [
    ...partners.map((x) => ({ type: 'partner', id: x._id, title: x.name, subtitle: x.category })),
    ...adverts.map((x) => ({ type: 'advert', id: x._id, title: x.title, subtitle: x.category })),
    ...rentals.map((x) => ({ type: 'rental', id: x._id, title: x.title, subtitle: x.location })),
    ...agri.map((x) => ({ type: 'agriculture', id: x._id, title: x.name, subtitle: x.category })),
    ...edu.map((x) => ({ type: 'education', id: x._id, title: x.title, subtitle: x.category })),
    ...pro.map((x) => ({ type: 'prohire', id: x._id, title: x.title, subtitle: x.category }))
  ];

  res.json({ success: true, items });
}));

module.exports = router;