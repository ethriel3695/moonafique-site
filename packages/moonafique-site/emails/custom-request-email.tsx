import { Body, Button, Container, Head, Heading, Html, Preview, Text } from "@react-email/components";
import { render } from "@react-email/render";
import * as React from "react";

export type RequestEmailData = {
  id: string; name: string; email: string | null; whatnotUsername: string | null;
  request: string; details: string; requestedDate: string | null; occasion: string;
};
export type RequestEmailKind = "staff" | "customer";
export const requestOrderPolicy = "We work through custom requests in the order they’re received.";
export const requestDatePolicy = "Any requested date is for our information only. It is not a promise or agreement to complete or deliver an order by that date, and it does not move your request ahead in the queue.";

const paragraph = { fontSize: 16, lineHeight: "25px", margin: "18px 0" };
export function CustomRequestEmail({ kind, data, siteUrl, test = false }: { kind: RequestEmailKind; data: RequestEmailData; siteUrl: string; test?: boolean }) {
  const staff = kind === "staff";
  return <Html lang="en"><Head /><Preview>{staff ? "A new idea is waiting in the custom request queue." : "Your request is in our queue. Here’s what happens next."}</Preview>
    <Body style={{ backgroundColor: "#f8f5fb", color: "#30263b", fontFamily: "Arial, sans-serif", margin: 0, padding: "32px 12px" }}>
      <Container style={{ backgroundColor: "white", border: "1px solid #e5ddeb", borderRadius: 20, maxWidth: 560, padding: "32px 28px" }}>
        {test && <Text style={{ backgroundColor: "#f1eaf7", padding: 12, fontSize: 13 }}>TEST EMAIL · A sample custom request. No customer order or delivery commitment was created.</Text>}
        <Text style={{ color: "#69428a", fontSize: 12, fontWeight: "bold", letterSpacing: 3 }}>MOONAFIQUE · CUSTOM CREATIONS</Text>
        <Heading style={{ fontFamily: "Georgia, serif", fontSize: 30, lineHeight: "38px" }}>{staff ? "A new custom request has arrived." : "We received your custom request."}</Heading>
        {staff ? <>
          <Text style={paragraph}><strong>Name:</strong> {data.name}<br /><strong>Email:</strong> {data.email ?? "Not provided"}<br /><strong>Whatnot:</strong> {data.whatnotUsername ? `@${data.whatnotUsername}` : "Not provided"}</Text>
          <Text style={{ ...paragraph, whiteSpace: "pre-wrap" }}><strong>Request</strong><br />{data.request}</Text>
          {data.details && <Text style={{ ...paragraph, whiteSpace: "pre-wrap" }}><strong>Additional details</strong><br />{data.details}</Text>}
          <Text style={paragraph}><strong>Requested date (information only):</strong> {data.requestedDate ?? "None"}</Text>
          {data.occasion && <Text style={{ ...paragraph, whiteSpace: "pre-wrap" }}><strong>Occasion:</strong> {data.occasion}</Text>}
        </> : <>
          <Text style={paragraph}>Thanks for sharing your idea with Moonafique! Your request has been saved in our queue.</Text>
          <Text style={paragraph}>We’ll use the contact details you provided to discuss what’s possible before agreeing on a project.</Text>
        </>}
        <Text style={{ ...paragraph, backgroundColor: "#f5f0f8", borderRadius: 12, padding: 16 }}>{requestOrderPolicy}<br /><br />{requestDatePolicy}</Text>
        <Text style={paragraph}>Submitting a request does not guarantee acceptance or completion. It is not a confirmed order, and no payment has been taken.</Text>
        <Text style={{ fontSize: 13, lineHeight: "21px", overflowWrap: "anywhere" }}>Request reference: {data.id}</Text>
        {staff && <Button href={`${siteUrl}/admin/customs`} style={{ backgroundColor: "#69428a", borderRadius: 24, color: "white", fontSize: 15, fontWeight: "bold", padding: "14px 24px", textDecoration: "none" }}>Open the custom request queue</Button>}
        <Text style={paragraph}>The Moonafique team</Text>
        {!staff && <Text style={{ fontSize: 13, lineHeight: "21px", color: "#6c6273" }}>Questions? Reply to this email and include your request reference. This is a confirmation of your request, not a newsletter signup. If you didn’t make this request, please let us know.</Text>}
      </Container>
    </Body>
  </Html>;
}

export async function customRequestMessage(kind: RequestEmailKind, data: RequestEmailData, siteUrl: string, test = false) {
  const email = <CustomRequestEmail kind={kind} data={data} siteUrl={siteUrl} test={test} />;
  return { subject: `${test ? "[TEST] " : ""}${kind === "staff" ? "New custom request for Moonafique" : "We received your custom request"}`, html: await render(email), text: await render(email, { plainText: true }) };
}
