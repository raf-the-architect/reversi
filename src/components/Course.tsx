import { useState } from "react";

type Lesson = { title: string; body: string };
type Tab = {
  id: "opening" | "midgame" | "endgame";
  phase: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  dos: string[];
  donts: string[];
  tricks: Lesson[];
  checklist: string[];
};

const COURSE: Tab[] = [
  {
    id: "opening",
    phase: "PHASE 01",
    title: "THE OPENING",
    summary: "Roughly the first 10–15 moves, while more than ~40 squares are empty. The goal here is NOT discs — it is position, options and danger control.",
    lessons: [
      {
        title: "Discs are liabilities early",
        body: "Every disc you own is a potential anchor the rival can flip through. Flipping 5 discs on move 3 looks exciting and usually loses later. Aim for the smallest move that keeps you flexible — the strongest openings flip just one disc.",
      },
      {
        title: "Protect the corner neighborhood",
        body: "X-squares sit diagonally next to a corner (B2, G2, B7, G7). Playing one into an open corner hands the corner away almost every time. C-squares (the edge squares beside a corner) are the next most dangerous. Treat them as lava until that corner is owned.",
      },
      {
        title: "Mobility over material",
        body: "After every candidate move, count how many replies the rival gets. The best opening move is often the one that leaves them with the fewest legal squares. A player with no moves passes for free — every pass you force is a free tempo.",
      },
      {
        title: "Stay central and balanced",
        body: "Keep your early discs inside the central 4×4. When the position is symmetric, a quiet mirroring reply keeps the shape balanced and makes the rival solve the problems first.",
      },
      {
        title: "Edges wait",
        body: "Do not rush the edge in the opening — edge discs commit you and create levers for the rival. The edge becomes valuable only later, once corners are decided.",
      },
    ],
    dos: [
      "Prefer 1–2 flip 'quiet' moves",
      "Count the rival's replies before committing",
      "Keep discs clustered in the central 4×4",
      "Answer symmetry with symmetry when safe",
    ],
    donts: [
      "Never take an X-square beside an empty corner",
      "Avoid C-squares next to open corners",
      "Don't chase the biggest flip count",
      "Don't commit to an edge just because it is legal",
    ],
    tricks: [
      {
        title: "The choke move",
        body: "Look for a small move that flips discs TOWARD your interior wall: it can quietly erase three or four rival replies at once. Mobility you remove is worth more than a disc you gain.",
      },
      {
        title: "The diagonal start",
        body: "The four classic opening replies (D3, C4, F5, E6) all flip a single disc. Copy that mindset: when unsure, choose the quietest legal move.",
      },
      {
        title: "Save a spare move",
        body: "Always keep at least one safe, central reply in your pocket. Running out of moves first is how players get forced onto X-squares.",
      },
    ],
    checklist: ["Fewest safe flips", "Rival replies minimized", "No X / open-C squares", "Discs inside central 4×4"],
  },
  {
    id: "midgame",
    phase: "PHASE 02",
    title: "THE MIDGAME",
    summary: "The fight for edges and corners, roughly until 16–20 squares remain empty. This is where mobility, frontier discs and wedges decide the game.",
    lessons: [
      {
        title: "Win the mobility war",
        body: "Count legal moves for both sides each turn. Your real score is your move count, not your disc count. When the rival has one reply and you have six, you are winning even if the disc tally looks even.",
      },
      {
        title: "Hunt frontier discs",
        body: "A frontier disc touches an empty square; an interior disc does not. Frontier discs are exposed targets and give the rival anchors. Play moves that tuck your discs inward and push the rival's discs outward.",
      },
      {
        title: "Attack edges with wedges",
        body: "A wedge is a disc played BETWEEN two rival discs on the same line. Wedging into an edge breaks the rival's edge plan, and after the corner falls the wedge frequently becomes a stable disc. Attack edges the rival has started but cannot finish.",
      },
      {
        title: "Prepare corners instead of begging for them",
        body: "A corner is only legal when it flips something, so build a 'tunnel' of rival discs that ends at the corner. Once YOU own the corner, the nearby X and C squares instantly flip from worst squares to strong ones.",
      },
      {
        title: "Force the pass (zugzwang)",
        body: "When your move leaves the rival with zero legal moves, they pass and you move again for free — sometimes twice in a row. Two free tempos near a corner usually ends the game.",
      },
      {
        title: "Value stable discs",
        body: "A stable disc can never be flipped in any line — full edges connected to an owned corner are stable. A single stable edge is worth several flippable interior discs.",
      },
    ],
    dos: [
      "Compare move counts (mobility) every turn",
      "Reduce your own frontier discs",
      "Build tunnels that make corners legal for you",
      "Force passes whenever possible",
      "Wedge into the rival's unfinished edges",
    ],
    donts: [
      "Don't flip your way to the edge of the board",
      "Don't complete an edge for the rival",
      "Don't spend a corner setup move on raw flips",
      "Don't panic when down on discs this early",
    ],
    tricks: [
      {
        title: "The unfriendly edge",
        body: "An edge the rival has started but whose corner is still empty is a trap FOR them: wedge into it, and they often cannot defend both the edge and the corner.",
      },
      {
        title: "The edge sacrifice",
        body: "Deliberately letting the rival take a side edge while you secure the corner access is a classic swindle — their entire edge can flip in one sweep later.",
      },
      {
        title: "Two-minute habit",
        body: "Before each move, list the rival's replies to your top two candidates. If candidate A leaves them 1 reply and B leaves 7, play A regardless of flip count.",
      },
    ],
    checklist: ["You have more replies than rival", "Frontier is shrinking", "Corner tunnel forming", "A pass can be forced", "Wedges target broken edges"],
  },
  {
    id: "endgame",
    phase: "PHASE 03",
    title: "THE ENDGAME",
    summary: "The last ~16–20 empty squares. The rules invert: flips are now nearly permanent, and exact counting beats intuition.",
    lessons: [
      {
        title: "Switch from minimal to maximal",
        body: "With so few empties left, flipped discs rarely change hands again. This is when big flips finally pay — take the corner, sweep the edge, and convert everything you can.",
      },
      {
        title: "Calculate sequences exactly",
        body: "With about 12 empties left the game tree is small enough to count out: your move, their forced reply, your reply. Train this by following the engine's best move and reading its rating — depth solves this phase perfectly.",
      },
      {
        title: "Play the parity game",
        body: "Split the empty squares into regions. The side to move inside an ODD-sized region gets the last move there; even regions favor the second player. Arrange passes so YOU play the final move overall — the last move often flips several lines with no reply.",
      },
      {
        title: "Corners trigger sweeps",
        body: "After a corner falls, whole connected edges become legal and stable. Plan the order: corner first, then run along the adjacent edge, then the next corner (the 'double corner' sequence).",
      },
      {
        title: "Count guaranteed discs first",
        body: "Stable discs plus the discs your forced sequences win are your floor. Compare floors between candidate moves; the move with the higher guaranteed count wins.",
      },
      {
        title: "Match strategy to the scoreboard",
        body: "If you are ahead, keep lines closed and take guaranteed discs — no gifts. If you are behind, open the position, hunt desperation corners, and create one big swing move.",
      },
    ],
    dos: [
      "Take corners, then sweep adjacent edges",
      "Count out the final move sequences",
      "Track which side plays last in each region",
      "Convert stable discs the moment they are safe",
      "Simplify when ahead, complicate when behind",
    ],
    donts: [
      "Don't keep hoarding while lines flip permanently",
      "Don't let the rival play the last move in every region",
      "Don't trust your gut in the last 12 empties — count",
      "Don't open new lines while protecting a lead",
    ],
    tricks: [
      {
        title: "The parity pass",
        body: "Engineer a position where the rival has to move into the final odd region while you hold the last move elsewhere — the resulting pass plus last-move sweep routinely flips 8–12 discs.",
      },
      {
        title: "Double-corner ladder",
        body: "After taking one corner, the C-square beside it becomes safe and often unlocks the neighboring corner. Plan the ladder before taking the first corner.",
      },
      {
        title: "The +1 check",
        body: "When two moves look equal, count stable discs after each. A single stable disc edge is the tiebreaker that wins 33–31 games.",
      },
    ],
    checklist: ["Sequences counted out", "You play last in odd regions", "Corner → edge → corner order", "Guaranteed discs totaled", "Simplify if winning"],
  },
];

