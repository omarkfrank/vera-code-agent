import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { RepositoryInspection } from "../../src/inspection/repository-inspection.js";
import { createMission } from "../../src/mission/create-mission.js";

/**
 * Diagnóstico utilizado pelos testes da fábrica de missões.
 *
 * Como createMission não modifica o RepositoryInspection,
 * podemos utilizar um objeto simples e previsível.
 */
const repositoryInspection: RepositoryInspection = {
  directory: "D:\\projects\\example",

  project: {
    name: "example-project",
    version: "1.0.0",
    runtime: "Node.js",
    moduleSystem: "ESM",
    packageManager: "npm",
  },

  scripts: ["dev", "test"],

  technologies: ["TypeScript"],

  configurationFiles: ["package.json", "package-lock.json", "tsconfig.json"],

  git: {
    detected: true,
  },
};

describe("createMission", () => {
  /**
   * Uma nova missão deve nascer em estado "received"
   * e preservar as informações fornecidas.
   */
  it("deve criar uma missão no estado received", () => {
    const mission = createMission(
      "Adicionar endpoint GET /health com testes.",
      repositoryInspection,
    );

    assert.equal(
      mission.requirement,
      "Adicionar endpoint GET /health com testes.",
    );

    assert.equal(mission.status, "received");

    assert.deepEqual(mission.repositoryInspection, repositoryInspection);
  });

  /**
   * Espaços existentes somente nas extremidades
   * não devem fazer parte do requisito armazenado.
   */
  it("deve normalizar espaços externos do requisito", () => {
    const mission = createMission(
      "   Adicionar autenticação JWT.   ",
      repositoryInspection,
    );

    assert.equal(mission.requirement, "Adicionar autenticação JWT.");
  });

  /**
   * Cada missão precisa possuir um identificador
   * independente das demais.
   */
  it("deve gerar identificadores únicos", () => {
    const firstMission = createMission(
      "Primeira missão.",
      repositoryInspection,
    );

    const secondMission = createMission(
      "Segunda missão.",
      repositoryInspection,
    );

    assert.notEqual(firstMission.id, secondMission.id);

    assert.ok(firstMission.id.length > 0);

    assert.ok(secondMission.id.length > 0);
  });

  /**
   * createdAt deve representar um instante válido
   * em formato compatível com ISO 8601.
   */
  it("deve registrar uma data de criação válida", () => {
    const mission = createMission(
      "Criar documentação técnica.",
      repositoryInspection,
    );

    const parsedTimestamp = Date.parse(mission.createdAt);

    assert.equal(Number.isNaN(parsedTimestamp), false);
  });

  /**
   * Requisitos vazios representam entradas inválidas.
   */
  it("deve rejeitar requisito vazio", () => {
    assert.throws(() => createMission("", repositoryInspection), {
      message: "O requisito da missão não pode estar vazio.",
    });
  });

  /**
   * Um texto composto somente por espaços também deve
   * ser considerado um requisito vazio.
   */
  it("deve rejeitar requisito contendo somente espaços", () => {
    assert.throws(() => createMission("      ", repositoryInspection), {
      message: "O requisito da missão não pode estar vazio.",
    });
  });
});
