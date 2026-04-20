const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const MONTH_NAMES = {
  '01':'enero','02':'febrero','03':'marzo','04':'abril','05':'mayo','06':'junio',
  '07':'julio','08':'agosto','09':'septiembre','10':'octubre','11':'noviembre','12':'diciembre'
};

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });

  const { fi, ff, id_unidad, privilegios } = req.query;
  if (!fi || !ff) return res.status(400).json({ error: 'Fechas requeridas' });

  let query = supabase
    .from('registro')
    .select('id_unidad, fecha_egreso, hora_corte, unidades(iniciales_u)')
    .gte('fecha_egreso', fi)
    .lte('fecha_egreso', ff)
    .order('fecha_egreso', { ascending: true });

  if (String(privilegios) !== '1' && id_unidad) {
    query = query.eq('id_unidad', id_unidad);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const byFechaUnidad = {};
  for (const row of (data || [])) {
    const fecha  = row.fecha_egreso;
    const unidad = row.unidades?.iniciales_u || '';
    const corte  = (row.hora_corte || '').trim();
    if (!byFechaUnidad[fecha]) byFechaUnidad[fecha] = {};
    if (!byFechaUnidad[fecha][unidad])
      byFechaUnidad[fecha][unidad] = { c06: false, c12: false, c18: false };
    if (corte.includes('06')) byFechaUnidad[fecha][unidad].c06 = true;
    if (corte.includes('12')) byFechaUnidad[fecha][unidad].c12 = true;
    if (corte.includes('18')) byFechaUnidad[fecha][unidad].c18 = true;
  }

  const allRecords = [];
  const months = {};

  for (const [fecha, unidades] of Object.entries(byFechaUnidad)) {
    const mesNum = fecha.split('-')[1];
    const mesKey = MONTH_NAMES[mesNum] || mesNum;
    for (const [unidad, cortes] of Object.entries(unidades)) {
      const suma = (cortes.c06?1:0)+(cortes.c12?1:0)+(cortes.c18?1:0);
      const cumpl = suma===3?'Si':suma>0?'Parcial':'No';
      const rec = { unidad, fecha, c06: cortes.c06?'Si':'No', c12: cortes.c12?'Si':'No',
                    c18: cortes.c18?'Si':'No', cumpl, mes: mesKey };
      allRecords.push(rec);
      if (!months[mesKey]) months[mesKey] = [];
      months[mesKey].push(rec);
    }
  }

  return res.status(200).json({ months, totalRecords: allRecords.length, allRecords });
};