const X_SQUARES = [9, 14, 49, 54];
const C_SQUARES = [1, 6, 8, 15, 48, 55, 57, 62];
const CORNERS = [0, 7, 56, 63];
const CORE = [18, 19, 20, 21, 26, 27, 28, 29, 34, 35, 36, 37, 42, 43, 44, 45];

function SquareMap() {
  return (
    <div className="course-map">
      <div className="square-map" aria-label="Opening danger square map">
        {Array.from({ length: 64 }, (_, index) => {
          const row = (index / 8) | 0;
          const col = index % 8;
          let label = "";
          let tone = "";
          if (CORNERS.includes(index)) {
            label = "★";
            tone = "map-corner";
          } else if (X_SQUARES.includes(index)) {
            label = "X";
            tone = "map-x";
          } else if (C_SQUARES.includes(index)) {
            label = "C";
            tone = "map-c";
          } else if (CORE.includes(index)) {
            tone = "map-core";
          }
          void row;
          void col;
          return (
            <span key={index} className={`map-cell ${tone}`}>
              {label}
            </span>
          );
        })}
      </div>
      <ul className="map-legend">
        <li><span className="legend-dot legend-corner" /> ★ Corner — permanently safe once taken</li>
        <li><span className="legend-dot legend-x" /> X-square — avoid beside open corners</li>
        <li><span className="legend-dot legend-c" /> C-square — risky edge neighbor</li>
        <li><span className="legend-dot legend-core" /> Central 4×4 — your opening home</li>
      </ul>
    </div>
  );
}

