# Mur Admin

Panel administrativo independiente para operar Mur. Usa React, Vite, TypeScript,
CSS estandar y Supabase Auth.

## Alcance inicial

- Resumen de usuarios, publicaciones y reportes.
- Revision de reportes con resolucion, descarte y ocultamiento del post.
- Busqueda y moderacion de publicaciones.
- Busqueda, suspension y reactivacion de usuarios.
- Auditoria de todas las acciones administrativas.

## Configuracion local

1. Aplicar la migracion
   `mur-app/supabase/migrations/20260713120000_create_admin_console.sql` con el
   flujo habitual de Supabase del proyecto.
2. Dar acceso inicial a las cuentas administradoras desde Supabase SQL Editor:

   ```sql
   insert into public.admin_users (user_id)
   select id
   from public.profiles
   where email in ('admin-1@example.com', 'admin-2@example.com')
   on conflict (user_id) do nothing;
   ```

3. Desplegar la funcion que aplica suspensiones en Supabase Auth:

   ```powershell
   supabase functions deploy admin-manage-user
   ```

4. Crear `.env.local` a partir de `.env.example` y completar solamente:

   ```dotenv
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

5. Instalar dependencias e iniciar el entorno local:

   ```powershell
   npm install
   npm run dev
   ```

El servidor local queda configurado en `http://127.0.0.1:5174`.

## Seguridad

El navegador usa exclusivamente la clave publica de Supabase. Los datos internos
y las mutaciones se exponen mediante RPC con validacion de administrador en la
base de datos. La Edge Function usa la credencial de servidor que Supabase le
inyecta automaticamente; no se necesita ni debe agregarse una clave
`service_role` al panel.
