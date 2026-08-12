import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { Mission } from "../../src/mission/mission.js";
import { createMissionPlan } from "../../src/planning/mission-planner.js";

/**
 * Cria uma missão previsível para os testes.
 *
 * Não utilizamos createMission() aqui porque UUID
 * e timestamp são irrelevantes para o comportamento
 * específico que o Mission Planner precisa validar.
 */
function createTestMission(): Mission {
  return {
    id: "mission-001",
    requirement: "Adicionar endpoint GET /health com testes.",
    status: "received",
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

describe("createMissionPlan", () => {
  /**
   * O plano deve manter vínculo explícito
   * com a missão que o originou.
   */
  it("deve criar plano associado à missão", () => {
    const mission = createTestMission();

    const plan = createMissionPlan(mission);

    assert.equal(plan.missionId, mission.id);

    assert.equal(plan.objective, mission.requirement);

    assert.equal(plan.status, "planned");
  });

  /**
   * As etapas devem possuir uma sequência
   * numérica contínua e previsível.
   */
  it("deve criar etapas ordenadas", () => {
    const plan = createMissionPlan(createTestMission());

    assert.deepEqual(
      plan.steps.map((step) => step.order),
      [1, 2, 3, 4, 5, 6, 7],
    );
  });

  /**
   * Projetos que possuem infraestrutura de testes
   * devem receber uma etapa específica para cobertura
   * automatizada da implementação.
   */
  it("deve incluir etapa de testes quando o projeto possuir script test", () => {
    const plan = createMissionPlan(createTestMission());

    assert.ok(
      plan.steps.some(
        (step) =>
          step.type === "test" &&
          step.title === "Adicionar ou atualizar testes",
      ),
    );
  });

  /**
   * Os scripts disponíveis determinam quais
   * verificações podem ser planejadas com segurança.
   */
  it("deve criar verificações com base nos scripts disponíveis", () => {
    const plan = createMissionPlan(createTestMission());

    const verificationTitles = plan.steps
      .filter((step) => step.type === "verification")
      .map((step) => step.title);

    assert.deepEqual(verificationTitles, [
      "Executar verificação de tipos",
      "Executar testes automatizados",
      "Executar build",
    ]);
  });

  /**
   * O planner não deve sugerir comandos que
   * o repositório não declarou possuir.
   */
  it("não deve criar verificações para scripts inexistentes", () => {
    const mission = createTestMission();

    mission.repositoryInspection.scripts = ["dev"];

    const plan = createMissionPlan(mission);

    const verificationSteps = plan.steps.filter(
      (step) => step.type === "verification",
    );

    assert.equal(verificationSteps.length, 0);

    assert.equal(
      plan.steps.some((step) => step.type === "test"),
      false,
    );
  });

  /**
   * A ausência de Git representa uma redução
   * da capacidade de rastrear alterações.
   */
  it("deve identificar risco quando Git não for detectado", () => {
    const mission = createTestMission();

    mission.repositoryInspection.git.detected = false;

    const plan = createMissionPlan(mission);

    assert.ok(
      plan.risks.includes(
        "Repositório Git não detectado; alterações terão menor rastreabilidade.",
      ),
    );
  });

  /**
   * Um contexto técnico desconhecido deve
   * ser explicitamente apresentado como risco.
   */
  it("deve identificar risco quando nenhuma tecnologia for reconhecida", () => {
    const mission = createTestMission();

    mission.repositoryInspection.technologies = [];

    const plan = createMissionPlan(mission);

    assert.ok(
      plan.risks.includes(
        "Nenhuma tecnologia conhecida foi detectada; o planejamento poderá exigir análise adicional.",
      ),
    );
  });

  /**
   * Critérios de aceitação verificáveis devem
   * acompanhar os scripts realmente disponíveis.
   */
  it("deve criar critérios de aceitação verificáveis", () => {
    const plan = createMissionPlan(createTestMission());

    assert.deepEqual(plan.acceptanceCriteria, [
      "O comportamento solicitado deve estar implementado conforme o requisito original.",
      'O script "typecheck" deve ser concluído sem erros.',
      'O script "test" deve ser concluído sem falhas.',
      'O script "build" deve ser concluído com sucesso.',
    ]);
  });
});