export function CourseModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab["id"]>("opening");
  const active = COURSE.find((item) => item.id === tab)!;

  return (
    <div className="modal-layer course-layer" role="dialog" aria-modal="true" aria-labelledby="course-title" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div className="course-box">
        <header className="course-header">
          <div>
            <div className="modal-kicker"><span className="status-dot" /> REVERSI FIELD MANUAL</div>
            <h2 id="course-title">PLAY TO <em>WIN.</em></h2>
          </div>
          <button className="course-close" type="button" onClick={onClose} aria-label="Close course">✕ <kbd>ESC</kbd></button>
        </header>

        <nav className="course-tabs" aria-label="Course phases">
          {COURSE.map((item) => (
            <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)}>
              <span>{item.phase}</span>
              {item.title.replace("THE ", "")}
            </button>
          ))}
        </nav>

        <div className="course-body" key={tab}>
          <div className="course-intro">
            <span className="course-phase">{active.phase}</span>
            <h3>{active.title}</h3>
            <p>{active.summary}</p>
            {tab === "opening" && <SquareMap />}
          </div>

          <div className="course-section">
            <h4>CORE LESSONS</h4>
            <ol className="course-lessons">
              {active.lessons.map((lesson, index) => (
                <li key={lesson.title}>
                  <span className="lesson-num">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{lesson.title}</strong>
                    <p>{lesson.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="course-side">
            <div className="course-card course-do">
              <h4>DO</h4>
              <ul>{active.dos.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="course-card course-dont">
              <h4>DON&apos;T</h4>
              <ul>{active.donts.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
            <div className="course-card course-tricks">
              <h4>TRICKS TO WIN</h4>
              {active.tricks.map((trick) => (
                <div key={trick.title} className="trick">
                  <strong>{trick.title}</strong>
                  <p>{trick.body}</p>
                </div>
              ))}
            </div>
            <div className="course-card course-check">
              <h4>TURN CHECKLIST</h4>
              {active.checklist.map((item) => (
                <label key={item}><span className="check-box">✓</span> {item}</label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
