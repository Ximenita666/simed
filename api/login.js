import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY  // service_role para leer usuarios
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ error: 'Credenciales requeridas' });

  const { data, error } = await supabase
    .from('usuarios')
    .select('id_user, nameuser, privilegios, id_unidad, unidades(iniciales_u)')
    .eq('usuario', usuario)
    .eq('password', password)
    .single();

  if (error || !data) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

  return res.status(200).json({
    id_user:    data.id_user,
    nameuser:   data.nameuser,
    privilegios: data.privilegios,
    id_unidad:  data.id_unidad,
    iniciales_u: data.unidades?.iniciales_u ?? ''
  });
}
