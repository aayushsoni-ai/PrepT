import {
  Html,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Heading,
} from "@react-email/components";

export function InterviewRejectedEmail({
  intervieweeName,
  interviewerName,
  startTime,
  endTime,
  creditsRefunded,
  browsUrl,
}) {
  return (
    <Html>
      <Body
        style={{
          fontFamily: "sans-serif",
          padding: "32px 16px",
          backgroundColor: "#f9fafb",
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            padding: "40px",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          <Heading
            style={{
              fontSize: "24px",
              color: "#111827",
              margin: "0 0 16px",
              fontWeight: "700",
            }}
          >
            Interview Request Update
          </Heading>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 24px" }}>
            Hi {intervieweeName},
          </Text>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 12px" }}>
            Unfortunately, <strong>{interviewerName}</strong> was unable to
            accept your interview request.
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
            <strong>Requested Slot:</strong> {startTime} - {endTime}
          </Text>

          {creditsRefunded > 0 && (
            <Text
              style={{
                fontSize: "14px",
                color: "#059669",
                margin: "0 0 8px",
                fontWeight: "600",
              }}
            >
              ✅ {creditsRefunded} credits have been refunded to your account.
            </Text>
          )}

          <Text style={{ fontSize: "16px", color: "#374151", margin: "24px 0 32px" }}>
            Don&apos;t worry — there are many other skilled interviewers
            available. Browse and book a new session below:
          </Text>

          <Button
            href={browsUrl}
            style={{
              backgroundColor: "#f59e0b",
              color: "#ffffff",
              fontSize: "16px",
              fontWeight: "600",
              padding: "12px 32px",
              borderRadius: "8px",
              textDecoration: "none",
              display: "inline-block",
            }}
          >
            Browse Interviewers
          </Button>

          <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0" }} />

          <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
            © {new Date().getFullYear()} Prept. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
