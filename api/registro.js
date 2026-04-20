import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role para insertar
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const body = req.body;
  if (!body || !body.id_unidad || !body.fecha_egreso || !body.hora_corte) {
    return res.status(400).json({ error: 'Datos requeridos faltantes' });
  }

  const { error, data } = await supabase
    .from('registro')
    .insert([body])
    .select('id_registro')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({ success: true, id_registro: data.id_registro });
}
