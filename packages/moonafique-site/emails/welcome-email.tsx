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
      <Preview>Welcome to Moonafique - Your Journey Begins Here!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Moonafique!</Heading>
          <Text style={text}>
            {`Thank you for subscribing to our newsletter with ${email}. We're excited to share
            our latest 3D printed creations, exclusive offers, and crafting tips
            with you.`}
          </Text>
          <Text style={text}>{`You'll be the first to know about:`}</Text>
          <ul style={list}>
            <li>New product launches</li>
            <li>Special discounts and promotions</li>
            <li>3D printing tips and tricks</li>
            <li>Behind-the-scenes content</li>
          </ul>
          <Text style={text}>
            If you have any questions, feel free to reply to this email.
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
