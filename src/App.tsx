import { useState } from "react";
import { ArrowDownRight, ArrowLeft, ArrowRight, Award, Check, Crosshair, HeartPulse, Menu, Shield, ShieldAlert, Timer, Trophy, Users, X } from "lucide-react";

type Choice = { id: string; title: string; detail: string; safe: boolean };
type Mission = { id: string; code: string; title: string; location: string; brief: string; hazard: string; choices: Choice[]; explanation: string };

const missions: Mission[] = [{
  id: "roadside-collision-001",
  code: "FIELD SCENARIO 001",
  title: "The Roadside Collision",
  location: "URBAN RESPONSE · LEVEL 01",
  brief: "You and two volunteers arrive at a roadside collision. A motorbike is down. One person is sitting nearby, shaken but conscious. A damaged electrical pole is leaning toward the road, and a small crowd is gathering.",
  hazard: "POTENTIAL ELECTRICAL HAZARD",
  choices: [
    { id: "secure", title: "Pause, assess hazards and keep everyone clear", detail: "Create distance from the scene and alert the appropriate emergency services about the damaged pole.", safe: true },
    { id: "rush", title: "Rush straight to the injured person", detail: "Try to help immediately before the situation gets worse.", safe: false },
    { id: "crowd", title: "Ask bystanders to move the bike and pole debris", detail: "Clear the road quickly so traffic can move again.", safe: false }
  ],
  explanation: "Good response starts with scene safety. A damaged electrical pole or downed line can create a serious hazard. Keep people away, do not touch the pole or wires, and contact the relevant emergency services and utility authority. Only approach when the scene is confirmed safe."
}];

type AttemptResult = { correct: boolean; score: number; title: string; explanation: string; takeaway: string };

