import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { fi, ff, id_unidad, privilegios } = req.query;
  if (!fi || !ff) return res.status(400).json({ error: 'Fechas requeridas', data: [] });

  let query = supabase
    .from('registro')
    .select(`
      *,
      unidades(iniciales_u),
      camas(total_camas_censa, camas_censa_gineco, camas_censa_ped,
            camas_censa_cirugia, camas_censa_medi, nocensa_urgencias,
            nocensa_uci_adultos, nocensa_uci_pediatricos, nocensa_uci_neonatal)
    `)
    .gte('fecha_egreso', fi)
    .lte('fecha_egreso', ff)
    .order('fecha_egreso', { ascending: true })
    .order('hora_corte', { ascending: true });

  // Privilegio 2 = solo ve su unidad
  if (String(privilegios) !== '1' && id_unidad) {
    query = query.eq('id_unidad', id_unidad);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message, data: [] });

  const pct = (ocup, cens) => cens > 0 ? Math.round((ocup / cens) * 100 * 10) / 10 : 0;

  const records = data.map(r => {
    const c = r.camas ?? {};
    const tot_cens = c.total_camas_censa ?? 0;
    const tot_ocup = (r.gine_ocupadas ?? 0) + (r.pedia_ocupadas ?? 0)
                   + (r.cirugia_ocupadas ?? 0) + (r.medi_ocupadas ?? 0);
    const tot_egr  = (r.gine_egresos ?? 0) + (r.pedia_egresos ?? 0)
                   + (r.cirugia_egresos ?? 0) + (r.medi_egresos ?? 0);
    const tot_pre  = (r.gine_prealtas ?? 0) + (r.pedia_prealtas ?? 0)
                   + (r.cirugia_prealtas ?? 0) + (r.medi_prealtas ?? 0);

    return {
      unidad:          r.unidades?.iniciales_u ?? '',
      fecha:           r.fecha_egreso,
      hora:            r.hora_corte,
      censables:       tot_cens,
      ocupadas:        tot_ocup,
      egresos:         tot_egr,
      pct:             pct(tot_ocup, tot_cens),
      prealtas:        tot_pre,
      // Cirugía
      cir_censables:   c.camas_censa_cirugia ?? 0,
      cir_ocupadas:    r.cirugia_ocupadas ?? 0,
      cir_egresos:     r.cirugia_egresos ?? 0,
      cir_pct:         pct(r.cirugia_ocupadas ?? 0, c.camas_censa_cirugia ?? 0),
      cir_prealtas:    r.cirugia_prealtas ?? 0,
      // Medicina
      med_censables:   c.camas_censa_medi ?? 0,
      med_ocupadas:    r.medi_ocupadas ?? 0,
      med_egresos:     r.medi_egresos ?? 0,
      med_pct:         pct(r.medi_ocupadas ?? 0, c.camas_censa_medi ?? 0),
      med_prealtas:    r.medi_prealtas ?? 0,
      // Urgencias
      urg_censables:   c.nocensa_urgencias ?? 0,
      urg_ocupadas:    r.urgencias_ocupadas ?? 0,
      urg_egresos:     r.urgencias_egresos ?? 0,
      urg_pct:         pct(r.urgencias_ocupadas ?? 0, c.nocensa_urgencias ?? 0),
      // UCI Adultos
      ucia_censables:  c.nocensa_uci_adultos ?? 0,
      ucia_ocupadas:   r.adultos_ocupadas ?? 0,
      ucia_egresos:    r.adultos_egresos ?? 0,
      ucia_pct:        pct(r.adultos_ocupadas ?? 0, c.nocensa_uci_adultos ?? 0),
      // UCI Pediátricos
      ucip_censables:  c.nocensa_uci_pediatricos ?? 0,
      ucip_ocupadas:   r.pediatricos_ocupadas ?? 0,
      ucip_egresos:    r.pediatricos_egresos ?? 0,
      ucip_pct:        pct(r.pediatricos_ocupadas ?? 0, c.nocensa_uci_pediatricos ?? 0),
      // UCI Neonatal
      ucin_censables:  c.nocensa_uci_neonatal ?? 0,
      ucin_ocupadas:   r.neonatal_ocupadas ?? 0,
      ucin_egresos:    r.neonatal_egresos ?? 0,
      ucin_pct:        pct(r.neonatal_ocupadas ?? 0, c.nocensa_uci_neonatal ?? 0),
      // Pediatría
      ped_censables:   c.camas_censa_ped ?? 0,
      ped_ocupadas:    r.pedia_ocupadas ?? 0,
      ped_egresos:     r.pedia_egresos ?? 0,
      ped_pct:         pct(r.pedia_ocupadas ?? 0, c.camas_censa_ped ?? 0),
      ped_prealtas:    r.pedia_prealtas ?? 0,
      // Ginecología
      gin_censables:   c.camas_censa_gineco ?? 0,
      gin_ocupadas:    r.gine_ocupadas ?? 0,
      gin_egresos:     r.gine_egresos ?? 0,
      gin_pct:         pct(r.gine_ocupadas ?? 0, c.camas_censa_gineco ?? 0),
      gin_prealtas:    r.gine_prealtas ?? 0,
    };
  });

  return res.status(200).json(records);
}
