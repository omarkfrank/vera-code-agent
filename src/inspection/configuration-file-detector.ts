/**
 * Arquivos de configuração e lockfiles reconhecidos
 * atualmente pela VERA durante a inspeção de um projeto.
 *
 * O catálogo poderá crescer conforme novos ecossistemas
 * e ferramentas forem suportados.
 */
const KNOWN_CONFIGURATION_FILES = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "tsconfig.json",
  "eslint.config.js",
  "eslint.config.mjs",
  "eslint.config.ts",
  "prettier.config.js",
  "prettier.config.mjs",
  ".prettierrc",
  ".gitignore",
  ".env.example",
] as const;

/**
 * Identifica arquivos de configuração conhecidos entre
 * os arquivos existentes na raiz de um repositório.
 *
 * A função é pura:
 * - não acessa o filesystem;
 * - não modifica arquivos;
 * - não depende da CLI;
 * - produz sempre o mesmo resultado para a mesma entrada.
 *
 * @param files Nomes encontrados na raiz do projeto.
 * @returns Arquivos reconhecidos pela VERA.
 */
export function detectConfigurationFiles(files: readonly string[]): string[] {
  const availableFiles = new Set(files);

  return KNOWN_CONFIGURATION_FILES.filter((file) => availableFiles.has(file));
}
