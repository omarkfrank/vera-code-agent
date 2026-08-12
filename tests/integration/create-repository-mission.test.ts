import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { createRepositoryMission } from "../../src/mission/create-repository-mission.js";

/**
 * Testes de integração da criação de missões
 * associadas a um repositório real temporário.
 *
 * Nenhum projeto existente do usuário é alterado.
 */
describe("createRepositoryMission", () => {
  /**
   * Valida a composição completa:
   *
   * repositório
   * → inspeção
   * → criação da missão.
   */
  it("deve criar missão utilizando o contexto do repositório", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-mission-"));

    try {
      const packageJson = {
        name: "mission-test-project",
        version: "1.0.0",
        type: "module",

        scripts: {
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

      const mission = await createRepositoryMission(
        directory,
        "Adicionar endpoint GET /health.",
      );

      assert.equal(mission.requirement, "Adicionar endpoint GET /health.");

      assert.equal(mission.status, "received");

      assert.equal(
        mission.repositoryInspection.project.name,
        "mission-test-project",
      );

      assert.equal(mission.repositoryInspection.project.packageManager, "npm");

      assert.deepEqual(mission.repositoryInspection.technologies, [
        "TypeScript",
        "Express",
      ]);
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });

  /**
   * A criação da missão não deve prosseguir caso
   * o diretório não possua um package.json.
   */
  it("deve falhar quando o repositório não possuir package.json", async () => {
    const directory = await mkdtemp(join(tmpdir(), "vera-mission-"));

    try {
      await assert.rejects(
        createRepositoryMission(directory, "Criar uma nova funcionalidade."),
        (error: unknown) => {
          return (
            error instanceof Error && "code" in error && error.code === "ENOENT"
          );
        },
      );
    } finally {
      await rm(directory, {
        recursive: true,
        force: true,
      });
    }
  });
});
