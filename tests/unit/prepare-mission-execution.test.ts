import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Mission } from "../../src/mission/mission.js";
import type { MissionPlan } from "../../src/planning/mission-plan.js";

import {
  InvalidMissionExecutionPreparationError,
  prepareMissionExecution,
} from "../../src/execution/prepare-mission-execution.js";

/**
 * Cria uma Mission planejada e previsível
 * para os testes da camada de execução.
 */
function createTestMission(): Mission {
  return {
    id: "mission-execution-001",

    requirement: "Adicionar endpoint GET /health com testes.",

    status: "planned",

    createdAt: "2026-08-12T12:00:00.000Z",

    repositoryInspection: {
      directory: "D:\\projects\\example",

      project: {
        name: "example-api",
        version: "1.0.0",
        runtime: "Node.js",
        moduleSystem: "ESM",
        packageManager: "npm",
      },

      scripts: ["typecheck", "test", "build"],

      technologies: ["TypeScript", "Express"],

      configurationFiles: [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
      ],

      git: {
        detected: true,
      },
    },
  };
}

/**
 * Cria um plano correspondente à missão de teste.
 */
function createTestPlan(): MissionPlan {
  return {
    missionId: "mission-execution-001",

    objective: "Adicionar endpoint GET /health com testes.",

    status: "planned",

    steps: [],

    risks: [],

    acceptanceCriteria: [
      "O comportamento solicitado deve estar implementado conforme o requisito original.",
    ],
  };
}

describe("prepareMissionExecution", () => {
  /**
   * Uma missão planejada deve poder produzir
   * uma estrutura de execução preparada.
   */
  it("deve preparar execução para missão planejada", () => {
    const execution = prepareMissionExecution(
      createTestMission(),
      createTestPlan(),
    );

    assert.equal(execution.missionId, "mission-execution-001");

    assert.equal(execution.status, "prepared");
  });

  /**
   * Cada execução precisa possuir um
   * identificador próprio.
   */
  it("deve gerar identificador único para cada execução", () => {
    const firstExecution = prepareMissionExecution(
      createTestMission(),
      createTestPlan(),
    );

    const secondExecution = prepareMissionExecution(
      createTestMission(),
      createTestPlan(),
    );

    assert.notEqual(firstExecution.id, secondExecution.id);

    assert.ok(firstExecution.id.length > 0);

    assert.ok(secondExecution.id.length > 0);
  });

  /**
   * preparedAt deve representar um instante
   * válido em formato ISO compatível.
   */
  it("deve registrar instante válido de preparação", () => {
    const execution = prepareMissionExecution(
      createTestMission(),
      createTestPlan(),
    );

    const timestamp = Date.parse(execution.preparedAt);

    assert.equal(Number.isNaN(timestamp), false);
  });

  /**
   * Uma execução recém-preparada ainda não possui
   * ações, arquivos afetados ou resultados.
   */
  it("deve iniciar sem operações executáveis", () => {
    const execution = prepareMissionExecution(
      createTestMission(),
      createTestPlan(),
    );

    assert.deepEqual(execution.actions, []);

    assert.deepEqual(execution.affectedFiles, []);

    assert.deepEqual(execution.results, []);
  });

  /**
   * Não podemos preparar execução antes
   * da conclusão da etapa de planejamento.
   */
  it("deve rejeitar missão que ainda não esteja planned", () => {
    const mission = createTestMission();

    mission.status = "analyzing";

    assert.throws(
      () => prepareMissionExecution(mission, createTestPlan()),
      (error: unknown) => {
        assert.ok(error instanceof InvalidMissionExecutionPreparationError);

        assert.equal(
          error.message,
          'A missão precisa estar em "planned" para preparar a execução. Status atual: analyzing.',
        );

        return true;
      },
    );
  });

  /**
   * Um plano produzido para outra missão nunca
   * deve ser associado à execução atual.
   */
  it("deve rejeitar plano pertencente a outra missão", () => {
    const plan = createTestPlan();

    plan.missionId = "another-mission";

    assert.throws(
      () => prepareMissionExecution(createTestMission(), plan),
      (error: unknown) => {
        assert.ok(error instanceof InvalidMissionExecutionPreparationError);

        assert.equal(error.message, "O plano informado não pertence à missão.");

        return true;
      },
    );
  });
});
