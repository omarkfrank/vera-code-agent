import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Mission, MissionStatus } from "../../src/mission/mission.js";

import {
  canTransitionMissionStatus,
  InvalidMissionStatusTransitionError,
  transitionMissionStatus,
} from "../../src/mission/mission-lifecycle.js";

/**
 * Cria uma missão previsível para os testes
 * do ciclo de vida.
 *
 * O objetivo destes testes é validar exclusivamente
 * as regras de transição de estado.
 */
function createTestMission(status: MissionStatus = "received"): Mission {
  return {
    id: "mission-lifecycle-001",

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

describe("Mission Lifecycle", () => {
  /**
   * Valida a sequência principal do ciclo
   * operacional de uma missão.
   */
  it("deve permitir as transições normais do lifecycle", () => {
    assert.equal(canTransitionMissionStatus("received", "analyzing"), true);

    assert.equal(canTransitionMissionStatus("analyzing", "planned"), true);

    assert.equal(canTransitionMissionStatus("planned", "executing"), true);

    assert.equal(canTransitionMissionStatus("executing", "verifying"), true);

    assert.equal(canTransitionMissionStatus("verifying", "completed"), true);
  });

  /**
   * Uma missão ativa pode falhar durante
   * qualquer estágio operacional.
   */
  it("deve permitir transição para failed a partir de estados ativos", () => {
    const activeStatuses: MissionStatus[] = [
      "received",
      "analyzing",
      "planned",
      "executing",
      "verifying",
    ];

    for (const status of activeStatuses) {
      assert.equal(canTransitionMissionStatus(status, "failed"), true);
    }
  });

  /**
   * Não permitimos saltar diretamente por
   * diferentes fases do lifecycle.
   */
  it("não deve permitir saltos de estado", () => {
    assert.equal(canTransitionMissionStatus("received", "planned"), false);

    assert.equal(canTransitionMissionStatus("received", "completed"), false);

    assert.equal(canTransitionMissionStatus("analyzing", "executing"), false);
  });

  /**
   * O lifecycle também impede regressões
   * arbitrárias de estado.
   */
  it("não deve permitir regressões de estado", () => {
    assert.equal(canTransitionMissionStatus("planned", "received"), false);

    assert.equal(canTransitionMissionStatus("executing", "analyzing"), false);

    assert.equal(canTransitionMissionStatus("verifying", "planned"), false);
  });

  /**
   * Uma transição precisa representar uma mudança
   * real de estado.
   */
  it("não deve permitir transição para o mesmo estado", () => {
    assert.equal(canTransitionMissionStatus("received", "received"), false);

    assert.equal(canTransitionMissionStatus("planned", "planned"), false);
  });

  /**
   * completed representa uma missão encerrada
   * com sucesso e, portanto, é terminal.
   */
  it("deve tratar completed como estado terminal", () => {
    const statuses: MissionStatus[] = [
      "received",
      "analyzing",
      "planned",
      "executing",
      "verifying",
      "completed",
      "failed",
    ];

    for (const targetStatus of statuses) {
      assert.equal(
        canTransitionMissionStatus("completed", targetStatus),
        false,
      );
    }
  });

  /**
   * failed também encerra o ciclo operacional
   * da missão.
   */
  it("deve tratar failed como estado terminal", () => {
    const statuses: MissionStatus[] = [
      "received",
      "analyzing",
      "planned",
      "executing",
      "verifying",
      "completed",
      "failed",
    ];

    for (const targetStatus of statuses) {
      assert.equal(canTransitionMissionStatus("failed", targetStatus), false);
    }
  });

  /**
   * Uma transição válida deve produzir uma nova
   * Mission sem alterar o objeto original.
   */
  it("deve realizar transição válida de forma imutável", () => {
    const mission = createTestMission("received");

    const analyzingMission = transitionMissionStatus(mission, "analyzing");

    /**
     * A Mission original permanece intacta.
     */
    assert.equal(mission.status, "received");

    /**
     * A nova Mission contém o estado solicitado.
     */
    assert.equal(analyzingMission.status, "analyzing");

    /**
     * As demais propriedades continuam preservadas.
     */
    assert.equal(analyzingMission.id, mission.id);

    assert.equal(analyzingMission.requirement, mission.requirement);

    assert.deepEqual(
      analyzingMission.repositoryInspection,
      mission.repositoryInspection,
    );

    /**
     * Confirmamos também que realmente foi criado
     * um novo objeto.
     */
    assert.notEqual(analyzingMission, mission);
  });

  /**
   * Uma tentativa de violar a state machine deve
   * produzir um erro específico e informativo.
   */
  it("deve lançar erro específico para transição inválida", () => {
    const mission = createTestMission("received");

    assert.throws(
      () => transitionMissionStatus(mission, "completed"),
      (error: unknown) => {
        assert.ok(error instanceof InvalidMissionStatusTransitionError);

        assert.equal(error.currentStatus, "received");

        assert.equal(error.targetStatus, "completed");

        assert.equal(
          error.message,
          "Transição de status inválida: received -> completed.",
        );

        return true;
      },
    );
  });
});
