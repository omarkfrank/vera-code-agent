import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { createExecutionFailureResult } from "../../src/execution/create-execution-failure-result.js";

import type { ExecutionAction } from "../../src/execution/mission-execution.js";

import { RepositoryReadError } from "../../src/execution/execute-read-action.js";

import { RepositoryPathViolationError } from "../../src/execution/repository-path.js";

/**
 * Cria uma ação previsível para os testes.
 */
function createTestAction(): ExecutionAction {
  return {
    executionId: "failure-execution-001",

    id: "failure-action-001",

    order: 1,

    type: "read",

    description: "Ler package.json.",

    target: "package.json",
  };
}

describe("createExecutionFailureResult", () => {
  /**
   * Falhas conhecidas de leitura devem ser
   * registradas preservando a mensagem segura.
   */
  it("deve registrar falha conhecida de leitura", () => {
    const result = createExecutionFailureResult(
      createTestAction(),
      new RepositoryReadError("Arquivo inválido."),
    );

    assert.equal(result.executionId, "failure-execution-001");

    assert.equal(result.actionId, "failure-action-001");

    assert.equal(result.status, "failure");

    assert.equal(result.message, "Arquivo inválido.");
  });

  /**
   * Violações da fronteira do repositório
   * também são evidências operacionais.
   */
  it("deve registrar violação de caminho protegida", () => {
    const result = createExecutionFailureResult(
      createTestAction(),
      new RepositoryPathViolationError(
        "../../secret.txt",
        "O caminho solicitado está fora do repositório autorizado.",
      ),
    );

    assert.equal(result.status, "failure");

    assert.equal(
      result.message,
      "O caminho solicitado está fora do repositório autorizado.",
    );
  });

  /**
   * ENOENT é normalizado para não expor
   * caminhos internos do sistema.
   */
  it("deve normalizar arquivo inexistente", () => {
    const error = Object.assign(new Error("Mensagem interna do filesystem."), {
      code: "ENOENT",
    });

    const result = createExecutionFailureResult(createTestAction(), error);

    assert.equal(result.message, "Arquivo alvo não encontrado.");
  });

  /**
   * Falhas desconhecidas recebem uma mensagem
   * segura e previsível.
   */
  it("deve normalizar falha inesperada", () => {
    const result = createExecutionFailureResult(
      createTestAction(),
      new Error("detalhes internos sensíveis"),
    );

    assert.equal(result.status, "failure");

    assert.equal(
      result.message,
      "Falha inesperada durante a execução da ação.",
    );
  });
});
