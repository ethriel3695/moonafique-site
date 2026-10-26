import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import * as React from "react";

export function GrimmunityInterestEmail({ test = false }: { test?: boolean }) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        You’re on the list. We’ll email you when Moonafique membership
        enrollment opens.
      </Preview>
      <Body
        style={{
          backgroundColor: "#f8f5f8",
          color: "#302637",
          fontFamily: "Arial, sans-serif",
          margin: 0,
          padding: "32px 12px",
        }}
      >
        <Container
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e5ddeb",
            borderRadius: 20,
            maxWidth: 560,
            padding: "32px 28px",
          }}
        >
          {test && (
            <Text
              style={{ backgroundColor: "#f1eaf7", padding: 12, fontSize: 13 }}
            >
              TEST EMAIL · Review copy for Moonafique. No live waiting-list
              signup was created.
            </Text>
          )}
          <Text
            style={{
              color: "#69428a",
              fontSize: 12,
              fontWeight: "bold",
              letterSpacing: 3,
            }}
          >
            MOONAFIQUE · COMMUNITIES
          </Text>
          <Heading
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 32,
              lineHeight: "38px",
              margin: "24px 0",
            }}
          >
            You’re on the Grimmunity waiting list!
          </Heading>
          <Text style={paragraph}>
            Thanks for joining us! We’ll email you when enrollment opens so you
            can choose a monthly Grimm or ACEO membership.
          </Text>
          <Text style={paragraph}>
            Choose a mystery Grimm Starter for $15, an exclusive painted Grimm
            Keeper for $30, two ACEO prints for $10, or one original ACEO for
            $20 each month. Shipping is additional.
          </Text>
          <Text
            style={{
              ...paragraph,
              backgroundColor: "#f5f0f8",
              borderRadius: 12,
              padding: 16,
            }}
          >
            This confirms your place on the waiting list. It doesn’t reserve a
            membership, start a subscription, or charge you.
          </Text>
          <Button
            href="https://www.moonafique.com/communities"
            style={{
              backgroundColor: "#69428a",
              borderRadius: 24,
              color: "#ffffff",
              fontSize: 15,
              fontWeight: "bold",
              padding: "14px 24px",
              textDecoration: "none",
            }}
          >
            Explore our communities
          </Button>
          <Text style={paragraph}>
            Thanks for collecting with us,
            <br />
            The Moonafique team
          </Text>
          <Text
            style={{
              color: "#6c6273",
              fontSize: 13,
              lineHeight: "20px",
              marginTop: 28,
            }}
          >
            You requested a Moonafique membership launch notice for our Grimm
            and ACEO collections. You haven’t been added to our general
            newsletter. If you didn’t sign up or want to leave the list,{" "}
            <Link
              href="mailto:hello@moonafique.com?subject=Remove%20me%20from%20the%20Grimmunity%20interest%20list"
              style={link}
            >
              email us to remove your address
            </Link>
            .
          </Text>
          <Text style={{ fontSize: 12 }}>
            <Link href="https://www.moonafique.com/privacy" style={link}>
              Privacy policy
            </Link>{" "}
            ·{" "}
            <Link href="https://www.moonafique.com" style={link}>
              Moonafique
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const paragraph = { fontSize: 16, lineHeight: "25px", margin: "20px 0" };
const link = { color: "#69428a", textDecoration: "underline" };

export async function interestMessage(test = false) {
  const email = <GrimmunityInterestEmail test={test} />;
  return {
    subject: `${test ? "[TEST] " : ""}You’re on the Grimmunity waiting list!`,
    html: await render(email),
    text: await render(email, { plainText: true }),
  };
}
