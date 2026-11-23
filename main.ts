// Entry program for bring-the-humans-03 (Node 22, standard library only).
//
// The entry is the video, not this program: the ad was rendered in the build
// session, posted publicly on TikTok, and VIDEO.json at the repository root
// names it. All this program does is hand that address to the gate — it
// reads VIDEO.json out of the repository directory, checks it really names a
// TikTok video, and writes the same bytes into the grader's output
// directory. On success it prints nothing and exits 0.
//
// The ad itself: a 32-second vertical spot — a money hook, what make.fun is,
// a call to action, and the referral end card with the account's code —
// round 1 was built with ffmpeg from the press pack's badge, card and mascot
// art; round 2 rebuilds the same spine as a frame-driven Remotion animation
// (kinetic word pops, mask reveals, punch-in zooms, sliding prize chips,
// floating ghosts) and lays the referral end card over it with ffmpeg;
// round 3 rebuilds it again in a fast meme-ad style (giant condensed
// headlines, typewriter reveals, a chill-vs-speeding split screen, flying
// checklist cards, a speedometer, a scrolling leaderboard, white capsule
// pills narrating the story) with a real English voiceover (Meta Shortwave TTS,
// Helio, language en, speed 120), still frame-driven Remotion, end card laid over by ffmpeg.
//
// Local check (mirrors the grader, with /bot and /output replaced):
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Where the repository lives in the grader (/bot), and where the gate reads
// its output (/output). Both are overridable for a local run.
const REPO_ROOT = resolve(process.env.MAKEFUN_BOT_DIR ?? '/bot');
const OUT_DIR = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
const VIDEO_FILE = 'VIDEO.json';
const TIKTOK_PREFIX = 'https://www.tiktok.com/';

function fail(message: string): never {
  process.stderr.write(`main.ts: ${message}\n`);
  process.exit(1);
}

// Read the video address file, or stop with a plain error on stderr.
function readVideoFile(): Buffer {
  try {
    return readFileSync(resolve(REPO_ROOT, VIDEO_FILE));
  } catch (err) {
    return fail(
      `cannot read ${VIDEO_FILE} in ${REPO_ROOT}: ${(err as Error).message}`,
    );
  }
}

// The file must be JSON with a url string that points at a TikTok video.
// Anything else means the entry names no video, so refuse loudly instead
// of handing the gate a broken address. The checks are strict on purpose:
// the URL must parse, live on www.tiktok.com exactly (not a look-alike
// host or a short link), carry a non-empty video id after /video/, and be
// the canonical form the house reads: a handle of the shape @name, a
// numeric video id, and no query string or fragment (either would make the
// address a different resource than the video page itself).
function checkVideoAddress(raw: Buffer): void {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    fail(`${VIDEO_FILE} is not valid JSON`);
  }
  const url = (parsed as { url?: unknown }).url;
  if (typeof url !== 'string' || !url.startsWith(TIKTOK_PREFIX)) {
    fail(`${VIDEO_FILE} has no TikTok video url`);
  }
  if (/\s/.test(url)) {
    fail(`${VIDEO_FILE} url contains whitespace`);
  }
  let urlObj: URL;
  try {
    urlObj = new URL(url);
  } catch {
    fail(`${VIDEO_FILE} url is not a valid URL`);
  }
  if (urlObj.hostname !== 'www.tiktok.com') {
    fail(`${VIDEO_FILE} url is not on www.tiktok.com`);
  }
  if (urlObj.search !== '' || urlObj.hash !== '') {
    fail(`${VIDEO_FILE} url must not carry a query string or fragment`);
  }
  const parts = urlObj.pathname.split('/').filter(Boolean);
  const videoAt = parts.indexOf('video');
  if (videoAt < 0 || videoAt + 1 >= parts.length || parts[videoAt + 1].length === 0) {
    fail(`${VIDEO_FILE} url has no TikTok video id`);
  }
  if (videoAt !== 1 || !/^@[A-Za-z0-9._]+$/.test(parts[0])) {
    fail(`${VIDEO_FILE} url has no valid TikTok handle before /video/`);
  }
  if (!/^[0-9]+$/.test(parts[videoAt + 1])) {
    fail(`${VIDEO_FILE} url video id is not numeric`);
  }
}

function main(): void {
  const raw = readVideoFile();
  checkVideoAddress(raw);
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = resolve(OUT_DIR, VIDEO_FILE);
  writeFileSync(outPath, raw);
  // Read the copy back: the gate must see exactly the bytes this repo holds.
  if (!readFileSync(outPath).equals(raw)) {
    fail(`wrote ${VIDEO_FILE} but the copy differs`);
  }
}

main();
