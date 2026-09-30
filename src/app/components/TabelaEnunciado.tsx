import type { StemTable } from '../../core/schema'

/**
 * Tabela do enunciado: a tabela de dados da leitura de tabela e as duas
 * colunas da comparação.
 *
 * <table> de verdade, com <caption> e cabeçalhos com `scope`, e não uma grade
 * de <div>: o leitor de tela anuncia "linha Westgate, coluna Sales, 12,400", e
 * sem isso a questão seria uma sopa de números. A primeira célula de cada
 * linha é o cabeçalho da linha — o rótulo na tabela de dados, o número da
 * linha na comparação, que é como as alternativas se referem a ela.
 *
 * Números e códigos saem em monoespaçada tabular: é a única forma de o olho
 * comparar coluna com coluna sem que a largura dos dígitos engane.
 */
export function TabelaEnunciado({ tabela }: { tabela: StemTable }) {
  const [rotuloDaLinha, ...colunas] = tabela.columns
  const dados = tabela.layout === 'dados'

  return (
    <div className={`tabela-enunciado ${tabela.layout}`}>
      <table>
        {tabela.caption && <caption>{tabela.caption}</caption>}
        <thead>
          <tr>
            <th scope="col">{rotuloDaLinha}</th>
            {colunas.map((coluna, i) => (
              <th key={i} scope="col" className={dados ? 'n' : undefined}>
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.rows.map(([rotulo, ...celulas], i) => (
            <tr key={i}>
              <th scope="row">{rotulo}</th>
              {celulas.map((celula, j) => (
                <td key={j} className={dados ? 'n' : undefined}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
