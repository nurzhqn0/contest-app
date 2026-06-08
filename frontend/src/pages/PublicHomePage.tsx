import {
  GlobeHemisphereWest,
  TelegramLogo,
  Chats,
  TrendUp,
  Question,
  UserGear,
  Sparkle,
} from "@phosphor-icons/react";
import { FormEvent, useState, useEffect } from "react";
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

// IndexedDB video caching helpers
const DB_NAME = "OinaVideoCache";
const STORE_NAME = "videos";
const DB_VERSION = 1;

function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCachedVideo(key: string): Promise<Blob | null> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB read error:", e);
    return null;
  }
}

async function cacheVideo(key: string, blob: Blob): Promise<void> {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(blob, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB write error:", e);
  }
}

export function PublicHomePage() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState("");
  const [videoSrc, setVideoSrc] = useState("/onboarding-demo.mp4");

  useEffect(() => {
    let objectUrl: string | null = null;
    const videoKey = "onboarding-demo";

    async function loadVideo() {
      try {
        const cachedBlob = await getCachedVideo(videoKey);
        if (cachedBlob) {
          objectUrl = URL.createObjectURL(cachedBlob);
          setVideoSrc(objectUrl);
        } else {
          // Fetch from network and cache
          const response = await fetch("/onboarding-demo.mp4");
          if (response.ok) {
            const blob = await response.blob();
            await cacheVideo(videoKey, blob);
            objectUrl = URL.createObjectURL(blob);
            setVideoSrc(objectUrl);
          }
        }
      } catch (error) {
        console.error("Failed to load or cache video:", error);
      }
    }

    loadVideo();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, []);

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
    <main className="relative min-h-screen overflow-hidden bg-canvas py-8 md:py-16">
      {/* Decorative Floating Glowing Blobs */}
      <Box
        aria-hidden="true"
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-accent/5 blur-[120px] floating-blob pointer-events-none"
      />
      <Box
        aria-hidden="true"
        className="absolute bottom-[-10%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-teal-500/5 blur-[120px] floating-blob-delayed pointer-events-none"
      />
      <Box
        aria-hidden="true"
        className="absolute top-[30%] right-[15%] w-[30vw] h-[30vw] rounded-full bg-yellowSoft/15 blur-[100px] floating-blob pointer-events-none"
      />

      <Container size="4" className="relative z-10 px-4">
        {/* Top Header / Branding */}
        <header className="flex justify-between items-center mb-6 pb-4 border-b border-line/40">
          <Flex align="center" gap="3">
            <Box className="flex h-10 w-10 items-center justify-center rounded-none bg-accent text-white shadow-md">
              <Sparkle size={20} weight="fill" aria-hidden="true" />
            </Box>
            <Box>
              <Text
                size="4"
                weight="bold"
                className="tracking-tight text-ink font-bold block faculty-glyphic-regular"
              >
                oina.io
              </Text>
              <Text
                size="1"
                className="text-muted font-mono tracking-widest uppercase block"
              >
                Challenge Hub
              </Text>
            </Box>
          </Flex>

          <Button
            size="2"
            color="teal"
            variant="ghost"
            radius="none"
            className="cursor-pointer font-medium flex items-center gap-2"
            asChild
          >
            <Link to="/login">
              <UserGear size={16} aria-hidden="true" />
              <span className="hidden xs:inline">Organizer sign-in</span>
              <span className="inline xs:hidden">Sign-in</span>
            </Link>
          </Button>
        </header>

        {/* Hero Grid Section */}
        <Grid
          columns={{ initial: "1", md: "1.15fr 0.85fr" }}
          gap="8"
          align="center"
          className="mb-20"
        >
          {/* Left Column: Core Value Proposition & Access Card */}
          <Flex
            direction="column"
            gap="6"
            align={{ initial: "center", md: "start" }}
            justify="center"
            className="h-full w-full"
          >
            <Flex
              direction="column"
              gap="4"
              align={{ initial: "center", md: "start" }}
              className="w-full"
            >
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
                as="h1"
                size="8"
                weight="bold"
                className="tracking-tight font-display text-ink text-center md:text-left"
                style={{
                  lineHeight: 1.15,
                  fontSize: "clamp(2.2rem, 4.5vw, 3.2rem)",
                }}
              >
                Build consistency. <br /> Climb the leaderboard.
              </Heading>

              <Text
                size="3"
                className="text-muted leading-relaxed max-w-[46ch] text-center md:text-left"
              >
                Track your habits, log daily targets, and stay accountable with
                your group. Connect through our Telegram bot, complete
                check-ins, and spectate live ranks on the web.
              </Text>
            </Flex>

            {/* Access Form Card */}
            <Card
              size="3"
              className="w-full md:w-3/4 p-6 bg-white border border-line shadow-sm rounded-none mt-2"
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
                  <Heading
                    as="h2"
                    size="4"
                    weight="bold"
                    className="text-ink tracking-tight"
                  >
                    Access Room Leaderboard
                  </Heading>
                  <Text size="2" className="text-muted">
                    Enter the code from your challenge host to view active live
                    rankings.
                  </Text>
                </Box>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Flex direction="column" gap="2">
                    <label
                      htmlFor="room-code-input"
                      className="text-[10px] font-bold uppercase tracking-wider text-muted cursor-pointer"
                    >
                      Room Code
                    </label>
                    <TextField.Root
                      id="room-code-input"
                      name="roomCode"
                      autoComplete="off"
                      spellCheck={false}
                      size="3"
                      maxLength={12}
                      placeholder="ENTER ROOM CODE"
                      value={roomCode}
                      onChange={(event) => {
                        setRoomCode(event.target.value.toUpperCase());
                        if (error) setError("");
                      }}
                      radius="none"
                      className="w-full h-full font-mono text-center tracking-[0.25em] uppercase [&>input]:text-center [&>input]:text-xl [&>input]:font-bold [&>input]:h-12 border-line focus-within:border-accent"
                    />
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

          {/* Right Column: iPhone Video Container */}
          <Flex
            align="center"
            justify="center"
            direction="column"
            className="w-full"
          >
            {/* iPhone 13 Frame */}
            <Box
              className="relative w-full max-w-[300px] aspect-[9/18.5] bg-black p-[9px] border-[4px] border-[#3a3a3c] shadow-2xl mx-auto"
              style={{ borderRadius: "48px" }}
            >
              {/* Side button protrusions */}
              <Box className="absolute -left-[4px] top-[75px] w-[3px] h-[15px] bg-[#3a3a3c] rounded-l-sm" />
              <Box className="absolute -left-[4px] top-[105px] w-[3px] h-[30px] bg-[#3a3a3c] rounded-l-sm" />
              <Box className="absolute -left-[4px] top-[145px] w-[3px] h-[30px] bg-[#3a3a3c] rounded-l-sm" />
              <Box className="absolute -right-[4px] top-[120px] w-[3px] h-[45px] bg-[#3a3a3c] rounded-r-sm" />

              {/* Screen Area */}
              <Box
                className="relative w-full h-full bg-[#09090b] overflow-hidden flex flex-col border-black"
                style={{ borderRadius: "37px" }}
              >
                {/* iPhone 13 Notch (inside the screen) */}
                <Box
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[76px] h-[18px] bg-black z-50 flex items-center justify-between px-[6px]"
                  style={{
                    borderBottomLeftRadius: "11px",
                    borderBottomRightRadius: "11px",
                  }}
                >
                  {/* Sensors & Camera Lens */}
                  <Box className="w-[5px] h-[5px] bg-[#080b12] rounded-full opacity-60" />
                  <Box className="w-[6px] h-[6px] bg-[#0c1033] rounded-full border border-white/5 relative flex items-center justify-center">
                    <Box className="w-[2px] h-[2px] bg-[#1a3a60] rounded-full" />
                  </Box>
                </Box>

                {/* Subtle glass reflection overlay */}
                <Box className="absolute inset-0 pointer-events-none bg-gradient-to-tr from-transparent via-white/5 to-transparent z-40" />

                {/* Video Player */}
                <Box className="flex-1 w-full h-full bg-[#000] relative overflow-hidden flex items-center justify-center">
                  <video
                    src={videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </Box>

                {/* Home Indicator Overlay */}
                <Flex
                  align="center"
                  justify="center"
                  className="absolute bottom-0 left-0 right-0 h-[15px] bg-gradient-to-t from-black/30 to-transparent z-40 pointer-events-none"
                >
                  <Box className="w-[90px] h-[4px] bg-white/85 rounded-full" />
                </Flex>
              </Box>
            </Box>

            {/* Video Caption */}
            <Box className="mt-4 text-center max-w-[250px]">
              <Text
                size="1"
                weight="bold"
                color="teal"
                className="uppercase tracking-wider block mb-1"
              >
                Onboarding Demo
              </Text>
              <Text size="1" className="text-muted leading-relaxed">
                Watch the Telegram check-in walk-through video.
              </Text>
            </Box>
          </Flex>
        </Grid>

        {/* Feature Sections / Flow Steps */}
        <Box className="mb-20">
          <Flex
            direction="column"
            align="center"
            gap="2"
            className="text-center mb-12"
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
              as="h2"
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
                  <TelegramLogo size={28} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="4"
                    weight="bold"
                    className="mb-2 text-ink"
                  >
                    1. Join the Telegram Bot
                  </Heading>
                  <Text size="2" className="text-muted leading-relaxed">
                    Start{" "}
                    <a
                      href="https://t.me/oina_buddybot"
                      target="_blank"
                      rel="noopener noreferrer"
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
                  <GlobeHemisphereWest
                    size={28}
                    weight="duotone"
                    aria-hidden="true"
                  />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="4"
                    weight="bold"
                    className="mb-2 text-ink"
                  >
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
                  <TrendUp size={28} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="4"
                    weight="bold"
                    className="mb-2 text-ink"
                  >
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
            columns={{ initial: "1", md: "0.8fr 1.2fr" }}
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
                as="h2"
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
                  <Chats size={20} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="3"
                    weight="bold"
                    className="text-ink mb-1"
                  >
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
                  <TrendUp size={20} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="3"
                    weight="bold"
                    className="text-ink mb-1"
                  >
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
                  <Chats size={20} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="3"
                    weight="bold"
                    className="text-ink mb-1"
                  >
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
                  <Sparkle size={20} weight="duotone" aria-hidden="true" />
                </Box>
                <Box>
                  <Heading
                    as="h3"
                    size="3"
                    weight="bold"
                    className="text-ink mb-1"
                  >
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
              as="h2"
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
                as="h3"
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question
                  size={18}
                  className="text-accent"
                  aria-hidden="true"
                />
                How do I participate?
              </Heading>
              <Text size="2" className="text-muted">
                You must open Telegram, start{" "}
                <a
                  href="https://t.me/oina_buddybot"
                  target="_blank"
                  rel="noopener noreferrer"
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
                as="h3"
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question
                  size={18}
                  className="text-accent"
                  aria-hidden="true"
                />
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
                as="h3"
                size="3"
                weight="bold"
                className="mb-1 text-ink flex items-center gap-2"
              >
                <Question
                  size={18}
                  className="text-accent"
                  aria-hidden="true"
                />
                Are leaderboards open to the public?
              </Heading>
              <Text size="2" className="text-muted">
                Yes, as long as the organizer enables “Public room page” in the
                settings. Observers and guests can open this page, insert the
                code, and view live progress.
              </Text>
            </Card>
          </Flex>
        </Box>

        {/* Premium Footer */}
        <footer className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 border-t border-line/60 text-xs text-muted">
          <Text>
            © 2026 oina.io.{" "}
            <a
              className="underline"
              href="https://github.com/nurzhqn0"
              target="_blank"
            >
              nurzhqn0
            </a>
            .
          </Text>
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
        </footer>
      </Container>
    </main>
  );
}
