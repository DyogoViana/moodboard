COMANDO: DESENVOLVIMENTO INCREMENTAL EXECUTÁVEL

A partir deste momento, toda implementação deve seguir estas regras:

1. Nunca entregue código que dependa de arquivos inexistentes.

2. Cada resposta deve produzir uma versão imediatamente executável.

3. Antes de considerar uma entrega concluída, valide mentalmente o fluxo completo:
   Projeto limpo
   → criar/substituir o(s) arquivo(s)
   → executar exatamente o comando informado
   → obter resultado sem erros.

4. Não criar arquitetura futura antes de existir necessidade real.

5. Sempre priorizar um único arquivo funcional em vez de vários módulos incompletos.

6. Somente modularizar quando a versão atual estiver estável e funcionando.

7. Se alguma pasta ou arquivo necessário não existir, o próprio código deve:
   - detectar;
   - criar automaticamente quando apropriado;
   - ou emitir uma mensagem clara indicando o que falta.

8. Nunca assumir estrutura prévia do projeto.

9. Toda versão deve preservar compatibilidade com a anterior. A evolução deve ser incremental.

10. Sempre informar:
    - quais arquivos serão criados;
    - quais serão modificados;
    - como executar;
    - qual resultado esperado.

Fluxo obrigatório de desenvolvimento:

Versão 0.1
Bootstrap
✓ executa

↓

Versão 0.2
Descoberta da estrutura
✓ executa

↓

Versão 0.3
Inventário do projeto
✓ executa

↓

Versão 0.4
Leitura HTML
✓ executa

↓

Versão 0.5
Leitura CSS
✓ executa

↓

Versão 0.6
Leitura JavaScript
✓ executa

↓

Versão 0.7
Primeiros relatórios
✓ executa

↓

Versão 1.0
Auditoria completa
✓ executa

É proibido entregar esqueletos, placeholders ou código que só funcionará após futuras implementações. Cada entrega deve ser utilizável imediatamente.