import {
  Html,
  Body,
  Container,
  Text,
  Button,
  Hr,
  Heading,
} from "@react-email/components";

export function InterviewAcceptedEmail({
  intervieweeName,
  interviewerName,
  startTime,
  endTime,
  joinUrl,
  dashboardUrl,
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
            🎉 Interview Accepted!
          </Heading>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 24px" }}>
            Hi {intervieweeName},
          </Text>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "0 0 12px" }}>
            Great news! <strong>{interviewerName}</strong> has accepted your
            interview request.
          </Text>

          <Hr style={{ borderColor: "#e5e7eb", margin: "24px 0" }} />

          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
            <strong>Date &amp; Time:</strong> {startTime} - {endTime}
          </Text>
          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "0 0 8px" }}>
            <strong>Interviewer:</strong> {interviewerName}
          </Text>

          <Text style={{ fontSize: "16px", color: "#374151", margin: "24px 0 32px" }}>
            You can join the call at the scheduled time using the button below:
          </Text>

          <Button
            href={joinUrl}
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
            Join Interview Call
          </Button>

          <Text style={{ fontSize: "14px", color: "#6b7280", margin: "24px 0 0" }}>
            You can also view your appointments from your{" "}
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
