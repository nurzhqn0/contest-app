import {
  GlobeHemisphereWest,
  TelegramLogo,
  Chats,
  TrendUp,
  FileXls,
  ShieldCheck,
  Question,
  UserGear,
  Sparkle,
} from "@phosphor-icons/react";
import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Card,
  Container,
  Flex,
  Grid,
  Heading,
  Text,
  TextField,
  Badge,
} from "@radix-ui/themes";

export function PublicHomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!roomCode.trim()) {
      setError("Please enter a room code");
      return;
    }
    setError("");
    navigate(`/room/${roomCode.trim().toUpperCase()}`);
  }

  return (
    <Box className="relative min-h-screen overflow-hidden bg-canvas py-8 md:py-16">
      {/* Decorative Floating Glowing Blobs */}
      <Box className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px] floating-blob pointer-events-none" />
      <Box className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/5 blur-[120px] floating-blob-delayed pointer-events-none" />
      <Box className="absolute top-[30%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-yellowSoft/15 blur-[100px] floating-blob pointer-events-none" />

      <Container size="4" className="relative z-10 px-4">
        {/* Top Header / Branding */}
        <Flex
          justify="between"
          align="center"
          className="mb-12 md:mb-20 pb-4 border-b border-line/40"
        >
          <Flex align="center" gap="3">
            <Box className="flex h-10 w-10 items-center justify-center rounded-none bg-accent text-white shadow-md">
              <Sparkle size={20} weight="fill" />
            </Box>
            <Box>
              <Heading
                size="4"
                weight="bold"
                className="tracking-tight text-ink"
              >
                Oina.io
              </Heading>
              <Text
                size="1"
                className="text-muted font-mono tracking-widest uppercase"
              >
                Challenge Hub
              </Text>
            </Box>
          </Flex>

          <Link to="/login" className="no-underline">
            <Button
              size="2"
              color="teal"
              variant="ghost"
              radius="none"
              className="cursor-pointer font-medium flex items-center gap-2"
            >
              <UserGear size={16} />
              Organizer sign-in
            </Button>
          </Link>
        </Flex>

        {/* Hero Grid Section */}
        <Grid
          columns={{ initial: "1", lg: "1.15fr 0.85fr" }}
          gap="8"
          align="center"
          className="mb-20"
        >
          {/* Left Column: Core Value Proposition */}
          <Flex direction="column" gap="5" align="start" justify="center" className="h-full">
            <Badge
              size="2"
              color="teal"
              variant="soft"
              radius="none"
              className="px-3 py-1 font-medium"
            >
              ✦ Built for Daily Consistency
            </Badge>

            <Heading
              size="8"
              weight="bold"
              className="tracking-tight font-display text-gradient-primary"
              style={{ lineHeight: 1.15, fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)" }}
            >
              Build consistency. <br />Climb the leaderboard.
            </Heading>

            <Text size="3" className="text-muted leading-relaxed max-w-[46ch]">
              Track your habits, log daily targets, and stay accountable with your group.
              Connect through our Telegram bot, complete check-ins, and spectate live ranks on the web.
            </Text>
          </Flex>

          {/* Right Column: Entry Form Card */}
          <Flex justify="center" align="center">
            {/* Access Form Card */}
            <Card
              size="3"
              className="w-full max-w-[400px] p-6 bg-white border border-line shadow-sm rounded-none"
            >
              <Flex direction="column" gap="4">
                <Box className="space-y-1">
                  <Badge
                    color="teal"
                    size="1"
                    variant="outline"
                    radius="none"
                    className="font-semibold uppercase tracking-wider"
                  >
                    Spectator Mode
                  </Badge>
                  <Heading size="4" weight="bold" className="text-ink tracking-tight">
                    Access Room Leaderboard
                  </Heading>
                  <Text size="2" className="text-muted">
                    Enter the code from your challenge host to view active live rankings.
                  </Text>
                </Box>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Flex direction="column" gap="2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted">
                      Room Code
                    </label>
                    <TextField.Root
                      size="3"
                      maxLength={12}
                      placeholder="ENTER ROOM CODE"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(event.target.value.toUpperCase());
                        if (error) setError("");
                      }}
                      radius="none"
                      className="w-full font-mono text-center tracking-[0.25em] uppercase [&>input]:text-center [&>input]:text-xl [&>input]:font-bold [&>input]:h-12 border-line focus:border-accent"
                    >
                    </TextField.Root>
                    {error && (
                      <Text size="1" color="red" weight="medium">
                        {error}
                      </Text>
                    )}
                  </Flex>

                  <Button
                    size="3"
                    color="teal"
                    variant="solid"
                    type="submit"
                    radius="none"
                    className="w-full cursor-pointer h-11 flex items-center justify-center gap-2 font-medium bg-accent hover:bg-accent/90"
                  >
                    Open Leaderboard →
                  </Button>
                </form>
              </Flex>
            </Card>
          </Flex>
        </Grid>

        {/* Feature Sections / Flow Steps */}
        <Box className="mb-20">
          <Flex
            direction="column"
            align="center"
            gap="2"
            className="mb-12 text-center"
          >
            <Badge
              size="1"
              color="teal"
              variant="soft"
              radius="none"
              className="uppercase font-semibold tracking-wider"
            >
              Workflows
            </Badge>
            <Heading
              size="7"
              weight="bold"
              className="tracking-tight text-ink font-display"
            >
              How the challenge works
            </Heading>
            <Text size="3" className="text-muted max-w-[60ch]">
              A simple, habit-building ecosystem that keeps you engaged and
              accountable every day.
            </Text>
          </Flex>

          <Grid columns={{ initial: "1", md: "3" }} gap="6">
            {/* Step 1: Telegram Submissions */}
            <Card
              className="hover-premium bg-surface border border-line p-5 flex flex-col justify-between"
              size="2"
            >
              <Flex
                direction="column"
                gap="4"
                className="h-full justify-between"
              >
                <Box className="flex h-10 w-10 items-center justify-center rounded-none bg-blueSoft text-blue-600">
                  <TelegramLogo size={28} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="4" weight="bold" className="mb-2 text-ink">
                    1. Join the Telegram Bot
                  </Heading>
                  <Text size="2" className="text-muted leading-relaxed">
                    Start{" "}
                    <a
                      href="https://t.me/oina_buddybot"
                      target="_blank"
                      rel="noreferrer"
                      className="text-accent underline font-medium"
                    >
                      @oina_buddybot
                    </a>
                    , enter your room code, and set up your participant profile
                    in seconds.
                  </Text>
                </Box>
              </Flex>
            </Card>

            {/* Step 2: Live Leaderboard Web Page */}
            <Card
              className="hover-premium bg-surface border border-line p-5 flex flex-col justify-between"
              size="2"
            >
              <Flex
                direction="column"
                gap="4"
                className="h-full justify-between"
              >
                <Box className="flex h-10 w-10 items-center justify-center rounded-none bg-yellowSoft text-amber-600">
                  <GlobeHemisphereWest size={28} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="4" weight="bold" className="mb-2 text-ink">
                    2. Track Your Progress
                  </Heading>
                  <Text size="2" className="text-muted leading-relaxed">
                    Log your daily task progress inside Telegram before the
                    cutoff time to earn points and maintain your streak.
                  </Text>
                </Box>
              </Flex>
            </Card>

            {/* Step 3: Watch the Standings */}
            <Card
              className="hover-premium bg-surface border border-line p-5 flex flex-col justify-between"
              size="2"
            >
              <Flex
                direction="column"
                gap="4"
                className="h-full justify-between"
              >
                <Box className="flex h-10 w-10 items-center justify-center rounded-none bg-accentSoft text-accent">
                  <TrendUp size={28} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="4" weight="bold" className="mb-2 text-ink">
                    3. Watch the Standings
                  </Heading>
                  <Text size="2" className="text-muted leading-relaxed">
                    Open the real-time leaderboard page to check your score,
                    inspect active challenge guidelines, and track your daily
                    rank.
                  </Text>
                </Box>
              </Flex>
            </Card>
          </Grid>
        </Box>

        {/* Feature Grid Block */}
        <Box className="mb-20 py-12 px-6 bg-accentSoft/30 border border-accentSoft">
          <Grid
            columns={{ initial: "1", lg: "0.8fr 1.2fr" }}
            gap="6"
            align="center"
          >
            <Box className="space-y-3">
              <Badge
                size="1"
                color="teal"
                variant="solid"
                radius="none"
                className="uppercase font-semibold"
              >
                Core Features
              </Badge>
              <Heading
                size="7"
                weight="bold"
                className="tracking-tight text-ink font-display"
              >
                Designed for daily consistency
              </Heading>
              <Text size="2" className="text-muted leading-relaxed">
                Everything you need to build consistency, challenge yourself,
                and follow your peers in real-time.
              </Text>
            </Box>

            <Grid columns={{ initial: "1", sm: "2" }} gap="4">
              <Flex gap="3" align="start">
                <Box className="p-2 rounded-none bg-white border border-line text-accent flex-shrink-0">
                  <Chats size={20} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="3" weight="bold" className="text-ink mb-1">
                    Instant Logging
                  </Heading>
                  <Text size="2" className="text-muted">
                    Submit your task answers directly through Telegram in just a
                    few taps.
                  </Text>
                </Box>
              </Flex>

              <Flex gap="3" align="start">
                <Box className="p-2 rounded-none bg-white border border-line text-accent flex-shrink-0">
                  <TrendUp size={20} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="3" weight="bold" className="text-ink mb-1">
                    Live Leaderboard
                  </Heading>
                  <Text size="2" className="text-muted">
                    See your rank and points update on the web scoreboard the
                    moment you submit.
                  </Text>
                </Box>
              </Flex>

              <Flex gap="3" align="start">
                <Box className="p-2 rounded-none bg-white border border-line text-accent flex-shrink-0">
                  <Chats size={20} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="3" weight="bold" className="text-ink mb-1">
                    Streak Protection
                  </Heading>
                  <Text size="2" className="text-muted">
                    Get automated reminders on Telegram before the daily cutoff
                    so you never miss a check-in.
                  </Text>
                </Box>
              </Flex>

              <Flex gap="3" align="start">
                <Box className="p-2 rounded-none bg-white border border-line text-accent flex-shrink-0">
                  <Sparkle size={20} weight="duotone" />
                </Box>
                <Box>
                  <Heading size="3" weight="bold" className="text-ink mb-1">
                    Bonus Milestones
                  </Heading>
                  <Text size="2" className="text-muted">
                    Complete all required daily tasks to unlock special
                    room-level bonus points.
                  </Text>
                </Box>
              </Flex>
            </Grid>
          </Grid>
        </Box>

        {/* FAQs Accordion */}
        <Box className="mb-20 max-w-3xl mx-auto">
          <Flex
            direction="column"
            align="center"
            gap="2"
            className="mb-10 text-center"
          >
            <Badge
              size="1"
              color="teal"
              variant="soft"
              radius="none"
              className="uppercase font-semibold"
            >
              Support
            </Badge>
            <Heading
              size="6"
              weight="bold"
              className="tracking-tight text-ink font-display"
            >
              Frequently Asked Questions
            </Heading>
          </Flex>

          <Flex direction="column" gap="4">
            <Card size="2" className="bg-surface border border-line">
              <Heading
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question size={18} className="text-accent" />
                How do I participate?
              </Heading>
              <Text size="2" className="text-muted">
                You must open Telegram, start{" "}
                <a
                  href="https://t.me/oina_buddybot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent underline font-medium"
                >
                  @oina_buddybot
                </a>
                , and input your room code. The bot will guide you through
                registration, record your daily targets, and notify you of new
                tasks.
              </Text>
            </Card>

            <Card size="2" className="bg-surface border border-line">
              <Heading
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question size={18} className="text-accent" />
                Where do I get a Room Code?
              </Heading>
              <Text size="2" className="text-muted">
                Room codes are generated by the contest organizer. Reach out to
                your challenge host, coach, or supervisor to receive the
                official room code.
              </Text>
            </Card>

            <Card size="2" className="bg-surface border border-line">
              <Heading
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question size={18} className="text-accent" />
                Are leaderboards open to the public?
              </Heading>
              <Text size="2" className="text-muted">
                Yes, as long as the organizer enables "Public room page" in the
                settings. Observers and guests can open this page, insert the
                code, and view live progress.
              </Text>
            </Card>
          </Flex>
        </Box>

        {/* Premium Footer */}
        <Flex
          direction={{ initial: "column", sm: "row" }}
          justify="between"
          align="center"
          gap="4"
          className="pt-8 border-t border-line/60 text-xs text-muted"
        >
          <Text>© 2026 Oina.io. Built for modern student challenges.</Text>
          <Flex gap="4">
            <Link
              to="/privacy"
              className="no-underline text-muted hover:text-ink"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="no-underline text-muted hover:text-ink"
            >
              Terms of Service
            </Link>
          </Flex>
        </Flex>
      </Container>
    </Box>
  );
}
