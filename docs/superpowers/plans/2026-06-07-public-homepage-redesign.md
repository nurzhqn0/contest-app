# PublicHomePage iPhone Video Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the PublicHomePage landing layout to feature a clean, minimalist split-hero showing a room code input form on the left and an onboarding demo video nested inside a CSS-rendered iPhone Pro frame on the right.

**Architecture:** We will modify `PublicHomePage.tsx`'s main Hero Grid to split into left and right columns. The left column will house the branding, headlines, and Room Code access form, and the right column will build the iPhone CSS bezel, Dynamic Island, iOS status bar mock, and a standard HTML5 `<video>` player slot pointing to a demo asset path.

**Tech Stack:** React 18, Radix UI Themes, Tailwind CSS, HTML5 Video.

---

### Task 1: Redesign the Left Column (Branding, Copy & Access Form)

**Files:**
- Modify: `frontend/src/pages/PublicHomePage.tsx`

- [ ] **Step 1: Simplify left column text layout and make card corners sharp**
  Modify [PublicHomePage.tsx](file:///Users/myrzanizimbetov/Desktop/game-app/frontend/src/pages/PublicHomePage.tsx) lines 101–148 to center and simplify the layout.
  Verify that the layout code has the following structure:
  ```tsx
  {/* Left Column: Core Value Proposition */}
  <Flex direction="column" gap="5" align="start" justify="center" className="h-full">
    <Badge
      size="2"
      color="teal"
      variant="soft"
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
  ```

- [ ] **Step 2: Simplify Access Room Leaderboard card structure**
  Update the card container to place the Room Code entry form in a clean, minimalist, sharp-cornered container:
  ```tsx
  {/* Access Form */}
  <Card
    size="3"
    className="w-full max-w-[400px] p-6 bg-white border border-line shadow-sm"
  >
    <Flex direction="column" gap="4">
      <Box className="space-y-1">
        <Badge
          color="teal"
          size="1"
          variant="outline"
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
            className="w-full font-mono text-center tracking-[0.25em] uppercase [&>input]:text-center [&>input]:text-xl [&>input]:font-bold [&>input]:h-12 border-line focus:border-accent"
          >
            {/* Slot icon removed or centered dynamically */}
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
          className="w-full cursor-pointer h-11 flex items-center justify-center gap-2 font-medium bg-accent hover:bg-accent/90"
        >
          Open Leaderboard →
        </Button>
      </form>
    </Flex>
  </Card>
  ```

---

### Task 2: Build the iPhone Video Player Frame in the Right Column

**Files:**
- Modify: `frontend/src/pages/PublicHomePage.tsx`

- [ ] **Step 1: Implement the iPhone Pro CSS container**
  Update the right column in the Hero Grid to construct a CSS-rendered iPhone 15/16 Pro frame that nests an HTML5 video component:
  ```tsx
  {/* Right Column: iPhone Video Container */}
  <Flex align="center" justify="center" direction="column" className="w-full">
    {/* iPhone 15 Pro Frame */}
    <Box
      className="relative w-[260px] h-[520px] bg-[#1f1f1f] p-[10px] border-[3px] border-[#3d3d3d] shadow-2xl overflow-hidden"
      style={{ borderRadius: "40px" }}
    >
      {/* Dynamic Island */}
      <Box
        className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[80px] h-[22px] bg-black z-50"
        style={{ borderRadius: "11px" }}
      />

      {/* Screen Area */}
      <Box
        className="relative w-full h-full bg-[#111] overflow-hidden flex flex-col"
        style={{ borderRadius: "30px" }}
      >
        {/* iOS Status Bar Overlay */}
        <Flex
          justify="between"
          align="end"
          className="absolute top-0 left-0 right-0 h-[38px] px-5 pb-1 text-[10px] font-semibold text-white bg-gradient-to-b from-black/50 to-transparent z-40 pointer-events-none"
        >
          <Text>9:41</Text>
          <Flex gap="1" align="center">
            <span>📶</span>
            <span>🔋</span>
          </Flex>
        </Flex>

        {/* Video Player */}
        <Box className="flex-1 w-full h-full flex items-center justify-center bg-accent/95 relative">
          <video
            src="/assets/onboarding-demo.mp4"
            autoPlay
            loop
            muted
            playsInline
            controls
            className="w-full h-full object-cover"
          />
        </Box>

        {/* Home Indicator Overlay */}
        <Flex
          align="center"
          justify="center"
          className="absolute bottom-0 left-0 right-0 h-[15px] bg-gradient-to-t from-black/30 to-transparent z-40 pointer-events-none"
        >
          <Box className="w-[90px] h-[4px] bg-white/80 rounded-full" />
        </Flex>
      </Box>
    </Box>

    {/* Video Caption */}
    <Box className="mt-4 text-center max-w-[250px]">
      <Text size="1" weight="bold" color="teal" className="uppercase tracking-wider block mb-1">
        Onboarding Demo
      </Text>
      <Text size="1" className="text-muted leading-relaxed">
        Watch the Telegram check-in walk-through video.
      </Text>
    </Box>
  </Flex>
  ```

---

### Task 3: Build Verification

**Files:**
- Test: Build validation

- [ ] **Step 1: Run production compilation**
  Run: `npm run build` inside `frontend/`
  Expected output: Compilation passes with exit code 0 and packages successfully.
