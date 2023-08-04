/**
 * @name capitalize
 * @description
 * Capitalize the first letter of a string
 * @returns {string} The capitalized string
 */
export const capitalize = (name: string) => {
  const [head, ...tail] = name;
  if (head === undefined) {
    return name;
  }
  return `${head.toUpperCase()}${tail.join("")}`;
};

/**
 * @name buildPropertyPath
 * @description
 * While traversing a JSON schema, this function builds a path to the current node
 * for the purpose of disambiguating property names in the case of nested objects.
 * 
 * @returns array representation of the current path, root to leaf
 */
export const buildPropertyPath = (propertyName: string | undefined, path?: string[]) => {
  if(!propertyName) {
    return path || [];
  };

  if(!path?.length) {
    return [propertyName].filter(x => x);;
  }

  return [...path, propertyName].filter((x, i, ra) => x && (!i || x !== ra[i - 1]));
};
