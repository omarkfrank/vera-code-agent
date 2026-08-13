import assert from "node:assert/strict";

import { describe, it } from "node:test";

import {
  InvalidRunCommandArgumentsError,
  parseRunCommandArguments,
} from "../../src/cli/commands/run-command.js";

describe("Run Command Parser", () => {
  it("deve interpretar operação read válida", () => {
    const request = parseRunCommandArguments(["read", "package.json"]);

    assert.deepEqual(request, {
      type: "read",

      target: "package.json",
    });
  });

  it("deve rejeitar read sem arquivo alvo", () => {
    assert.throws(
      () => parseRunCommandArguments(["read"]),
      InvalidRunCommandArgumentsError,
    );
  });

  it("deve rejeitar argumentos adicionais em read", () => {
    assert.throws(
      () => parseRunCommandArguments(["read", "package.json", "extra"]),
      InvalidRunCommandArgumentsError,
    );
  });

  it("deve interpretar operação create válida", () => {
    const request = parseRunCommandArguments([
      "create",
      "health.ts",
      "--content",
      'export const health = "ok";',
    ]);

    assert.deepEqual(request, {
      type: "create",

      target: "health.ts",

      content: 'export const health = "ok";',
    });
  });

  it("deve permitir criação com conteúdo textual vazio", () => {
    const request = parseRunCommandArguments([
      "create",
      "empty.txt",
      "--content",
      "",
    ]);

    assert.deepEqual(request, {
      type: "create",

      target: "empty.txt",

      content: "",
    });
  });

  it("deve rejeitar create sem opção --content", () => {
    assert.throws(
      () => parseRunCommandArguments(["create", "health.ts"]),
      InvalidRunCommandArgumentsError,
    );
  });

  it("deve rejeitar opção desconhecida em create", () => {
    assert.throws(
      () =>
        parseRunCommandArguments(["create", "health.ts", "--body", "conteúdo"]),
      InvalidRunCommandArgumentsError,
    );
  });

  it("deve rejeitar operação desconhecida", () => {
    assert.throws(
      () => parseRunCommandArguments(["update", "health.ts"]),
      InvalidRunCommandArgumentsError,
    );
  });
});
