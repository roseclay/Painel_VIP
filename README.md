# Painel_VIP — Vitrine de infraestrutura de pesquisa

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

## Publicação recomendada no Observatório

A vitrine pública usa os catálogos sanitizados de `public/dados/`. Ela não precisa de Node, SQL Server, credenciais ou acesso direto à base do VIP. O contêiner incluído serve a aplicação com Nginx tanto na raiz quanto em `/painel-vip/`:

```bash
docker compose up -d --build
curl http://localhost:8080/healthz
```

No proxy do Observatório, encaminhe `https://observatoriocti.secti.ba.gov.br/painel-vip/` para `http://painel-vip:80` (na mesma rede Docker) ou `http://127.0.0.1:8080` (porta publicada no host).

## API Node opcional

O `server.js` e a dependência `mssql` foram preservados para consultas internas ou futuras integrações com SQL Server. Eles não são necessários para a vitrine publicada. Para habilitá-los, configure um usuário somente leitura no `.env`, execute `npm install && npm start` e altere `usarApiServidor` para `true` em `public/js/config.js`.

## Publicação estática e dados do VIP

O GitHub Pages usa os catálogos públicos de `public/dados/`. O arquivo `vip.json` é gerado a partir do backup real, mas inclui somente os campos necessários à vitrine. CPF, nascimento, credenciais, hashes de senha e tokens não são exportados.

```powershell
node scripts/vip-sql-para-json.js `
  --input C:\caminho\vipdb_bkp.sql `
  --pnipe dados\pnipe.json `
  --pesquisadores C:\caminho\Observatorio_BTX\data\dados_simcc_completo.json

# Complementa os vínculos exatos por nome e instituição usando a API pública do SIMCC.
node scripts/enriquecer-usuarios-observatorio.js
```

O comando também gera um índice público mínimo de pesquisadores para vincular contatos da infraestrutura às fichas do Observatório e `public/dados/usuarios.json`, contendo somente nome, papel, instituição e laboratórios vinculados. Credenciais e dados privados não são exportados.

## Estrutura

- `Dockerfile`, `compose.yaml` e `deploy/nginx.conf` — publicação estática recomendada, sem banco.
- `server.js` — API Express opcional; as rotas anteriores de análise continuam disponíveis para compatibilidade.
- `public/index.html` — carrega as bibliotecas por CDN e os scripts na ordem.
- `public/js/config.js` — título, texto do rodapé e origem da API.
- `public/js/lib/` — formatação, cores e cliente da API.
- `public/js/components/` e `public/js/App.js` — interface em React (um arquivo por componente).
- `dados/` — dados do PNIPE para a aba "Correlação VIP × PNIPE" (seção Banco de Dados):
  - `pnipe_observatorio.xlsx` — planilha original; depois de trocá-la, rode `node scripts/pnipe-para-json.js` para gerar `pnipe.json` com descrições, áreas, técnicas, contatos, imagens e coordenadas;
  - `dicionario_pnipe_vip.json` — campo do PNIPE ↔ coluna do VIP;
  - `correspondencia_pnipe_vip.json` — laboratório do PNIPE ↔ localização/espaço físico do VIP (feita à mão).
