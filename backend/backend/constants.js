module.exports = {
  CURRENCIES: {
    ZM: { code: 'ZMW', symbol: 'K' },
    ZA: { code: 'ZAR', symbol: 'R' },
    KE: { code: 'KES', symbol: 'KSh' },
    NG: { code: 'NGN', symbol: '₦' },
    TZ: { code: 'TZS', symbol: 'TSh' },
    UG: { code: 'UGX', symbol: 'USh' },
    GH: { code: 'GHS', symbol: '₵' },
    BW: { code: 'BWP', symbol: 'P' },
    NA: { code: 'NAD', symbol: 'N$' },
    ZW: { code: 'USD', symbol: '$' },
    MW: { code: 'MWK', symbol: 'MK' },
    MZ: { code: 'MZN', symbol: 'MT' },
    US: { code: 'USD', symbol: '$' },
    GB: { code: 'GBP', symbol: '£' },
    EU: { code: 'EUR', symbol: '€' }
  },
  ROLES: { USER: 'user', ADMIN: 'admin', PARTNER: 'partner' },
  TX_TYPES: {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    PURCHASE: 'purchase',
    REFUND: 'refund',
    LOAN_DISBURSEMENT: 'loan_disbursement',
    LOAN_REPAYMENT: 'loan_repayment',
    ADVERT_PAYMENT: 'advert_payment',
    SHARE_PURCHASE: 'share_purchase'
  },
  TX_STATUS: { PENDING: 'pending', COMPLETED: 'completed', FAILED: 'failed', REVERSED: 'reversed' },
  ADVERT_TIERS: {
    free: { days: 7, price: 0 },
    silver: { days: 30, price: 150 },
    gold: { days: 90, price: 450 }
  },
  SHARE_COMPANIES: {
    'ZBS Limited': 5.0,
    'ZBS Agriculture Solutions': 3.5,
    'ZBS Financial Partners': 8.0,
    'ZBS Brokerage Solutions': 6.5,
    'ZBS Energy Resources': 4.0
  },
  PAYMENT_METHODS: ['Airtel Money', 'Zamtel', 'MTN Mobile Money', 'Bank Transfer', 'Card Payment']
};