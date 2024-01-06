module.exports = {
  extends: [
    'semistandard',
    'plugin:json/recommended'
  ],
  rules: {
    quotes: ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }]
  }
};
