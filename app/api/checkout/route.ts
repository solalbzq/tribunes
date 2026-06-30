export async function POST() {
  return Response.json({ message: 'Paiement ouvert au lancement' }, { status: 503 })
}
