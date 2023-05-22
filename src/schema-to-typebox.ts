/** Generates TypeBox code from JSON schema */
export const schema2Typebox = (jsonSchema: string) => {
  // Just thinking out "loud" with quick thoughts, not having put to much time
  // into this.
  //
  // TODO: (perhaps?) check for any json schema parsers that are available.
  // Otherwise I guess simply parsing the jsonSchema string into an object (I
  // guess it is always a JSON object?) and iterating the keys via something
  // like "Object.keys" should do it.
  // console.log("** for now we are just printing the schema itself **");
  // console.log(jsonSchema);
  const schemaObj = JSON.parse(jsonSchema);

  const typeBoxType = collect(schemaObj, []);
  // TODO: rather use "title" from json schema than default to "T"
  const valueName = "T";
  const typeForObj = generateTypeForName(valueName);
  return `import { Type, Static } from "@sinclair/typebox";

${typeForObj}\nconst ${valueName} = ${typeBoxType}`;
};

const generateTypeForName = (name: string) => {
  const [head, ...tail] = name;
  if (head === undefined) {
    throw new Error(`Can't generate type for empty string. Got input: ${name}`);
  }
  if (tail.length === 0) {
    return `type ${head.toUpperCase()} = Static<typeof ${name}>`;
  }
  return `type ${head.toUpperCase}${tail.join("")} = Static<typeof ${name}>`;
};

/**
 * "SimpleType" here basically means any type that is directly mapable to a
 * Typebox type without any recursion (everything besides "array" and "object"
 * in Practice :])
 */
const mapSimpleType = (
  // TODO: omit array and objeclater
  type: VALID_TYPE_VALUE,
  schemaOptions: Record<string, any>
) => {
  const schemaOptionsString =
    Object.keys(schemaOptions).length > 0 ? JSON.stringify(schemaOptions) : "";
  // TODO: use if else or switch case later. throw error if array or object (or
  // cut the type)
  return type === "string"
    ? `Type.String(${schemaOptionsString})`
    : type === "number"
    ? `Type.Number(${schemaOptionsString})`
    : type === "null"
    ? `Type.Null(${schemaOptionsString})`
    : type === "boolean"
    ? `Type.Boolean(${schemaOptionsString})`
    : "WRONG";
};

/**
 * Takes the root schemaObject and recursively collects the corresponding types
 * for it. Returns the matching typebox code representing the schemaObject.
 *
 * @param requiredAttributes The required attributes/properties of the given schema object. Recursively passed down for each given object.
 * @param propertyName The name of the attribute/property currently being collected.
 * @throws Error
 */
export const collect = (
  schemaObj: Record<string, any>,
  requiredAttributes: string[] = [],
  propertyName?: string
): string => {
  const type = getType(schemaObj);
  if (type === "object") {
    console.log("type was object");
    const propertiesOfObj = getProperties(schemaObj);
    // TODO: replace "as string[]" here
    const requiredAttributesOfObject = (schemaObj["required"] ??
      []) as string[];
    const typeboxForProperties = propertiesOfObj.map(
      ([propertyName, property]) => {
        return collect(property, requiredAttributesOfObject, propertyName);
      }
    );
    // propertyName will only be undefined for the "top level" schemaObj
    return propertyName === undefined
      ? `Type.Object({\n${typeboxForProperties}\n})`
      : `${propertyName}: Type.Object({\n${typeboxForProperties}\n})`;
  } else if (
    type === "string" ||
    type === "number" ||
    type === "null" ||
    type === "boolean"
  ) {
    console.log("type was string or number or null or boolean");
    const schemaOptions = getSchemaOptions(schemaObj).reduce<
      Record<string, any>
    >((prev, [optionName, optionValue]) => {
      prev[optionName] = optionValue;
      return prev;
    }, {});
    // propertyName is undefined if previous recursion was of type 'array' and
    // we passed the 'items' object as new schemaObj.
    if (propertyName === undefined) {
      return mapSimpleType(type, schemaOptions);
    }
    const simpleType = mapSimpleType(type, schemaOptions);
    return requiredAttributes.includes(propertyName)
      ? `${propertyName}: ${simpleType}\n`
      : `${propertyName}: Type.Optional(${simpleType})\n`;
  } else if (type === "array") {
    console.log("type was array");
    if (propertyName === undefined) {
      throw new Error("expected propertyName to be defined. Got: undefined");
    }
    // assumes that instance of type "array" has the "items" key.
    const itemsSchemaObj = schemaObj["items"];
    if (itemsSchemaObj === undefined) {
      throw new Error(
        "expected instance of type 'array' to contain 'items' object. Got: undefined"
      );
    }
    const schemaOptions = getSchemaOptions(schemaObj).reduce<
      Record<string, any>
    >((prev, [optionName, optionValue]) => {
      prev[optionName] = optionValue;
      return prev;
    }, {});
    if (Object.keys(schemaObj).length > 0) {
      return `${propertyName}: Type.Array(${collect(
        itemsSchemaObj
      )}, (${JSON.stringify(schemaOptions)}))`;
    }
    return `${propertyName}: Type.Array(${collect(itemsSchemaObj)})`;
  }

  throw new Error(`cant collect ${type} yet`);
};

