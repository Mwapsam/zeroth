const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const { optionalAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { handleValidation } = require('../middleware/validate');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are ZBSAI, the helpful assistant for Zeroth Business Solutions (ZBS).
You help users understand:
- Agricultural services (produce, livestock, farm inputs)
- Brokerage services (shares, ETF trading, entertainment, education, consultation, rentals, ProHire)
- Financial services (loans, savings, investments)
Always answer concisely. Do not provide regulated financial advice; recommend a human advisor for major decisions.
Currency context: Zambia (ZMW). Keep replies under 200 words unless asked.`;

router.post(
  '/chat',
  optionalAuth,
  [body('message').notEmpty().isLength({ max: 2000 })],
  handleValidation,
  asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!process.env.AI_API_KEY) {
      // Fallback local reply
      return res.json({
        success: true,
        reply: `ZBSAI (offline): I received your message: "${message}". Configure AI_API_KEY on the server for live answers. In the meantime, explore Services → Financial, Agriculture, or Brokerage on the site.`,
        source: 'fallback'
      });
    }

    try {
      const r = await fetch(process.env.AI_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.AI_API_KEY}`
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message }
          ],
          temperature: 0.4,
          max_tokens: 500
        })
      });
      if (!r.ok) throw new Error(`AI provider responded ${r.status}`);
      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content?.trim() || 'Sorry, I could not generate a reply.';
      res.json({ success: true, reply, source: 'ai' });
    } catch (err) {
      logger.error('AI chat error', err);
      res.json({
        success: true,
        reply: 'Our AI assistant is temporarily unavailable. Please try again shortly or contact support.',
        source: 'fallback'
      });
    }
  })
);

module.exports = router;