const sanitizeKeys = (obj) => {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(sanitizeKeys);
      }

      return Object.keys(obj).reduce((acc, key) => {
        // Replace dot with the Unicode equivalent
        const sanitizedKey = key.replace(/\./g, '\u2024');
        acc[sanitizedKey] = sanitizeKeys(obj[key]);
        return acc;
      }, {});
    
}

module.exports = sanitizeKeys