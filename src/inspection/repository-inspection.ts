/**
 * Sistemas de módulos reconhecidos inicialmente pela VERA.
 */
export type ModuleSystem = "ESM" | "CommonJS";

/**
 * Informações básicas identificadas sobre o projeto.
 *
 * Nome e versão podem ser nulos porque esses campos
 * não são obrigatórios em todos os package.json.
 */
export interface InspectedProject {
  name: string | null;
  version: string | null;
  runtime: "Node.js";
  moduleSystem: ModuleSystem;
  packageManager: string;
}

/**
 * Resultado estruturado de uma inspeção de repositório.
 *
 * Este objeto representa os dados coletados pela VERA
 * antes de qualquer formatação específica da CLI.
 *
 * A separação é importante porque, futuramente, o mesmo
 * resultado poderá ser consumido por:
 *
 * - comandos da CLI;
 * - agentes de IA;
 * - relatórios;
 * - APIs;
 * - interfaces gráficas.
 */
export interface RepositoryInspection {
  directory: string;
  project: InspectedProject;
  scripts: string[];
  technologies: string[];
  configurationFiles: string[];
  git: {
    detected: boolean;
  };
}
