import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectPackageManager } from "../../src/inspection/package-manager-detector.js";

/**
 * Testes unitários responsáveis por validar a identificação
 * do gerenciador de pacotes utilizado pelo projeto.
 *
 * O detector recebe somente dados em memória, portanto
 * nenhum acesso real ao sistema de arquivos é necessário.
 */
describe("detectPackageManager", () => {
  /**
   * Uma declaração explícita no package.json possui
   * prioridade sobre qualquer arquivo de lock encontrado.
   */
  it("deve priorizar packageManager declarado no package.json", () => {
    const packageManager = detectPackageManager({
      declaredPackageManager: "npm@11.7.0",
      files: ["yarn.lock"],
    });

    assert.equal(packageManager, "npm");
  });

  /**
   * package-lock.json é utilizado pelo npm.
   */
  it("deve detectar npm por package-lock.json", () => {
    const packageManager = detectPackageManager({
      files: ["package.json", "package-lock.json"],
    });

    assert.equal(packageManager, "npm");
  });

  /**
   * pnpm-lock.yaml é utilizado pelo pnpm.
   */
  it("deve detectar pnpm por pnpm-lock.yaml", () => {
    const packageManager = detectPackageManager({
      files: ["package.json", "pnpm-lock.yaml"],
    });

    assert.equal(packageManager, "pnpm");
  });

  /**
   * yarn.lock identifica projetos gerenciados pelo Yarn.
   */
  it("deve detectar yarn por yarn.lock", () => {
    const packageManager = detectPackageManager({
      files: ["package.json", "yarn.lock"],
    });

    assert.equal(packageManager, "yarn");
  });

  /**
   * Versões atuais do Bun podem utilizar bun.lock.
   */
  it("deve detectar bun por bun.lock", () => {
    const packageManager = detectPackageManager({
      files: ["package.json", "bun.lock"],
    });

    assert.equal(packageManager, "bun");
  });

  /**
   * Projetos mais antigos do Bun podem utilizar bun.lockb.
   */
  it("deve detectar bun por bun.lockb", () => {
    const packageManager = detectPackageManager({
      files: ["package.json", "bun.lockb"],
    });

    assert.equal(packageManager, "bun");
  });

  /**
   * Sem declaração ou lockfile conhecido, o resultado
   * deve permanecer explícito e previsível.
   */
  it("deve retornar não identificado sem evidências conhecidas", () => {
    const packageManager = detectPackageManager({
      files: ["package.json"],
    });

    assert.equal(packageManager, "não identificado");
  });

  /**
   * Quando existem múltiplos lockfiles, a VERA aplica
   * uma ordem determinística de precedência.
   *
   * Futuramente essa condição poderá gerar também
   * um alerta de inconsistência do repositório.
   */
  it("deve aplicar precedência determinística com múltiplos lockfiles", () => {
    const packageManager = detectPackageManager({
      files: ["yarn.lock", "pnpm-lock.yaml", "package-lock.json"],
    });

    assert.equal(packageManager, "npm");
  });
});
