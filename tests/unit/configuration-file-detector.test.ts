import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectConfigurationFiles } from "../../src/inspection/configuration-file-detector.js";

/**
 * Testes unitários do detector de arquivos
 * de configuração da VERA.
 *
 * Nenhum acesso real ao filesystem é realizado.
 * Os nomes encontrados no repositório são fornecidos
 * diretamente como entrada da função.
 */
describe("detectConfigurationFiles", () => {
  /**
   * Arquivos conhecidos devem ser reconhecidos.
   */
  it("deve detectar arquivos de configuração conhecidos", () => {
    const files = detectConfigurationFiles([
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      ".gitignore",
    ]);

    assert.deepEqual(files, [
      "package.json",
      "package-lock.json",
      "tsconfig.json",
      ".gitignore",
    ]);
  });

  /**
   * Arquivos que não fazem parte do catálogo atual
   * não devem aparecer no diagnóstico.
   */
  it("deve ignorar arquivos desconhecidos", () => {
    const files = detectConfigurationFiles([
      "package.json",
      "README.md",
      "architecture.md",
      "arquivo-qualquer.txt",
    ]);

    assert.deepEqual(files, ["package.json"]);
  });

  /**
   * O detector deve reconhecer lockfiles de diferentes
   * gerenciadores de pacotes.
   */
  it("deve reconhecer diferentes arquivos de lock", () => {
    const files = detectConfigurationFiles([
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lock",
      "bun.lockb",
    ]);

    assert.deepEqual(files, [
      "pnpm-lock.yaml",
      "yarn.lock",
      "bun.lock",
      "bun.lockb",
    ]);
  });

  /**
   * Ausência de arquivos conhecidos deve resultar
   * em uma lista vazia, sem lançar exceções.
   */
  it("deve retornar lista vazia sem arquivos conhecidos", () => {
    const files = detectConfigurationFiles(["README.md", "LICENSE"]);

    assert.deepEqual(files, []);
  });

  /**
   * Entradas duplicadas não devem provocar
   * resultados duplicados.
   */
  it("não deve duplicar arquivos encontrados", () => {
    const files = detectConfigurationFiles([
      "package.json",
      "package.json",
      "tsconfig.json",
      "tsconfig.json",
    ]);

    assert.deepEqual(files, ["package.json", "tsconfig.json"]);
  });
});
