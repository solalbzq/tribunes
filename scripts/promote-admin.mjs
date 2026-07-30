// Attribue (ou retire) le rôle admin à un compte Supabase existant, en
// posant/effaçant app_metadata.role — seul champ lu par lib/admin-auth.ts
// pour autoriser l'accès à /admin. app_metadata n'est modifiable que via
// l'API service-role (jamais par l'utilisateur lui-même), d'où ce script.
//
// Usage :
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/promote-admin.mjs email@exemple.fr
//
// Pour retirer le rôle :
//   node scripts/promote-admin.mjs email@exemple.fr --revoke

import { createClient } from '@supabase/supabase-js'

const email = process.argv[2]
const revoke = process.argv.includes('--revoke')

if (!email) {
  console.error('Usage: node scripts/promote-admin.mjs <email> [--revoke]')
  process.exit(1)
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceRoleKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })

let page = 1
let user = null
while (!user) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
  if (error) {
    console.error('Échec de la recherche du compte :', error.message)
    process.exit(1)
  }
  user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (user || data.users.length < 200) break
  page += 1
}

if (!user) {
  console.error(`Aucun compte trouvé pour ${email}.`)
  process.exit(1)
}

const nextAppMetadata = { ...user.app_metadata }
if (revoke) delete nextAppMetadata.role
else nextAppMetadata.role = 'admin'

const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
  app_metadata: nextAppMetadata,
})

if (updateError) {
  console.error('Échec de la mise à jour :', updateError.message)
  process.exit(1)
}

console.log(revoke ? `Rôle admin retiré pour ${email}.` : `${email} est maintenant admin.`)
