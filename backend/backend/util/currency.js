const { CURRENCIES } = require('../config/constants');

function currencyForCountry(countryCode) {
  return CURRENCIES[countryCode] || CURRENCIES.ZM;
}

function formatMoney(amount, countryCode) {
  const c = currencyForCountry(countryCode);
  return `${c.symbol} ${Number(amount).toFixed(2)}`;
}

module.exports = { currencyForCountry, formatMoney };