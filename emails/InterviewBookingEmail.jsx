import {
  Html,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Heading,
} from "@react-email/components";

export function InterviewBookingEmail({
  intervieweeName,
  interviewerName,
  startTime,
  endTime,
  credits,
  dashboardUrl,
  acceptUrl,
  rejectUrl,
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
            New Interview Request
          </Heading>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 24px" }}>
            Hi {interviewerName},
          </Text>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 12px" }}>
            <strong>{intervieweeName}</strong> has requested to book an interview with you.
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
            <strong>Date & Time:</strong> {startTime} - {endTime}
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 24px" }}>
            <strong>Earnings:</strong> {credits} credits
          </Text>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 32px" }}>
            Please acknowledge and accept this request.
          </Text>

          <div style={{ display: "flex", gap: "12px" }}>
            <Button
              href={acceptUrl}
              style={{
                backgroundColor: "#f59e0b",
                color: "#ffffff",
                fontSize: "14px",
                fontWeight: "600",
                padding: "10px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Accept Request
            </Button>

            <Button
              href={rejectUrl}
              style={{
                backgroundColor: "#ffffff",
                color: "#ef4444",
                fontSize: "14px",
                fontWeight: "600",
                padding: "10px 24px",
                borderRadius: "8px",
                textDecoration: "none",
                display: "inline-block",
                border: "1px solid #fee2e2",
              }}
            >
              Reject
            </Button>
          </div>

          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "24px 0 0" }}>
            You can also manage this from your{" "}
            <a href={dashboardUrl} style={{ color: "#f59e0b" }}>
              dashboard
            </a>
            .
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "32px 0" }} />

          <Text style={{ fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
            © {new Date().getFullYear()} Prept. All rights reserved.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
