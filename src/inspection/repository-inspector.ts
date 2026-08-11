import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

import { detectConfigurationFiles } from "./configuration-file-detector.js";
import { detectPackageManager } from "./package-manager-detector.js";
import type { RepositoryInspection } from "./repository-inspection.js";
import { detectTechnologies } from "./technology-detector.js";

/**
 * Representa somente os campos do package.json necessários
 * durante a inspeção atual da VERA.
 *
 * Todos são opcionais porque projetos Node.js podem possuir
 * manifests parcialmente configurados.
 */
interface PackageJson {
  name?: string;
  version?: string;
  type?: string;
  packageManager?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Inspeciona um diretório e produz uma representação
 * estruturada das informações identificadas.
 *
 * Responsabilidades:
 *
 * - ler e interpretar o package.json;
 * - consultar os arquivos existentes na raiz;
 * - detectar arquivos de configuração conhecidos;
 * - detectar o gerenciador de pacotes;
 * - detectar tecnologias;
 * - verificar a presença de Git;
 * - retornar os dados sem qualquer formatação de terminal.
 *
 * A função opera exclusivamente em modo de leitura.
 *
 * @param directory Diretório que deverá ser analisado.
 * @returns Resultado estruturado da inspeção.
 */
export async function inspectRepository(
  directory: string,
): Promise<RepositoryInspection> {
  const packageJsonPath = join(directory, "package.json");

  /**
   * O package.json é carregado como texto antes do parse.
   *
   * Eventuais erros de arquivo inexistente ou JSON inválido
   * são propagados para a camada responsável por decidir
   * como apresentá-los ao usuário.
   */
  const packageJsonContent = await readFile(packageJsonPath, "utf-8");

  const packageJson = JSON.parse(packageJsonContent) as PackageJson;

  /**
   * A raiz é consultada uma única vez.
   *
   * A lista resultante pode alimentar diferentes detectores
   * sem repetir acessos desnecessários ao filesystem.
   */
  const rootEntries = await readdir(directory, {
    withFileTypes: true,
  });

  const rootEntryNames = rootEntries.map((entry) => entry.name);

  const configurationFiles = detectConfigurationFiles(rootEntryNames);

  /**
   * declaredPackageManager só é enviado quando existe.
   *
   * Esse comportamento respeita a opção
   * exactOptionalPropertyTypes habilitada no projeto.
   */
  const packageManager = detectPackageManager({
    files: configurationFiles,

    ...(packageJson.packageManager !== undefined
      ? {
          declaredPackageManager: packageJson.packageManager,
        }
      : {}),
  });

  const technologies = detectTechnologies(packageJson);

  const scripts = Object.keys(packageJson.scripts ?? {});

  const hasGitRepository = rootEntryNames.includes(".git");

  return {
    directory,

    project: {
      name: packageJson.name ?? null,
      version: packageJson.version ?? null,
      runtime: "Node.js",

      moduleSystem: packageJson.type === "module" ? "ESM" : "CommonJS",

      packageManager,
    },

    scripts,
    technologies,
    configurationFiles,

    git: {
      detected: hasGitRepository,
    },
  };
}
