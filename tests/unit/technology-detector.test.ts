import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { detectTechnologies } from "../../src/inspection/technology-detector.js";

/**
 * Testes unitários do detector de tecnologias da VERA.
 *
 * Esta suíte valida a regra de detecção de maneira isolada,
 * sem depender da CLI, do sistema de arquivos ou de um
 * package.json existente fisicamente no computador.
 *
 * Como detectTechnologies é uma função pura, podemos fornecer
 * diferentes manifests diretamente e comparar os resultados.
 */
describe("detectTechnologies", () => {
  /**
   * Valida tecnologias instaladas como dependências
   * utilizadas em produção.
   */
  it("deve detectar tecnologias declaradas em dependencies", () => {
    const technologies = detectTechnologies({
      dependencies: {
        express: "^5.0.0",
        react: "^19.0.0",
      },
    });

    assert.deepEqual(technologies, ["Express", "React"]);
  });

  /**
   * Valida tecnologias declaradas como dependências
   * utilizadas somente durante o desenvolvimento.
   */
  it("deve detectar tecnologias declaradas em devDependencies", () => {
    const technologies = detectTechnologies({
      devDependencies: {
        typescript: "^7.0.0",
        tsx: "^4.0.0",
      },
    });

    assert.deepEqual(technologies, ["TypeScript", "TSX"]);
  });

  /**
   * Garante que dependencies e devDependencies sejam
   * consideradas conjuntamente durante a detecção.
   */
  it("deve combinar dependencies e devDependencies", () => {
    const technologies = detectTechnologies({
      dependencies: {
        fastify: "^5.0.0",
      },
      devDependencies: {
        typescript: "^7.0.0",
        vitest: "^4.0.0",
      },
    });

    assert.deepEqual(technologies, ["TypeScript", "Fastify", "Vitest"]);
  });

  /**
   * Pacotes desconhecidos pela VERA não devem provocar
   * erros nem gerar falsos positivos.
   */
  it("deve ignorar pacotes ainda não reconhecidos", () => {
    const technologies = detectTechnologies({
      dependencies: {
        "pacote-desconhecido": "^1.0.0",
      },
    });

    assert.deepEqual(technologies, []);
  });

  /**
   * Um projeto sem dependências também representa
   * uma entrada válida para o detector.
   */
  it("deve retornar lista vazia quando não houver dependências", () => {
    const technologies = detectTechnologies({});

    assert.deepEqual(technologies, []);
  });

  /**
   * Garante que uma tecnologia não apareça duplicada
   * quando estiver declarada simultaneamente nos dois
   * grupos de dependências.
   */
  it("não deve duplicar tecnologia declarada nos dois grupos", () => {
    const technologies = detectTechnologies({
      dependencies: {
        express: "^5.0.0",
      },
      devDependencies: {
        express: "^5.0.0",
      },
    });

    assert.deepEqual(technologies, ["Express"]);
  });
});