type SchemaOptionName = string;
type SchemaOptionValue = any;

/**
 * Takes an object describing a JSON schema instance and returns a list of
 * tuples for all attributes/properties where the first item is the attribute name and the second one the corresponding value.
 * Only returns property/value pairs which are required to build the typebox
 * schemaOptions (meaning something like "type" is ignored since it does not
 * control the schemaOptions in typebox :]).
 *
 * Example:
 *
 * ```
 * {
 *   "description": "full name of the person",
 *   "type": "string"
 * }
 *
 * ```
 *
 * Returns:
 *
 * ```
 * [["description", "full name of the person"]]
 *
 * ```
 */
const getSchemaOptions = (
  schemaObj: Record<string, any>
): (readonly [SchemaOptionName, SchemaOptionValue])[] => {
  const properties = Object.keys(schemaObj);
  const schemaOptionProperties = properties.filter((currItem) => {
    return currItem !== "type" && currItem !== "items";
  });
  return schemaOptionProperties.map((currItem) => {
    return [currItem, schemaObj[currItem]] as const;
  });
};

/**
 * List of valid JSON schema values for the "type" attribute.
 * src: https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-4.2
 * src: https://json-schema.org/learn/miscellaneous-examples.html
 *
 * "An instance has one of six primitive types, and a range of possible
   values depending on the type:"
 */
const VALID_TYPE_VALUES = [
  "object",
  "string",
  "number",
  "null",
  "boolean",
  "array",
] as const;
type VALID_TYPE_VALUE = (typeof VALID_TYPE_VALUES)[number];

type PropertyName = string;
type PropertiesOfProperty = Record<string, any>;

/**
 * Returns a list containing the name of the property and its properties (as
 * object) for every property in the given schema.
 *
 * Example:
 *
 * ```
 * {"properties":
 *     { "name": {
 *         "type": "string"
 *       }
 *     },
 * }
 * ```
 *
 * Returns
 *
 * ```
 * [["name", {"type": "string"}]]
 * ```
 */
const getProperties = (
  schema: Record<string, any>
): (readonly [PropertyName, PropertiesOfProperty])[] => {
  const properties = schema["properties"];
  if (properties === undefined) {
    throw new Error(
      "JSON schema was expected to have 'properties' attribute/property. Got: undefined"
    );
  }
  const propertyNames = Object.keys(properties);
  const listWithPropertyObjects = propertyNames.map((currItem) => {
    if (currItem === undefined) {
      throw new Error(`Value for property name ${currItem} was undefined.`);
    }
    const objectForProperty = properties[currItem] as Record<string, any>;
    return [currItem, objectForProperty] as const;
  });
  return listWithPropertyObjects;
};

/**
 * Gets the "type" of a JSON schema Instance
 * src: https://datatracker.ietf.org/doc/html/draft-wright-json-schema-01#section-4.2
 *
 * @throws Error
 */
const getType = (schemaObj: Record<string, any>): VALID_TYPE_VALUE => {
  const type = schemaObj["type"];

  if (!VALID_TYPE_VALUES.includes(type)) {
    throw new Error(
      `JSON schema had invalid value for 'type' attribute. Got: ${type}`
    );
  }

  return type;
};
