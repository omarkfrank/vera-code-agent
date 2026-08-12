import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { InvalidMissionStatusTransitionError } from "../../src/mission/mission-lifecycle.js";

import type { Mission, MissionStatus } from "../../src/mission/mission.js";

import { planMission } from "../../src/planning/planning-workflow.js";

/**
 * Cria uma missão previsível para os testes
 * da workflow de planejamento.
 */
function createTestMission(status: MissionStatus = "received"): Mission {
  return {
    id: "planning-workflow-001",

    requirement: "Adicionar endpoint GET /health com testes.",

    status,

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

      scripts: ["dev", "typecheck", "test", "build"],

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

describe("Planning Workflow", () => {
  /**
   * Uma missão recebida deve terminar a workflow
   * no estado "planned".
   */
  it("deve avançar a missão de received para planned", () => {
    const mission = createTestMission();

    const result = planMission(mission);

    assert.equal(result.mission.status, "planned");

    assert.equal(result.plan.status, "planned");
  });

  /**
   * O plano precisa continuar associado à mesma missão
   * durante todo o processo de planejamento.
   */
  it("deve produzir plano associado à missão", () => {
    const mission = createTestMission();

    const result = planMission(mission);

    assert.equal(result.plan.missionId, mission.id);

    assert.equal(result.plan.objective, mission.requirement);
  });

  /**
   * A workflow utiliza transições imutáveis.
   *
   * Portanto, a Mission original fornecida pelo chamador
   * não deve sofrer alterações.
   */
  it("não deve modificar a missão original", () => {
    const mission = createTestMission();

    const result = planMission(mission);

    assert.equal(mission.status, "received");

    assert.equal(result.mission.status, "planned");

    assert.notEqual(result.mission, mission);
  });

  /**
   * As informações de contexto precisam continuar
   * disponíveis depois das transições de estado.
   */
  it("deve preservar o contexto do repositório", () => {
    const mission = createTestMission();

    const result = planMission(mission);

    assert.deepEqual(
      result.mission.repositoryInspection,
      mission.repositoryInspection,
    );

    assert.deepEqual(
      result.plan.steps.map((step) => step.order),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  /**
   * A workflow atual começa exclusivamente
   * com uma missão em estado "received".
   *
   * Uma missão já planejada não pode reiniciar
   * arbitrariamente o processo.
   */
  it("deve rejeitar missão em estado incompatível", () => {
    const mission = createTestMission("planned");

    assert.throws(
      () => planMission(mission),
      (error: unknown) => {
        assert.ok(error instanceof InvalidMissionStatusTransitionError);

        assert.equal(error.currentStatus, "planned");

        assert.equal(error.targetStatus, "analyzing");

        return true;
      },
    );
  });
});
