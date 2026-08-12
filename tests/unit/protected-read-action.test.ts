import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { describe, it } from "node:test";

import {
  createReadExecutionAction,
  InvalidExecutionActionDefinitionError,
} from "../../src/execution/create-read-execution-action.js";

import {
  executeReadAction,
  InvalidReadExecutionActionError,
  MAX_READ_FILE_SIZE_BYTES,
  RepositoryReadError,
} from "../../src/execution/execute-read-action.js";

import type { ExecutionAction } from "../../src/execution/mission-execution.js";

import { RepositoryPathViolationError } from "../../src/execution/repository-path.js";

describe("Protected Read Action", () => {
  /**
   * A fábrica deve produzir uma ação de leitura
   * estruturada e pronta para validação operacional.
   */
  it("deve criar uma ação de leitura válida", () => {
    const action = createReadExecutionAction(1, "  src/main.ts  ");

    assert.ok(action.id.length > 0);

    assert.equal(action.order, 1);

    assert.equal(action.type, "read");

    assert.equal(action.target, "src/main.ts");
  });

  /**
   * A definição da ação precisa possuir
   * ordem válida e alvo não vazio.
   */
  it("deve rejeitar definição inválida de ação", () => {
    assert.throws(
      () => createReadExecutionAction(0, "src/main.ts"),
      InvalidExecutionActionDefinitionError,
    );

    assert.throws(
      () => createReadExecutionAction(1, "   "),
      InvalidExecutionActionDefinitionError,
    );
  });

  /**
   * Um arquivo textual localizado dentro da raiz
   * autorizada deve poder ser lido normalmente.
   */
  it("deve ler arquivo textual dentro do repositório", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-protected-read-"));

    try {
      await mkdir(join(directory, "src"));

      await writeFile(
        join(directory, "src", "example.ts"),
        'export const message = "VERA";\n',
        "utf-8",
      );

      const action = createReadExecutionAction(1, "src/example.ts");

      const result = await executeReadAction(directory, action);

      assert.equal(result.status, "success");

      assert.equal(result.actionId, action.id);

      assert.equal(result.target, "src/example.ts");

      assert.equal(result.content, 'export const message = "VERA";\n');
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * Traversal utilizando `..` não pode permitir
   * que a VERA leia arquivos externos.
   */
  it("deve bloquear tentativa de escapar do repositório", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "vera-path-traversal-"));

    const repository = join(workspace, "repository");

    const outsideFile = join(workspace, "secret.txt");

    try {
      await mkdir(repository);

      await writeFile(outsideFile, "conteúdo externo", "utf-8");

      const target = relative(repository, outsideFile);

      const action = createReadExecutionAction(1, target);

      await assert.rejects(
        executeReadAction(repository, action),
        RepositoryPathViolationError,
      );
    } finally {
      await rm(workspace, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * Caminhos absolutos também são proibidos,
   * mesmo quando apontam para um arquivo existente.
   */
  it("deve bloquear caminho absoluto", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "vera-absolute-path-"));

    try {
      const outsideFile = join(workspace, "absolute.txt");

      await writeFile(outsideFile, "arquivo absoluto", "utf-8");

      const action = createReadExecutionAction(1, outsideFile);

      await assert.rejects(
        executeReadAction(workspace, action),
        RepositoryPathViolationError,
      );
    } finally {
      await rm(workspace, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * O executor de leitura não deve aceitar
   * ações pertencentes a outras categorias.
   */
  it("deve rejeitar ação que não seja read", async () => {
    const action: ExecutionAction = {
      id: "invalid-read-action",
      order: 1,
      type: "update",
      description: "Operação inválida para este executor.",
      target: "src/main.ts",
    };

    await assert.rejects(
      executeReadAction(process.cwd(), action),
      InvalidReadExecutionActionError,
    );
  });

  /**
   * A capacidade atual trabalha exclusivamente
   * com arquivos, nunca diretórios.
   */
  it("deve rejeitar diretórios", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-read-directory-"));

    try {
      await mkdir(join(directory, "src"));

      const action = createReadExecutionAction(1, "src");

      await assert.rejects(
        executeReadAction(directory, action),
        RepositoryReadError,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * Arquivos muito grandes não devem ser
   * carregados arbitrariamente em memória.
   */
  it("deve rejeitar arquivo acima do limite de leitura", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-large-read-"));

    try {
      await writeFile(
        join(directory, "large.txt"),
        "A".repeat(MAX_READ_FILE_SIZE_BYTES + 1),
        "utf-8",
      );

      const action = createReadExecutionAction(1, "large.txt");

      await assert.rejects(
        executeReadAction(directory, action),
        RepositoryReadError,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * A primeira versão da leitura é destinada
   * exclusivamente a conteúdo textual.
   */
  it("deve rejeitar conteúdo aparentemente binário", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-binary-read-"));

    try {
      await writeFile(join(directory, "binary.bin"), Buffer.from([0, 1, 2, 3]));

      const action = createReadExecutionAction(1, "binary.bin");

      await assert.rejects(
        executeReadAction(directory, action),
        RepositoryReadError,
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
