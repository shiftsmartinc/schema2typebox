import { afterEach, beforeEach, describe, test } from "node:test";

import {
  collect,
  resetEnumCode,
  setEnumMode,
  getEnumCode,
} from "../src/schema-to-typebox";
import { expectEqualIgnoreFormatting } from "./utils";

describe("object with enum", () => {
  let dummySchema: string;

  beforeEach(() => {
    dummySchema = `
       {
        "type": "object",
        "properties": {
          "status": {
           "enum": [
             "unknown",
             "accepted", 
             "denied"
           ]
          }
        }, 
        "required": [
          "status"
        ]
      } 
      `;
  });

  afterEach(() => {
    resetEnumCode();
  });

  const expectedEnumCode = `export enum StatusEnum {
      UNKNOWN = "unknown",
      ACCEPTED = "accepted",
      DENIED = "denied",
    }`;
  const expectedUnionCode = `export const StatusUnion = Type.Union([
      Type.Literal("unknown"),
      Type.Literal("accepted"),
      Type.Literal("denied"),
    ])`;

  test("in enum mode", () => {
    setEnumMode("enum");
    const expectedTypebox = `
      Type.Object({
        status: Type.Enum(StatusEnum),
      }) 
      `;

    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );

    expectEqualIgnoreFormatting(getEnumCode(), expectedEnumCode);
  });

  test("in preferEnum mode", () => {
    setEnumMode("preferEnum");
    const expectedTypebox = `
      Type.Object({
        status: Type.Enum(StatusEnum),
      }) 
      `;

    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );
    expectEqualIgnoreFormatting(
      getEnumCode(),
      `${expectedEnumCode}${expectedUnionCode}`
    );
  });
  test("in union mode", () => {
    setEnumMode("union");

    const expectedTypebox = `
      Type.Object({
        status: StatusUnion,
      }) 
      `;

    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );

    expectEqualIgnoreFormatting(getEnumCode(), expectedUnionCode);
  });

  test("in preferUnion mode", () => {
    setEnumMode("preferUnion");
    const expectedTypebox = `
      Type.Object({
        status: StatusUnion,
      }) 
      `;

    expectEqualIgnoreFormatting(
      collect(JSON.parse(dummySchema)),
      expectedTypebox
    );

    expectEqualIgnoreFormatting(
      getEnumCode(),
      `${expectedEnumCode}${expectedUnionCode}`
    );
  });

  describe("... and nested object with same key enum", () => {
    beforeEach(() => {
      dummySchema = `{
        "type": "object",
        "properties": {
          "status": {
            "enum": [
              "unknown",
              "accepted",
              "denied"
            ]
          },
          "nested": {
            "type": "object",
            "properties": {
              "status": {
                "enum": [
                  "hidden",
                  "visible",
                  "obscured"
                ]
              }
            },
            "required": [
              "status"
            ]
          }
        },
        "required": [
          "status"
        ]
      }`;
    });

    test("should generate unique union type names", () => {
        setEnumMode("union");
        const expectedTypebox = `
            Type.Object({
                status: StatusUnion, 
                nested: Type.Object({
                    status: NestedStatusUnion,
                }),
            })
            `;

        const schema = JSON.parse(dummySchema);
        console.error('schema', schema)
        const collected = collect(schema);
        console.error('collected', collected)

        expectEqualIgnoreFormatting(
            collected,
            expectedTypebox
        );
    });
  });
});
