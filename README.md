# Painel_VIP — Vitrine tecnológica

Vitrine pública de infraestrutura de pesquisa que apresenta dados do VIP e do PNIPE/MCTI juntos ou separadamente, sempre identificando a fonte de cada registro.

## Experiência pública

- quatro painéis independentes: Laboratórios, Equipamentos, Instituições e Mapa;
- filtros por fonte, instituição, área temática, área de atuação, técnica e situação do equipamento;
- busca por nome, equipamento, técnica ou palavra-chave;
- painel próprio de detalhe, sem janela sobreposta, com campos técnicos e situação ativo/inativo;
- contato por telefone/e-mail, formulário que prepara a mensagem e vínculo do responsável com seu perfil no Observatório quando houver correspondência;
- mapa reativo com os registros que possuem coordenadas geográficas;
- área técnica de esquema e correlação preservada no código, mas fora da navegação pública.

O front segue a mesma tecnologia do [Observatorio_Tematico](https://github.com/petcau/Observatorio_Tematico): React, Babel e Tailwind carregados via CDN, JSX transformado no navegador, sem build e sem bundler.

## Como rodar

O navegador não fala direto com o SQL Server, então há um servidor Node mínimo que serve a pasta `public/` e expõe a API de dados.

```
npm install
cp .env.example .env   # preencha as credenciais do SQL Server
npm start              # http://localhost:3000
```

O `.env` não é versionado. Use um usuário do banco somente leitura. Não abra `public/index.html` direto nem pelo Live Server: sem o servidor Node, as chamadas a `/api` não funcionam.

## Publicação estática e dados do VIP

O GitHub Pages usa os catálogos públicos de `public/dados/`. O arquivo `vip.json` é gerado a partir do backup real, mas inclui somente os campos necessários à vitrine. CPF, nascimento, credenciais, hashes de senha e tokens não são exportados.

```powershell
node scripts/vip-sql-para-json.js `
  --input C:\caminho\vipdb_bkp.sql `
  --pnipe dados\pnipe.json `
  --pesquisadores C:\caminho\Observatorio_BTX\data\dados_simcc_completo.json
```

O comando também gera um índice público mínimo de pesquisadores para vincular contatos da infraestrutura às fichas do Observatório.

## Estrutura

- `server.js` — API Express. A vitrine usa `/api/vitrine`; as rotas anteriores de análise continuam disponíveis para compatibilidade.
- `public/index.html` — carrega as bibliotecas por CDN e os scripts na ordem.
- `public/js/config.js` — título, texto do rodapé e origem da API.
- `public/js/lib/` — formatação, cores e cliente da API.
- `public/js/components/` e `public/js/App.js` — interface em React (um arquivo por componente).
- `dados/` — dados do PNIPE para a aba "Correlação VIP × PNIPE" (seção Banco de Dados):
  - `pnipe_observatorio.xlsx` — planilha original; depois de trocá-la, rode `node scripts/pnipe-para-json.js` para gerar `pnipe.json` com descrições, áreas, técnicas, contatos, imagens e coordenadas;
  - `dicionario_pnipe_vip.json` — campo do PNIPE ↔ coluna do VIP;
  - `correspondencia_pnipe_vip.json` — laboratório do PNIPE ↔ localização/espaço físico do VIP (feita à mão).
