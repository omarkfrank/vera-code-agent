/**
 * Exibe as instruções básicas de utilização da CLI.
 */
export function printHelp(): void {
  console.log(`
VERA Code Agent

Uso:
  vera [comando]

Comandos:
  status    Exibe o estado operacional da VERA.
  inspect   Inspeciona o repositório atual.
  help      Exibe esta ajuda.

Exemplos:
  vera status
  vera inspect
  vera help
`);
}
