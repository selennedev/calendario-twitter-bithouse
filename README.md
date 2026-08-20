# Bit House — Content Calendar

Dashboard editorial de 30 dias para a Bit House.

## Recursos

- Calendário de 30 posts
- Checkbox de publicação
- Status: Planejado / Em produção / Agendado / Publicado
- Horário editável
- Funil e pilar editorial
- Ideia, objetivo, hook, legenda, CTA e observações
- Métricas pós-publicação
- Filtros e busca
- Pipeline Kanban
- Painel de métricas
- Salvamento automático em localStorage
- Exportação/importação do progresso em JSON
- Responsivo para celular

## GitHub Pages

1. Crie um repositório no GitHub.
2. Envie `index.html`, `style.css` e `script.js`.
3. Vá em **Settings → Pages**.
4. Em **Build and deployment**, escolha **Deploy from a branch**.
5. Selecione `main` e `/root`.
6. Salve.
7. Aguarde o GitHub Pages publicar.

## Alterar as datas

As datas ficam no objeto `BIT_HOUSE_POSTS` dentro do `index.html`. Para começar a campanha em outra data, altere o campo `date` de cada post.

## Importante

O progresso fica salvo no navegador por `localStorage`. Para compartilhar o mesmo progresso entre computadores/celulares, será necessário adicionar um backend, como Supabase ou Firebase.
