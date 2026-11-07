export const missions = [
  {
    id: "roadside-collision-001",
    code: "FIELD SCENARIO 001",
    title: "The Roadside Collision",
    category: "URBAN RESPONSE",
    level: 1,
    estimatedMinutes: 3,
    brief: "You and two volunteers arrive at a roadside collision. A motorbike is down. One person is sitting nearby, shaken but conscious. A damaged electrical pole is leaning toward the road, and a small crowd is gathering.",
    hazard: "POTENTIAL ELECTRICAL HAZARD",
    choices: [
      {
        id: "secure",
        title: "Pause, assess hazards and keep everyone clear",
        detail: "Create distance from the scene and alert the appropriate emergency services about the damaged pole."
      },
      {
        id: "rush",
        title: "Rush straight to the injured person",
        detail: "Try to help immediately before the situation gets worse."
      },
      {
        id: "crowd",
        title: "Ask bystanders to move the bike and pole debris",
        detail: "Clear the road quickly so traffic can move again."
      }
    ],
    evaluation: {
      secure: {
        correct: true,
        score: 100,
        title: "Good call.",
        explanation: "Good response starts with scene safety. A damaged electrical pole or downed line can create a serious hazard. Keep people away, do not touch the pole or wires, and contact the relevant emergency services and utility authority. Only approach when the scene is confirmed safe.",
        takeaway: "Scene safety comes before direct assistance. Never approach downed electrical equipment or wires."
      },
      rush: {
        correct: false,
        score: 0,
        title: "That decision adds risk.",
        explanation: "The damaged electrical pole may make the scene unsafe. Moving directly toward the injured person before hazards are assessed could put volunteers and bystanders at risk.",
        takeaway: "Pause and assess hazards before approaching. Keep clear of damaged electrical equipment and contact emergency services."
      },
      crowd: {
        correct: false,
        score: 0,
        title: "That decision adds risk.",
        explanation: "Bystanders should not be asked to move a damaged electrical pole, wires, or nearby debris. The scene must be kept clear until the hazard is assessed by the appropriate responders.",
        takeaway: "Do not touch or move damaged electrical equipment. Establish distance and alert the appropriate responders."
      }
    }
  }
];

export function findMission(missionId) {
  return missions.find((mission) => mission.id === missionId);
}

export function publicMission(mission) {
  if (!mission) return null;
  return {
    id: mission.id,
    code: mission.code,
    title: mission.title,
    category: mission.category,
    level: mission.level,
    estimatedMinutes: mission.estimatedMinutes,
    brief: mission.brief,
    hazard: mission.hazard,
    choices: mission.choices
  };
}

export function evaluateChoice(mission, choiceId) {
  if (!mission || !Object.hasOwn(mission.evaluation, choiceId)) return null;
  return mission.evaluation[choiceId];
}
