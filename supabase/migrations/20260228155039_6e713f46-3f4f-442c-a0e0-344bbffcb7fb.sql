
CREATE OR REPLACE VIEW public.relatorio_territorio AS
SELECT
  c.territorio,
  COUNT(DISTINCT c.id) AS total_contatos,
  COUNT(DISTINCT lc.contato_id) AS ja_trabalhados,
  COUNT(DISTINCT lc.contato_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM registros r WHERE r.lista_contato_id = lc.id AND r.status = 'atendeu'
    )
  ) AS atenderam,
  COUNT(DISTINCT lc.contato_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM registros r WHERE r.lista_contato_id = lc.id AND r.status = 'nao-atendeu'
    )
  ) AS nao_atenderam,
  COUNT(DISTINCT lc.contato_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM registros r WHERE r.lista_contato_id = lc.id AND r.status = 'invalido'
    )
  ) AS invalidos,
  COUNT(DISTINCT lc.contato_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM registros r WHERE r.lista_contato_id = lc.id AND r.status = 'nao-quer'
    )
  ) AS nao_querem,
  COUNT(DISTINCT lc.contato_id) FILTER (
    WHERE EXISTS (
      SELECT 1 FROM registros r WHERE r.lista_contato_id = lc.id AND r.status = 'retornar'
    )
  ) AS retornar,
  COUNT(DISTINCT c.id) - COUNT(DISTINCT lc.contato_id) AS pendentes
FROM contatos c
LEFT JOIN lista_contatos lc ON lc.contato_id = c.id
GROUP BY c.territorio
ORDER BY c.territorio;
