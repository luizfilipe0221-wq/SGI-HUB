// supabase/functions/ai-sugestoes/index.ts
// Deploy: supabase functions deploy ai-sugestoes
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { predios, lotes_ativos } = await req.json();

        const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!apiKey) {
            throw new Error('ANTHROPIC_API_KEY não configurada. Execute: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...');
        }

        const contexto = JSON.stringify({ predios, lotes_ativos }, null, 2);

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json',
            },
            body: JSON.stringify({
                model: 'claude-opus-4-6',
                max_tokens: 2048,
                messages: [
                    {
                        role: 'user',
                        content: `Você é um assistente de gestão de territórios de pregação. Analise os dados de prédios e lotes ativos abaixo e sugira novos lotes (grupos de prédios) para trabalho futuro.

Critérios de análise:
1. **Por Território**: Agrupe prédios do mesmo território que estão pendentes, não iniciados, ou com visitas incompletas
2. **Por Urgência**: Priorize prédios que:
   - Nunca foram visitados (vezes_na_lista = 0)
   - Têm pendência em aberto (tem_pendencia = true)
   - Não são visitados há muito tempo (ultima_vez_em antiga ou nula)
   - Têm alta proporção de apartamentos não visitados
3. **Tamanho ideal de lote**: 5 a 15 prédios por sugestão
4. **Não sugira** prédios que já estão em lotes ativos não finalizados

Dados atuais:
${contexto}

Retorne SOMENTE um JSON válido (sem markdown, sem texto extra) no seguinte formato:
{
  "sugestoes": [
    {
      "titulo": "Nome curto e descritivo para o lote sugerido",
      "motivo": "Explicação em 1-2 frases do porquê deste agrupamento e urgência",
      "prioridade": "alta",
      "territorio": "T1",
      "predios_ids": [1, 2, 3],
      "predios_nomes": ["Nome Prédio A", "Nome Prédio B"]
    }
  ],
  "resumo": "Resumo geral da situação territorial e próximos passos recomendados (2-3 frases)"
}

Valores válidos para prioridade: "alta", "media", "baixa"
Para territorio use o valor do campo territorio do prédio, ou "Misto" se houver mais de um território, ou null se não informado.`,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Claude API error ${response.status}: ${err}`);
        }

        const claudeData = await response.json();
        const text = claudeData.content?.[0]?.text ?? '';

        let parsed: unknown;
        try {
            // Remove possível markdown code fence
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch {
            parsed = { sugestoes: [], resumo: text };
        }

        return new Response(JSON.stringify(parsed), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return new Response(JSON.stringify({ error: msg }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});
