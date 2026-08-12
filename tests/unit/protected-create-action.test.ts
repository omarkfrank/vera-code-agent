import assert from "node:assert/strict";

import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { tmpdir } from "node:os";

import { join, relative } from "node:path";

import { describe, it } from "node:test";

import {
  createFileExecutionAction,
  InvalidCreateExecutionActionDefinitionError,
} from "../../src/execution/create-file-execution-action.js";

import {
  executeCreateAction,
  InvalidCreateExecutionActionError,
  MAX_CREATE_FILE_SIZE_BYTES,
  RepositoryCreateConflictError,
  RepositoryCreateError,
} from "../../src/execution/execute-create-action.js";

import type { ExecutionAction } from "../../src/execution/mission-execution.js";

import { RepositoryPathViolationError } from "../../src/execution/repository-path.js";

const EXECUTION_ID = "protected-create-execution-001";

describe("Protected Create Action", () => {
  it("deve criar uma definição válida de Create Action", () => {
    const action = createFileExecutionAction(
      EXECUTION_ID,
      1,
      "  src/example.ts  ",
      "export const example = true;\n",
    );

    assert.equal(action.executionId, EXECUTION_ID);

    assert.equal(action.type, "create");

    assert.equal(action.order, 1);

    assert.equal(action.target, "src/example.ts");

    assert.equal(action.content, "export const example = true;\n");
  });

  it("deve rejeitar definição inválida", () => {
    assert.throws(
      () => createFileExecutionAction("   ", 1, "src/example.ts", ""),
      InvalidCreateExecutionActionDefinitionError,
    );

    assert.throws(
      () => createFileExecutionAction(EXECUTION_ID, 0, "src/example.ts", ""),
      InvalidCreateExecutionActionDefinitionError,
    );

    assert.throws(
      () => createFileExecutionAction(EXECUTION_ID, 1, "   ", ""),
      InvalidCreateExecutionActionDefinitionError,
    );
  });

  it("deve criar novo arquivo textual dentro do repositório", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-protected-create-"));

    try {
      await mkdir(join(directory, "src"));

      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "src/example.ts",
        'export const message = "VERA";\n',
      );

      const result = await executeCreateAction(directory, action);

      const createdContent = await readFile(
        join(directory, "src", "example.ts"),
        "utf8",
      );

      assert.equal(result.status, "success");

      assert.equal(result.target, "src/example.ts");

      assert.equal(createdContent, 'export const message = "VERA";\n');
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve registrar quantidade real de bytes UTF-8", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-unicode-"));

    try {
      const content = "VERA — criação segura 🚀";

      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "unicode.txt",
        content,
      );

      const result = await executeCreateAction(directory, action);

      assert.equal(result.bytesWritten, Buffer.byteLength(content, "utf8"));
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("não deve sobrescrever arquivo existente", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-conflict-"));

    try {
      const existingPath = join(directory, "existing.txt");

      await writeFile(existingPath, "conteúdo original", "utf8");

      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "existing.txt",
        "novo conteúdo",
      );

      await assert.rejects(
        executeCreateAction(directory, action),
        RepositoryCreateConflictError,
      );

      /**
       * Prova adicional:
       * o conteúdo anterior precisa permanecer
       * absolutamente intacto.
       */
      assert.equal(await readFile(existingPath, "utf8"), "conteúdo original");
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve bloquear tentativa de escapar do repositório", async () => {
    const workspace = await mkdtemp(join(tmpdir(), "vera-create-traversal-"));

    const repository = join(workspace, "repository");

    try {
      await mkdir(repository);

      const outsideTarget = join(workspace, "outside.txt");

      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        relative(repository, outsideTarget),
        "não permitido",
      );

      await assert.rejects(
        executeCreateAction(repository, action),
        RepositoryPathViolationError,
      );
    } finally {
      await rm(workspace, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve bloquear caminho absoluto", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-absolute-"));

    try {
      const absoluteTarget = join(directory, "absolute.txt");

      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        absoluteTarget,
        "conteúdo",
      );

      await assert.rejects(
        executeCreateAction(directory, action),
        RepositoryPathViolationError,
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve bloquear sintaxe de Alternate Data Stream", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-ads-"));

    try {
      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "example.txt:hidden",
        "conteúdo",
      );

      await assert.rejects(
        executeCreateAction(directory, action),
        RepositoryPathViolationError,
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar diretório pai inexistente", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-parent-"));

    try {
      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "missing/example.ts",
        "conteúdo",
      );

      await assert.rejects(executeCreateAction(directory, action), {
        name: "RepositoryCreateError",

        message: "O diretório pai do arquivo não existe.",
      });
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar conteúdo com byte nulo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-binary-"));

    try {
      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "binary.txt",
        "VERA\u0000DATA",
      );

      await assert.rejects(
        executeCreateAction(directory, action),
        RepositoryCreateError,
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar conteúdo acima do limite permitido", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-create-large-"));

    try {
      const action = createFileExecutionAction(
        EXECUTION_ID,
        1,
        "large.txt",
        "A".repeat(MAX_CREATE_FILE_SIZE_BYTES + 1),
      );

      await assert.rejects(
        executeCreateAction(directory, action),
        RepositoryCreateError,
      );
    } finally {
      await rm(directory, {
        recursive: true,

        force: true,
      });
    }
  });

  it("deve rejeitar ação que não seja create", async () => {
    const action: ExecutionAction = {
      executionId: EXECUTION_ID,

      id: "invalid-create-action",

      order: 1,

      type: "read",

      description: "Ler package.json.",

      target: "package.json",
    };

    await assert.rejects(
      executeCreateAction(process.cwd(), action),
      InvalidCreateExecutionActionError,
    );
  });
});
