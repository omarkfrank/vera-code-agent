/**
 * Exibe as instruções básicas de utilização
 * da interface de linha de comando da VERA.
 */
export function printHelp(): void {
  console.log(`
VERA Code Agent
Verification-Driven Engineering Repository Agent

Uso:
  vera [comando] [opções]

Comandos:
  status            Exibe o estado operacional da VERA.
  inspect           Inspeciona o repositório atual.
  plan              Cria um plano de missão para um requisito.
  run               Executa uma operação pelo workflow completo.
  help              Exibe esta ajuda.

Opções de inspect:
  --json            Retorna a inspeção em JSON estruturado.

Operações de run:
  read <arquivo>
                    Lê um arquivo através do workflow protegido.

  create <arquivo> --content "<conteúdo>"
                    Cria um novo arquivo textual sem sobrescrever
                    arquivos existentes.

Opções de run:
  --json            Retorna o resultado da missão em JSON estruturado.
                    Deve ser informado como último argumento.

Exemplos:
  vera status

  vera inspect

  vera inspect --json

  vera plan "Adicionar endpoint GET /health com testes"

  vera run read package.json

  vera run read package.json --json

  vera run create health.ts --content 'export const health = "ok";'

  vera run create health.ts --content 'export const health = "ok";' --json

  vera run create empty.txt --content ""

  vera help

Política operacional atual:
  READ              Permitido.
  CREATE            Permitido sem sobrescrita.
  UPDATE            Não autorizado.
  DELETE            Não autorizado.
  COMMAND           Não autorizado.
`);
}
