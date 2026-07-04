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

type OrganizationInvitationProps = {
  acceptUrl: string
  inviterEmail: string
  organizationName: string
}

export function OrganizationInvitation({ acceptUrl, inviterEmail, organizationName }: OrganizationInvitationProps) {
  return (
    <Html>
      <Head />
      <Preview>{inviterEmail} t'invite a rejoindre {organizationName} sur Tribunes</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={header}>
            <Text style={headerLogo}>Tribunes</Text>
          </Section>
          <Section style={card}>
            <Text style={eyebrow}>Invitation</Text>
            <Heading style={heading}>Rejoins {organizationName}</Heading>
            <Text style={paragraph}>
              {inviterEmail} t&apos;a invite a rejoindre l&apos;organisation {organizationName} sur Tribunes.
            </Text>
            <Text style={paragraph}>
              Clique sur le bouton ci-dessous pour accepter l&apos;invitation. Si tu n&apos;as pas encore de compte,
              Tribunes te proposera d&apos;en creer un avant de finaliser l&apos;acces.
            </Text>
            <Button href={acceptUrl} style={button}>
              Accepter l&apos;invitation
            </Button>
            <Hr style={divider} />
            <Text style={footer}>Ce lien expire dans 7 jours.</Text>
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
  color: '#2563eb',
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
  backgroundColor: '#2563eb',
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

const footer = {
  color: '#6b7280',
  fontSize: '12px',
  margin: 0,
}
