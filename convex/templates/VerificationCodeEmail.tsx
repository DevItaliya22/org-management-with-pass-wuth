import {
  Container,
  Head,
  Heading,
  Html,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

export function VerificationCodeEmail({
  code,
  expires,
}: {
  code: string;
  expires: Date;
}) {
  const getValidityText = () => {
    const now = Date.now();
    const expiresTime = +expires;
    const diffMs = expiresTime - now;

    // If already expired
    if (diffMs <= 0) {
      return "This code has expired";
    }

    const diffMinutes = Math.floor(diffMs / (60 * 1000));
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));

    // If less than 1 hour, show minutes
    if (diffHours < 1) {
      return `This code is valid for ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`;
    }

    // If 1 hour or more, show hours
    return `This code is valid for ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`;
  };

  return (
    <Html>
      <Tailwind>
        <Head />
        <Container className="container px-20 font-sans">
          <Heading className="text-xl font-bold mb-4">
            Sign in to My App
          </Heading>
          <Text className="text-sm">
            Please enter the following code on the sign in page.
          </Text>
          <Section className="text-center">
            <Text className="font-semibold">Verification code</Text>
            <Text className="font-bold text-4xl">{code}</Text>
            <Text>
              ({getValidityText()})
            </Text>
          </Section>
        </Container>
      </Tailwind>
    </Html>
  );
}
