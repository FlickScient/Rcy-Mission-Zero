import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pg from "pg";
import { evaluateChoice, findMission, missions, publicMission } from "./missions.mjs";

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3001);
const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null;

if (process.env.TRUST_PROXY === "true") app.set("trust proxy", 1);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",").map((origin) => origin.trim()).filter(Boolean);

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json({ limit: "10kb", strict: true }));

const attemptLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait before trying again." }
});

app.get("/health", async (_req, res) => {
  if (!pool) return res.status(503).json({ status: "degraded", database: "not_configured" });
  try {
    await pool.query("SELECT 1");
    return res.json({ status: "ok", database: "connected" });
  } catch {
    return res.status(503).json({ status: "degraded", database: "unavailable" });
  }
});

app.get("/api/missions", (_req, res) => {
  res.json({ missions: missions.map(publicMission) });
});

app.get("/api/missions/:missionId", (req, res) => {
  const mission = findMission(req.params.missionId);
  if (!mission) return res.status(404).json({ error: "Mission not found." });
  return res.json({ mission: publicMission(mission) });
});

app.post("/api/missions/:missionId/attempts", attemptLimiter, async (req, res) => {
  if (!pool) return res.status(503).json({ error: "Attempt storage is not configured yet." });

  const { attemptId, choiceId } = req.body ?? {};
  if (typeof attemptId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(attemptId)) {
    return res.status(400).json({ error: "attemptId must be a valid UUID." });
  }
  if (typeof choiceId !== "string" || choiceId.length > 40) {
    return res.status(400).json({ error: "A valid choiceId is required." });
  }

  const mission = findMission(req.params.missionId);
  if (!mission) return res.status(404).json({ error: "Mission not found." });
  const result = evaluateChoice(mission, choiceId);
  if (!result) return res.status(400).json({ error: "That choice is not part of this mission." });

  try {
    await pool.query(
      `INSERT INTO mission_attempts (attempt_id, mission_id, choice_id, score, correct)
       VALUES ($1, $2, $3, $4, $5)`,
      [attemptId, mission.id, choiceId, result.score, result.correct]
    );
    return res.status(201).json({
      attemptId,
      missionId: mission.id,
      choiceId,
      score: result.score,
      correct: result.correct,
      title: result.title,
      explanation: result.explanation,
      takeaway: result.takeaway
    });
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "This attempt has already been submitted." });
    }
    console.error("Attempt persistence failed:", error?.message || "unknown error");
    return res.status(500).json({ error: "Could not save this attempt. Please try again." });
  }
});

app.use((error, _req, res, _next) => {
  if (error?.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
  if (error instanceof SyntaxError && "body" in error) return res.status(400).json({ error: "Invalid JSON body." });
  if (error?.message === "Origin not allowed by CORS") return res.status(403).json({ error: "Origin not allowed." });
  console.error("Unhandled API error:", error?.message || "unknown error");
  return res.status(500).json({ error: "Unexpected server error." });
});

const server = app.listen(port, () => {
  console.log(`Mission Zero API listening on port ${port}`);
});

async function shutdown() {
  server.close();
  if (pool) await pool.end();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
