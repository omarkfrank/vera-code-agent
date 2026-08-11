import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { inspectRepository } from "../../src/inspection/repository-inspector.js";

/**
 * Testes de integração do RepositoryInspector.
 *
 * Diferentemente dos detectores unitários, estes testes
 * utilizam diretórios e arquivos temporários reais para
 * verificar a integração com o filesystem.
 *
 * Nenhum projeto existente do usuário é alterado.
 */
describe("inspectRepository", () => {
  /**
   * Valida uma inspeção completa de um projeto Node.js
   * utilizando npm, ESM, TypeScript, Express e Git.
   */
  it("deve produzir uma inspeção estruturada do repositório", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-repository-"));

    try {
      const packageJson = {
        name: "temporary-project",
        version: "1.0.0",
        type: "module",

        scripts: {
          dev: "tsx src/main.ts",
          test: "node --test",
        },

        dependencies: {
          express: "^5.0.0",
        },

        devDependencies: {
          typescript: "^7.0.0",
        },
      };

      await writeFile(
        join(directory, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8",
      );

      await writeFile(join(directory, "package-lock.json"), "{}", "utf-8");

      await writeFile(join(directory, "tsconfig.json"), "{}", "utf-8");

      await writeFile(join(directory, ".gitignore"), "node_modules/", "utf-8");

      await mkdir(join(directory, ".git"));

      const inspection = await inspectRepository(directory);

      assert.deepEqual(inspection, {
        directory,

        project: {
          name: "temporary-project",
          version: "1.0.0",
          runtime: "Node.js",
          moduleSystem: "ESM",
          packageManager: "npm",
        },

        scripts: ["dev", "test"],

        technologies: ["TypeScript", "Express"],

        configurationFiles: [
          "package.json",
          "package-lock.json",
          "tsconfig.json",
          ".gitignore",
        ],

        git: {
          detected: true,
        },
      });
    } finally {
      /**
       * O diretório temporário é removido mesmo caso
       * alguma asserção do teste falhe.
       */
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * Uma declaração explícita de packageManager deve
   * continuar prevalecendo sobre um lockfile encontrado.
   */
  it("deve respeitar o packageManager declarado no manifest", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-repository-"));

    try {
      const packageJson = {
        name: "pnpm-project",
        packageManager: "pnpm@10.0.0",
      };

      await writeFile(
        join(directory, "package.json"),
        JSON.stringify(packageJson, null, 2),
        "utf-8",
      );

      /**
       * Mesmo havendo package-lock.json, a declaração
       * explícita do manifest possui prioridade.
       */
      await writeFile(join(directory, "package-lock.json"), "{}", "utf-8");

      const inspection = await inspectRepository(directory);

      assert.equal(inspection.project.packageManager, "pnpm");
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * Valida um package.json mínimo, sem informações
   * adicionais sobre ferramentas ou Git.
   */
  it("deve lidar com um projeto mínimo", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-repository-"));

    try {
      await writeFile(join(directory, "package.json"), "{}", "utf-8");

      const inspection = await inspectRepository(directory);

      assert.equal(inspection.project.name, null);

      assert.equal(inspection.project.version, null);

      assert.equal(inspection.project.moduleSystem, "CommonJS");

      assert.equal(inspection.project.packageManager, "não identificado");

      assert.deepEqual(inspection.scripts, []);

      assert.deepEqual(inspection.technologies, []);

      assert.deepEqual(inspection.configurationFiles, ["package.json"]);

      assert.equal(inspection.git.detected, false);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