function App() {
  const [missionOpen, setMissionOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [serverResult, setServerResult] = useState<AttemptResult | null>(null);
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "");
  const mission = missions[0];
  const choice = mission.choices.find((item) => item.id === selected);

  const startMission = () => {
    setSelected(null);
    setFinished(false);
    setServerResult(null);
    setSubmitError(null);
    setMissionOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitDecision = async () => {
    if (!selected || submitting) return;
    setSubmitError(null);
    if (!apiBaseUrl) {
      setFinished(true);
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/missions/${mission.id}/attempts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId: crypto.randomUUID(), choiceId: selected })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit this decision.");
      setServerResult(data as AttemptResult);
      setFinished(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (missionOpen) return (
    <main className="mission-shell">
      <nav className="topbar mission-nav">
        <button className="brand" onClick={() => setMissionOpen(false)}><span className="brand-mark"><Shield size={19} /></span><span>RCY <b>MISSION ZERO</b></span></button>
        <span className="eyebrow">TRAINING SIMULATION <i /></span>
        <button className="icon-button" aria-label="Close mission" onClick={() => setMissionOpen(false)}><X size={19} /></button>
      </nav>
      <section className="mission-content">
        <button className="back-link" onClick={() => setMissionOpen(false)}><ArrowLeft size={15} /> BACK TO BRIEFING</button>
        <div className="mission-meta"><span>{mission.code}</span><span>01 / 05</span></div>
        <div className="progress-track"><span /></div>
        <div className="scenario-card">
          <div className="scenario-tag"><Crosshair size={14} /> {mission.location}</div>
          <h1>{mission.title}<span>.</span></h1>
          <p className="scenario-brief">{mission.brief}</p>
          <div className="hazard"><ShieldAlert size={17} /><span>{mission.hazard}</span></div>
        </div>
        {!finished ? <>
          <div className="decision-heading"><div><span className="section-kicker">YOUR DECISION</span><h2>What do you do first?</h2></div><span className="decision-count">SELECT ONE</span></div>
          <div className="choices">
            {mission.choices.map((item, index) => <button key={item.id} className={selected === item.id ? "choice selected" : "choice"} onClick={() => setSelected(item.id)}>
              <span className="choice-index">0{index + 1}</span><span className="choice-copy"><b>{item.title}</b><small>{item.detail}</small></span><span className="choice-radio">{selected === item.id && <Check size={14} />}</span>
            </button>)}
          </div>
          <button className="primary-button submit-button" disabled={!selected || submitting} onClick={submitDecision}>{submitting ? "SUBMITTING..." : "CONFIRM DECISION"} <ArrowRight size={17} /></button>
          {submitError && <p className="submit-error" role="alert">{submitError}</p>}
        </> : <div className="feedback-card">
          <div className={(serverResult?.correct ?? choice?.safe) ? "feedback-icon good" : "feedback-icon"}>{(serverResult?.correct ?? choice?.safe) ? <Check size={24} /> : <ShieldAlert size={24} />}</div>
          <span className="section-kicker">SCENARIO DEBRIEF</span>
          <h2>{serverResult?.title ?? (choice?.safe ? "Good call." : "That decision adds risk.")}</h2>
          {serverResult && <span className="section-kicker">SERVER-VERIFIED DEMO SCORE: {serverResult.score} / 100</span>}
          <p>{serverResult?.explanation ?? mission.explanation}</p>
          <div className="learning-note"><b>KEY TAKEAWAY</b><span>{serverResult?.takeaway ?? "Scene safety comes before direct assistance. Never approach downed electrical equipment or wires."}</span></div>
          <button className="primary-button" onClick={startMission}>REPLAY SCENARIO <ArrowRight size={17} /></button>
        </div>}
        <p className="simulation-note">DEMO SCENARIO · NOT A CERTIFIED FIRST-AID COURSE OR OFFICIAL RCY ASSESSMENT</p>
      </section>
    </main>
  );

  return (
    <main>
      <nav className="topbar">
        <a className="brand" href="#"><span className="brand-mark"><Shield size={19} /></span><span>RCY <b>MISSION ZERO</b></span></a>
        <div className={menuOpen ? "nav-links open" : "nav-links"}>
          <a href="#missions" onClick={() => setMenuOpen(false)}>Missions</a><a href="#modes" onClick={() => setMenuOpen(false)}>Game modes</a><a href="#rankings" onClick={() => setMenuOpen(false)}>Rankings</a>
        </div>
        <div className="nav-right"><span className="online"><i /> SYSTEM ONLINE</span><button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu"><Menu size={20} /></button><button className="nav-cta" onClick={startMission}>PLAY DEMO <ArrowRight size={15} /></button></div>
      </nav>

      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <div className="hero-label"><span className="pulse" /> RED CRESCENT YOUTH · CHATKHIL</div>
          <h1>WHEN EVERY<br />SECOND <em>COUNTS.</em></h1>
          <p className="hero-sub">Think fast. Act smart. Save lives.</p>
          <p className="hero-description">A challenge of judgment, teamwork and readiness. Step into realistic scenarios and make the calls that matter.</p>
          <div className="hero-actions"><button className="primary-button" onClick={startMission}>START A MISSION <ArrowRight size={17} /></button><a className="text-link" href="#modes">EXPLORE THE GAME <ArrowDownRight size={16} /></a></div>
          <div className="hero-footnote"><span>01</span> LEARN THROUGH DECISIONS <span className="foot-divider" /> BUILT FOR THE NEXT GENERATION OF RESPONDERS</div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" /><div className="orbit orbit-two" />
          <div className="visual-cross"><span /><i /></div>
          <div className="visual-label label-top"><span>RESPONSE PROTOCOL</span><b>01 — ASSESS</b></div>
          <div className="visual-label label-bottom"><span>MISSION STATUS</span><b><i /> READY FOR DEPLOYMENT</b></div>
          <div className="visual-coordinate">23°03' N<br />91°07' E</div>
        </div>
        <div className="hero-side-index">MZ / 001</div>
      </section>

      <section className="stats-strip">
        <div><span className="stat-icon"><Crosshair size={17} /></span><span><b>REAL-WORLD</b><small>DECISION SCENARIOS</small></span></div>
        <div><span className="stat-icon"><Users size={17} /></span><span><b>TEAM-FOCUSED</b><small>STRATEGIC THINKING</small></span></div>
        <div><span className="stat-icon"><Award size={17} /></span><span><b>SKILL-BUILDING</b><small>NOT JUST POINTS</small></span></div>
      </section>

      <section className="section missions-section" id="missions">
        <div className="section-heading"><div><span className="section-kicker">01 / STEP INTO THE FIELD</span><h2>Every mission<br />starts with a <em>choice.</em></h2></div><p>Not every situation has an obvious answer. Read the scene, identify the risks, and decide what matters first.</p></div>
        <div className="mission-feature">
          <div className="mission-art"><div className="art-grid" /><div className="art-cross"><HeartPulse size={72} strokeWidth={1} /></div><span className="art-code">FIELD NOTE / 001</span><span className="art-caption">ASSESS BEFORE YOU ACT.</span></div>
          <div className="mission-info"><div className="mission-info-top"><span className="tag">AVAILABLE DEMO</span><span className="duration"><Timer size={14} /> 3–5 MIN</span></div><span className="section-kicker">MISSION 001 · URBAN RESPONSE</span><h3>The Roadside<br />Collision</h3><p>A roadside incident. An injured person. A damaged electrical pole. You have limited resources and one priority: make the safest first move.</p><div className="mission-bottom"><span><b>01</b> DECISION POINT</span><button className="round-arrow" onClick={startMission} aria-label="Play Roadside Collision"><ArrowRight size={19} /></button></div></div>
        </div>
      </section>

      <section className="section modes-section" id="modes">
        <div className="section-heading"><div><span className="section-kicker">02 / CHOOSE YOUR APPROACH</span><h2>Two ways to<br /><em>make a difference.</em></h2></div><p>From split-second decisions to the bigger picture. Build the mindset of someone others can count on.</p></div>
        <div className="mode-grid">
          <article className="mode-card active-mode"><div className="mode-top"><span className="mode-number">01</span><span className="tag">PLAYABLE DEMO</span></div><div className="mode-icon"><Crosshair size={26} /></div><h3>Mission Mode</h3><p>Face realistic emergency scenarios. Evaluate risks, choose your response and learn from the outcome.</p><button className="mode-link" onClick={startMission}>ENTER MISSION <ArrowRight size={16} /></button></article>
          <article className="mode-card locked-mode"><div className="mode-top"><span className="mode-number">02</span><span className="tag muted-tag">IN DEVELOPMENT</span></div><div className="mode-icon"><Users size={26} /></div><h3>Command Mode</h3><p>Lead a response team, manage limited supplies and make strategic calls under pressure.</p><span className="mode-link disabled-link">COMING IN A FUTURE BUILD <ArrowRight size={16} /></span></article>
        </div>
      </section>

      <section className="ranking-section" id="rankings"><div className="ranking-inner"><div><span className="section-kicker">03 / THE COMPETITIVE EDGE</span><h2>Earn your place.<br /><em>Not your shortcuts.</em></h2><p>Daily challenges, verified achievements and seasonal recognition are planned for a future release. Scores will reward safe decisions and sound judgment — not reckless speed.</p></div><div className="ranking-panel"><div className="ranking-panel-head"><span><Trophy size={17} /> LEADERBOARD</span><span className="tag muted-tag">COMING SOON</span></div><div className="empty-rank"><div className="rank-emblem"><Trophy size={25} /></div><b>THE BOARD IS WAITING.</b><span>First, master the mission.</span></div><div className="rank-foot"><span>SEASON 01</span><span>0 VERIFIED PLAYERS</span></div></div></div></section>

      <section className="closing"><div className="closing-mark"><Shield size={28} /></div><span className="section-kicker">RED CRESCENT YOUTH · CHATKHIL</span><h2>Ready when<br /><em>it matters.</em></h2><button className="primary-button" onClick={startMission}>TAKE THE FIRST MISSION <ArrowRight size={17} /></button></section>
      <footer><a className="brand footer-brand" href="#"><span className="brand-mark"><Shield size={16} /></span><span>RCY <b>MISSION ZERO</b></span></a><span>AN INDEPENDENT LEARNING GAME CONCEPT</span><span>THINK FAST. ACT SMART. SAVE LIVES.</span></footer>
    </main>
  );
}

export default App;
