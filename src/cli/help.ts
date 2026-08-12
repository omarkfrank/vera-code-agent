/**
 * Exibe as instruções básicas de utilização
 * da interface de linha de comando da VERA.
 */
export function printHelp(): void {
  console.log(`
VERA Code Agent

Uso:
  vera [comando] [opções]

Comandos:
  status            Exibe o estado operacional da VERA.
  inspect           Inspeciona o repositório atual.
  plan              Cria um plano de missão para um requisito.
  help              Exibe esta ajuda.

Opções de inspect:
  --json            Retorna a inspeção em JSON estruturado.

Exemplos:
  vera status
  vera inspect
  vera inspect --json
  vera plan "Adicionar endpoint GET /health com testes"
  vera help
`);
}
