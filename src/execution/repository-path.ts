import { realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * Erro específico para tentativas de acessar
 * recursos fora da raiz autorizada do repositório.
 */
export class RepositoryPathViolationError extends Error {
  public readonly target: string;

  public constructor(target: string, message: string) {
    super(message);

    this.name = "RepositoryPathViolationError";

    this.target = target;
  }
}

/**
 * Verifica se um caminho resolvido escapou
 * da raiz autorizada do repositório.
 *
 * `path.relative()` também permite detectar,
 * no Windows, caminhos pertencentes a outra unidade.
 */
function isOutsideRepository(
  repositoryRoot: string,
  candidatePath: string,
): boolean {
  const relativePath = relative(repositoryRoot, candidatePath);

  return (
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  );
}

/**
 * Resolve um caminho fornecido por uma ação da VERA
 * garantindo que ele permaneça dentro do repositório.
 *
 * A validação ocorre em duas etapas:
 *
 * 1. proteção lexical contra `../` e caminhos absolutos;
 * 2. validação utilizando `realpath`, reduzindo também
 *    o risco de escapes por links simbólicos.
 *
 * @param repositoryRoot Raiz autorizada do repositório.
 * @param target Caminho relativo solicitado pela ação.
 * @returns Caminho absoluto e validado.
 */
export async function resolveProtectedRepositoryPath(
  repositoryRoot: string,
  target: string,
): Promise<string> {
  const normalizedTarget = target.trim();

  if (normalizedTarget.length === 0) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho alvo não pode estar vazio.",
    );
  }

  /**
   * Uma operação sobre o repositório nunca deve
   * aceitar diretamente caminhos absolutos.
   */
  if (isAbsolute(normalizedTarget)) {
    throw new RepositoryPathViolationError(
      target,
      "Caminhos absolutos não são permitidos.",
    );
  }

  /**
   * Utilizamos o caminho físico real da raiz.
   */
  const repositoryRealPath = await realpath(repositoryRoot);

  /**
   * Primeira barreira:
   * impede escapes lexicais como ../../arquivo.
   */
  const candidatePath = resolve(repositoryRealPath, normalizedTarget);

  if (isOutsideRepository(repositoryRealPath, candidatePath)) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho solicitado está fora do repositório autorizado.",
    );
  }

  /**
   * Segunda barreira:
   * resolve o caminho físico real do alvo.
   *
   * Isso também evita que um link existente dentro
   * do repositório direcione a leitura para fora
   * da raiz autorizada.
   */
  const targetRealPath = await realpath(candidatePath);

  if (isOutsideRepository(repositoryRealPath, targetRealPath)) {
    throw new RepositoryPathViolationError(
      target,
      "O caminho físico solicitado está fora do repositório autorizado.",
    );
  }

  return targetRealPath;
}
