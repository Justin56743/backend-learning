/**
 * Utility functions for transforming database responses to API format
 */

export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const transformKeys = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(transformKeys);
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      const camelKey = toCamelCase(key);
      transformed[camelKey] = transformKeys(obj[key]);
    }
    return transformed;
  }

  return obj;
};
