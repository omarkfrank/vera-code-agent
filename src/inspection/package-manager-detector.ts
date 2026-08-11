/**
 * Dados necessários para identificar o gerenciador
 * de pacotes utilizado por um projeto.
 */
export interface PackageManagerDetectionInput {
  /**
   * Valor opcional declarado no campo "packageManager"
   * do package.json.
   *
   * Exemplo:
   * npm@11.7.0
   */
  declaredPackageManager?: string;

  /**
   * Arquivos encontrados na raiz do projeto.
   *
   * O detector utiliza os arquivos de lock como evidência
   * quando não existe declaração explícita no package.json.
   */
  files: readonly string[];
}

/**
 * Identifica o gerenciador de pacotes utilizado pelo projeto.
 *
 * Ordem de prioridade:
 *
 * 1. Campo "packageManager" declarado no package.json;
 * 2. package-lock.json  -> npm;
 * 3. pnpm-lock.yaml    -> pnpm;
 * 4. yarn.lock         -> yarn;
 * 5. bun.lock/bun.lockb -> bun.
 *
 * A função é pura:
 * - não acessa o filesystem;
 * - não modifica estado;
 * - não depende da CLI;
 * - sempre produz o mesmo resultado para a mesma entrada.
 */
export function detectPackageManager(
  input: PackageManagerDetectionInput,
): string {
  const declaredPackageManager = input.declaredPackageManager?.trim();

  /**
   * Uma declaração explícita possui prioridade sobre
   * qualquer arquivo de lock encontrado.
   *
   * Exemplo:
   * "npm@11.7.0" -> "npm"
   */
  if (declaredPackageManager) {
    const versionSeparatorIndex = declaredPackageManager.indexOf("@");

    if (versionSeparatorIndex > 0) {
      return declaredPackageManager.slice(0, versionSeparatorIndex);
    }

    return declaredPackageManager;
  }

  const files = new Set(input.files);

  if (files.has("package-lock.json")) {
    return "npm";
  }

  if (files.has("pnpm-lock.yaml")) {
    return "pnpm";
  }

  if (files.has("yarn.lock")) {
    return "yarn";
  }

  if (files.has("bun.lock") || files.has("bun.lockb")) {
    return "bun";
  }

  return "não identificado";
}
