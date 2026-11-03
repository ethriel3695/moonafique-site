import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  email: string;
}

export const WelcomeEmail = ({ email }: WelcomeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>New work, collection stories, and notes from the studio.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Moonafique!</Heading>
          <Text style={text}>
            {`Thank you for subscribing to our newsletter with ${email}. You’ll receive occasional notes about original artwork, collectible characters, and what’s happening in the Moonafique studio.`}
          </Text>
          <Text style={text}>{`Here’s what we’ll share:`}</Text>
          <ul style={list}>
            <li>New work and collection releases</li>
            <li>Stories and details behind the creations</li>
            <li>Upcoming Whatnot shows</li>
            <li>Works in progress from the studio</li>
          </ul>
          <Text style={text}>
            Questions? Contact us at hello@moonafique.com. This newsletter signup is separate from membership launch notifications.
          </Text>
          <Text style={footer}>
            <Link href="https://moonafique.com" style={link}>
              moonafique.com
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '560px',
};

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  lineHeight: '42px',
};

const text = {
  color: '#333',
  fontSize: '16px',
  margin: '24px 0',
};

const list = {
  color: '#333',
  fontSize: '16px',
  margin: '24px 0',
  paddingLeft: '24px',
};

const link = {
  color: '#2754C5',
  fontSize: '14px',
  textDecoration: 'underline',
};

const footer = {
  color: '#898989',
  fontSize: '14px',
  marginTop: '48px',
};

export default WelcomeEmail;
