import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { isAdminUser } from '@/lib/admin-auth'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminUser(user)) redirect('/dashboard')
  return <>{children}</>
}
