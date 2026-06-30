import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

type WaitlistConfirmationProps = {
  baseUrl: string
}

export function WaitlistConfirmation({ baseUrl }: WaitlistConfirmationProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu es sur la liste — on te contacte bientôt 🏆</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLogo}>⚡ Tribunes</Text>
          </Section>
          <Section style={card}>
            <Text style={eyebrow}>Tribunes</Text>
            <Heading style={heading}>Ton inscription est confirmée</Heading>
            <Text style={paragraph}>
              Merci de rejoindre la liste d&apos;attente. Tribunes aide les clubs amateurs
              à générer automatiquement leurs posts, visuels et stories après les matchs
              et tournois, prêts à publier sur Instagram, Facebook et WhatsApp.
            </Text>
            <Text style={paragraph}>
              En tant qu&apos;early adopter, tu pourras profiter du tarif fondateur à 10€/mois
              à vie au lieu de 25€ après le lancement officiel.
            </Text>
            <Button href={`${baseUrl}/#pricing`} style={button}>
              Passer early adopter maintenant
            </Button>
            <Hr style={divider} />
            <Text style={signature}>L&apos;équipe Tribunes</Text>
            <Text style={footer}>© 2026 Tribunes</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const body = {
  backgroundColor: '#f8f8f8',
  fontFamily: 'Inter, Arial, sans-serif',
  margin: 0,
  padding: '32px 16px',
}

const container = {
  margin: '0 auto',
  maxWidth: '560px',
}

const header = {
  backgroundColor: '#1a1a2e',
  borderRadius: '16px 16px 0 0',
  padding: '20px 24px',
  textAlign: 'center' as const,
}

const headerLogo = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '800',
  letterSpacing: '-0.03em',
  margin: 0,
}

const card = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: '0 0 16px 16px',
  padding: '32px',
}

const eyebrow = {
  color: '#e94560',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  margin: '0 0 12px',
  textTransform: 'uppercase' as const,
}

const heading = {
  color: '#1a1a2e',
  fontSize: '28px',
  fontWeight: '800',
  lineHeight: '1.2',
  margin: '0 0 16px',
}

const paragraph = {
  color: '#6b7280',
  fontSize: '16px',
  lineHeight: '1.7',
  margin: '0 0 16px',
}

const button = {
  backgroundColor: '#e94560',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '15px',
  fontWeight: '600',
  marginTop: '8px',
  padding: '14px 20px',
  textDecoration: 'none',
}

const divider = {
  borderColor: '#e5e7eb',
  margin: '28px 0 20px',
}

const signature = {
  color: '#1a1a2e',
  fontSize: '15px',
  fontWeight: '600',
  margin: 0,
}

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '16px 0 0',
}
