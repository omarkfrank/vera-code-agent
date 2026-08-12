import type { MissionExecution } from "../execution/mission-execution.js";

import type {
  MissionVerification,
  VerificationCheck,
} from "./mission-verification.js";

/**
 * Avalia deterministicamente as evidências
 * produzidas por uma MissionExecution.
 *
 * Esta função não altera estado da missão.
 *
 * Ela somente responde:
 *
 * "As evidências desta execução são suficientes
 *  e consistentes para aprovar a missão?"
 */
export function verifyExecutionEvidence(
  execution: MissionExecution,
): MissionVerification {
  const checks: VerificationCheck[] = [];

  /**
   * CHECK 1
   *
   * Apenas uma execução operacionalmente concluída
   * pode ser aprovada pela fase de verificação.
   */
  checks.push({
    id: "execution-completed",

    status: execution.status === "completed" ? "passed" : "failed",

    message:
      execution.status === "completed"
        ? "A execução foi concluída operacionalmente."
        : `A execução não está concluída. Status atual: ${execution.status}.`,
  });

  /**
   * CHECK 2
   *
   * Uma execução válida precisa possuir
   * pelo menos uma ação registrada.
   */
  checks.push({
    id: "actions-present",

    status: execution.actions.length > 0 ? "passed" : "failed",

    message:
      execution.actions.length > 0
        ? `${execution.actions.length} ação(ões) registrada(s).`
        : "Nenhuma ação foi registrada na execução.",
  });

  /**
   * CHECK 3
   *
   * Cada ação precisa possuir exatamente
   * uma evidência correspondente.
   */
  const everyActionHasSingleResult = execution.actions.every(
    (action) =>
      execution.results.filter((result) => result.actionId === action.id)
        .length === 1,
  );

  checks.push({
    id: "action-results-complete",

    status: everyActionHasSingleResult ? "passed" : "failed",

    message: everyActionHasSingleResult
      ? "Todas as ações possuem exatamente um resultado."
      : "Existem ações sem resultado ou com resultados duplicados.",
  });

  /**
   * CHECK 4
   *
   * Não podem existir evidências associadas
   * a ações desconhecidas.
   */
  const noOrphanResults = execution.results.every((result) =>
    execution.actions.some((action) => action.id === result.actionId),
  );

  checks.push({
    id: "no-orphan-results",

    status: noOrphanResults ? "passed" : "failed",

    message: noOrphanResults
      ? "Todos os resultados pertencem a ações registradas."
      : "Existem resultados associados a ações não registradas.",
  });

  /**
   * CHECK 5
   *
   * Todas as evidências precisam pertencer
   * à própria execução.
   */
  const resultsBelongToExecution = execution.results.every(
    (result) => result.executionId === execution.id,
  );

  checks.push({
    id: "result-execution-integrity",

    status: resultsBelongToExecution ? "passed" : "failed",

    message: resultsBelongToExecution
      ? "Todos os resultados pertencem à execução atual."
      : "Existem resultados associados a outra execução.",
  });

  /**
   * CHECK 6
   *
   * Para aprovação, todas as ações precisam
   * possuir resultado `success`.
   */
  const allResultsSuccessful =
    execution.results.length > 0 &&
    execution.results.every((result) => result.status === "success");

  checks.push({
    id: "all-results-successful",

    status: allResultsSuccessful ? "passed" : "failed",

    message: allResultsSuccessful
      ? "Todas as ações foram concluídas com sucesso."
      : "Uma ou mais ações não possuem resultado de sucesso.",
  });

  /**
   * CHECK 7
   *
   * Enquanto a VERA possui somente capacidade
   * operacional `read`, nenhum arquivo pode
   * aparecer como modificado.
   *
   * Quando create/update forem liberados,
   * esta política poderá evoluir para considerar
   * os tipos das ações registradas.
   */
  const onlyReadActions = execution.actions.every(
    (action) => action.type === "read",
  );

  const readOnlyIntegrity =
    !onlyReadActions || execution.affectedFiles.length === 0;

  checks.push({
    id: "read-only-integrity",

    status: readOnlyIntegrity ? "passed" : "failed",

    message: readOnlyIntegrity
      ? "A integridade da execução read-only foi preservada."
      : "Uma execução exclusivamente read registrou arquivos modificados.",
  });

  /**
   * A verificação somente passa quando
   * TODOS os critérios determinísticos passam.
   */
  const verificationPassed = checks.every((check) => check.status === "passed");

  return {
    missionId: execution.missionId,
    executionId: execution.id,

    status: verificationPassed ? "passed" : "failed",

    verifiedAt: new Date().toISOString(),

    checks,
  };
}
