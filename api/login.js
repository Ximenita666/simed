const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const { usuario, password } = req.body || {};
  if (!usuario || !password) return res.status(400).json({ error: 'Credenciales requeridas' });

  const { data: user, error: userErr } = await supabase
    .from('usuarios')
    .select('id_user, nameuser, privilegios, id_unidad')
    .eq('usuario', usuario)
    .eq('password', password)
    .single();

  if (userErr || !user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos', debug: userErr?.message });
  }

  const { data: unidad } = await supabase
    .from('unidades')
    .select('iniciales_u')
    .eq('id_unidad', user.id_unidad)
    .single();

  return res.status(200).json({
    id_user:     user.id_user,
    nameuser:    user.nameuser,
    privilegios: user.privilegios,
    id_unidad:   user.id_unidad,
    iniciales_u: unidad?.iniciales_u ?? ''
  });
};
