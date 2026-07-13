import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { signOut } from "firebase/auth";
import { useAuth } from "./authContext";
import { auth } from "./firebase/firebase";
import Login from "./Login";
// import { useRef } from "react";



import {
  loadUserNodes,
  saveNodeNote,
  saveNodePosition,
} from "./saveNodes";

const defaultPeople = [
  { id: 1, name: "What is it?", x: 500, y: 40, priority: 0, editable: true, relations: [{ id: 2, relation: "" }] },
  {
    id: 2,
    name: "Is it actionable?",
    x: 500,
    y: 180,
    priority: 0,
    editable: false,
    relations: [
      { id: 3, relation: "No" },
      { id: 4, relation: "No" },
      { id: 5, relation: "No" },
      { id: 6, relation: "Yes" },
    ],
  },
  { id: 3, name: "Trash", x: 120, y: 360, priority: 0, editable: true, relations: [] },
  { id: 4, name: "Someday / Maybe", x: 360, y: 360, priority: 0, editable: true, relations: [] },
  { id: 5, name: "Reference", x: 640, y: 360, priority: 0, editable: true, relations: [] },
  {
    id: 6,
    name: "The next action?",
    x: 920,
    y: 360,
    editable:false,
    priority: 0,
    relations: [
      { id: 7, relation: "" },
      { id: 9, relation: "" },
    ],
  },
  { id: 7, name: "Project?", x: 645, y: 540, priority: 0, editable: false, relations: [{ id: 8, relation: "Yes" }] },
  { id: 8, name: "Project Plan", x: 645, y: 750, priority: 0,editable:true, relations: [{ id: 6, relation: "Next Action" }] },
  {
    id: 9,
    name: "Will it take less than 2 minutes?",
    x: 1080,
    y: 540,
    editable:false,
    priority: 0,
    relations: [
      { id: 10, relation: "Yes" },
      { id: 11, relation: "No" },
      { id: 12, relation: "No" },
    ],
  },
  { id: 10, name: "Do it now", x: 840, y: 760, priority: 0,editable:true, relations: [] },
  { id: 11, name: "Delegate it", x: 1080, y: 760, priority: 0, editable: false, relations: [{ id: 13, relation: "" }] },
  {
    id: 12,
    name: "Defer it",
    x: 1320,
    y: 760,
    editable:false,
    priority: 0,
    relations: [
      { id: 14, relation: "" },
      { id: 15, relation: "" },
    ],
  },
  { id: 13, name: "Waiting", x: 1080, y: 940, priority: 0, editable:true,relations: [] },
  { id: 14, name: "Calendar", x: 1240, y: 940, priority: 0, editable:true, relations: [] },
  { id: 15, name: "Next Action", x: 1440, y: 940, priority: 0, editable:true, relations: [] },
];

const canvasWidth = 1560;
const canvasHeight = 1040;
const flowchartFont = '"Arial Rounded MT Bold", "Trebuchet MS", Verdana, Arial, sans-serif';

const nodePalette = {
  start: {
    fill: "#fed7a0",
    stroke: "#f59e0b",
  },
  question: {
    fill: "#e9d5ff",
    stroke: "#7e57c2",
  },
  yes: {
    fill: "#bbf7d0",
    stroke: "#4caf50",
  },
  no: {
    fill: "#fff3a3",
    stroke: "#facc15",
  },
  action: {
    fill: "#bfdbfe",
    stroke: "#3b82f6",
  },
  defer: {
    fill: "#dbe4ff",
    stroke: "#5b6fc1",
  },
};

const noNodeIds = new Set(
  defaultPeople.flatMap((person) =>
    person.relations
      .filter((relation) => relation.relation.toLowerCase() === "no")
      .map((relation) => relation.id)
  )
);

const getNodeColors = (person) => {
  if (noNodeIds.has(person.id)) return nodePalette.no;
  if (person.id === 1) return nodePalette.start;
  if (person.name.includes("?")) return nodePalette.question;
  if ([10, 13, 14, 15].includes(person.id)) return nodePalette.action;
  if ([11, 12].includes(person.id)) return nodePalette.defer;
  return nodePalette.yes;
};

const wrapNodeLabel = (label, maxLength = 14) => {
  const lines = [];
  const words = label.split(" ");

  words.forEach((word) => {
    const currentLine = lines[lines.length - 1];
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (!currentLine) {
      lines.push(word);
    } else if (nextLine.length <= maxLength) {
      lines[lines.length - 1] = nextLine;
    } else {
      lines.push(word);
    }
  });

  return lines;
};

const buildDefaultPositions = () => {
  const positions = {};

  defaultPeople.forEach((person) => {
    positions[person.id] = {
      cx: person.x,
      cy: person.y,
    };
  });

  return positions;
};

const Relation = () => {
  const { user } = useAuth();
  const people = useMemo(() => defaultPeople, []);
  const [positions, setPositions] = useState(() => buildDefaultPositions());
  const [hoveredId, setHoveredId] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [notes, setNotes] = useState({});
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const svgRef = useRef(null);
  const positionsRef = useRef(positions);
  const draggingIdRef = useRef(null);
const saveTimeout = useRef(null);
  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => {
    let ignore = false;

    async function fetchUserNodes() {
      if (!user) {
        setNotes({});
        setPositions(buildDefaultPositions());
        setStatusMessage("");
        return;
      }

      setIsLoadingUserData(true);

      try {
        const saved = await loadUserNodes(user.uid);

        if (!ignore) {
          setNotes(saved.notes);
          setPositions({
            ...buildDefaultPositions(),
            ...saved.positions,
          });
          setStatusMessage("Saved layout loaded.");
        }
      } catch (error) {
        console.error("Failed to load saved nodes", error);
        setStatusMessage(`Could not load saved data: ${error.message}`);
      } finally {
        if (!ignore) {
          setIsLoadingUserData(false);
        }
      }
    }

    fetchUserNodes();

    return () => {
      ignore = true;
    };
  }, [user]);

  const handlePointerDown = (id) => (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingIdRef.current = id;
    setDraggingId(id);
  };

  const moveDraggedNode = useCallback((event) => {
    const currentDraggingId = draggingIdRef.current;

    if (currentDraggingId === null || !svgRef.current) return;

    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = canvasWidth / rect.width;
    const scaleY = canvasHeight / rect.height;
    const pointerX = (event.clientX - rect.left) * scaleX;
    const pointerY = (event.clientY - rect.top) * scaleY;

    setPositions((prev) => ({
      ...prev,
      [currentDraggingId]: {
        cx: Math.max(78, Math.min(canvasWidth - 78, pointerX)),
        cy: Math.max(78, Math.min(canvasHeight - 78, pointerY)),
      },
    }));
  }, []);

  const finishDrag = useCallback(async () => {
    const finishedDraggingId = draggingIdRef.current;

    draggingIdRef.current = null;
    setDraggingId(null);

    if (finishedDraggingId === null) return;

    if (!user) {
      setStatusMessage("Sign in with Google before saving positions.");
      return;
    }

    const currentPosition = positionsRef.current[finishedDraggingId];

    if (!currentPosition) {
      setStatusMessage("Could not save position because this node was not found.");
      return;
    }

    try {
      await saveNodePosition(user.uid, {
        id: finishedDraggingId,
        x: currentPosition.cx,
        y: currentPosition.cy,
      });

      setStatusMessage("Position saved.");
    } catch (error) {
      console.error("Failed to save position", error);
      setStatusMessage(`Could not save position: ${error.message}`);
    }
  }, [user]);

  useEffect(() => {
    if (draggingId === null) return undefined;

    window.addEventListener("pointermove", moveDraggedNode);
    window.addEventListener("pointerup", finishDrag);
    window.addEventListener("pointercancel", finishDrag);
    window.addEventListener("blur", finishDrag);

    return () => {
      window.removeEventListener("pointermove", moveDraggedNode);
      window.removeEventListener("pointerup", finishDrag);
      window.removeEventListener("pointercancel", finishDrag);
      window.removeEventListener("blur", finishDrag);
    };
  }, [draggingId, finishDrag, moveDraggedNode]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setStatusMessage("Logged out.");
    } catch (error) {
      console.error("Failed to log out", error);
      setStatusMessage(`Could not log out: ${error.message}`);
    }
  };
  //sace notes
const saveNote = async (person, note) => {
  if (!user) {
    setStatusMessage("Sign in with Google before saving notes.");
    return;
  }

  try {
    await saveNodeNote(user.uid, person, note);
    setStatusMessage("Note saved.");
  } catch (error) {
    console.error("Failed to save note", error);
    setStatusMessage(`Could not save note: ${error.message}`);
  }
};

  const getOffsetLabelPosition = (x1, y1, x2, y2, offset) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const offsetX = (-dy / length) * offset;
    const offsetY = (dx / length) * offset;
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    return {
      x: midX - offsetX,
      y: midY - offsetY,
    };
  };

  return (
    <main className="workspace-shell">
      <header className="workspace-toolbar">
        <div className="toolbar-title">
          <strong>GTD Map</strong>
          {user && <span>{user.displayName || user.email}</span>}
        </div>
        <div className="toolbar-actions">
          {!user ? (
  <>
    <button
      type="button"
      onClick={() => setShowInfo(true)}
      className="info-button"
    >
      Note:
    </button>

    <Login />
  </>
) : (
  <button type="button" onClick={handleLogout}>
    Logout
  </button>
)}
        </div>
      </header>

      {user && isLoadingUserData && <div className="floating-message top-message">Loading saved layout...</div>}
      {statusMessage && (
        <div className={`floating-message status-message ${statusMessage.startsWith("Could not") ? "error" : ""}`}>
          {statusMessage}
        </div>
      )}

      <section className="graph-scroll" aria-label="GTD workflow map">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          className="graph-canvas"
          role="img"
          aria-label="Draggable GTD workflow boxes"
        >
          <defs>
            <radialGradient id="circleGradient" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d8ecff" />
              <stop offset="100%" stopColor="#64a7d8" />
            </radialGradient>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="2" dy="2" stdDeviation="3" floodColor="#9aa" />
            </filter>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
            </marker>
          </defs>

          {people.flatMap((person) => {
            const from = positions[person.id];

            return person.relations.map((rel, index) => {
              const to = positions[rel.id];

              if (!from || !to) return null;

              const label = getOffsetLabelPosition(from.cx, from.cy, to.cx, to.cy, 18);
              const dx = to.cx - from.cx;
              const dy = to.cy - from.cy;
              const dist = Math.sqrt(dx * dx + dy * dy) || 1;
              const nodeRadius = 72;
              const endX = to.cx - (dx / dist) * (nodeRadius + 10);
              const endY = to.cy - (dy / dist) * (nodeRadius + 10);
              const startX = from.cx + (dx / dist) * (nodeRadius + 10);
              const startY = from.cy + (dy / dist) * (nodeRadius + 10);

              return (
                <g key={`${person.id}-${rel.id}-${index}`}>
                  <line x1={startX} y1={startY} x2={endX} y2={endY} stroke="#64748b" strokeWidth={2} markerEnd="url(#arrow)" />
                  <text
                    x={label.x}
                    y={label.y}
                    fontFamily={flowchartFont}
                    fontSize="13"
                    fontWeight="800"
                    textAnchor="middle"
                    fill="#111827"
                  >
                    {rel.relation}
                  </text>
                </g>
              );
            });
          })}

          {people.map((person) => {
            const pos = positions[person.id];

            if (!pos) return null;

            const isHovered = hoveredId === person.id;
            const colors = getNodeColors(person);
            const labelLines = wrapNodeLabel(person.name);
            const firstLineY = pos.cy - ((labelLines.length - 1) * 14);
            return (
              <g
                key={person.id}
                // onDoubleClick={() => setSelectedPerson(person)}
                

          onDoubleClick={() => {
        if (person.editable) {
            setSelectedPerson(person);
        }
    }}
    style={{
        cursor: person.editable ? "pointer" : "grab"
    }}
                onPointerDown={handlePointerDown(person.id)}
                onPointerEnter={() => setHoveredId(person.id)}
                onPointerLeave={() => setHoveredId(null)}
                className="graph-node"
              >
                <circle
                  cx={pos.cx}
                  cy={pos.cy}
                  r={isHovered ? "78" : "72"}
                  fill={colors.fill}
                  stroke={isHovered ? "#111827" : colors.stroke}
                  strokeWidth="5"
                  filter="url(#shadow)"
                />
                <text
                  x={pos.cx}
                  y={firstLineY}
                  textAnchor="middle"
                  fontFamily={flowchartFont}
                  fontWeight="800"
                  fontSize="22"
                  fill="#263241"
                >
                  {labelLines.map((line, index) => (
                    <tspan key={line} x={pos.cx} dy={index === 0 ? 0 : 27}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            );
          })}
        </svg>
      </section>
{showInfo && (
  <div
    className="modal-backdrop"
    onClick={() => setShowInfo(false)}
  >
    <div
      className="info-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <h3>Note</h3>

      <p>
        <strong>GTD (Getting Things Done)</strong> is a productivity
        methodology developed by David Allen.
      </p>

      <p>
        This application provides a visual GTD decision tree to help you
        organize incoming tasks.
      </p>

      <p>
        <strong>If you sign in with Google:</strong>
      </p>

      <ul>
        <li>Your notes are saved automatically.</li>
        <li>Your node positions are remembered.</li>
        <li>You can continue where you left off from any device.</li>
      </ul>

      <p>
        Without signing in, you can still explore and interact with the map,
        but your notes and layout won't be saved.
      </p>

      <button
        type="button"
        onClick={() => setShowInfo(false)}
      >
        Close
      </button>
    </div>
  </div>
)}
      {selectedPerson && (
        <div className="modal-backdrop">
          <div className="note-modal">
            <h3>{selectedPerson.name}</h3>
            <textarea
              rows={8}
              value={notes[selectedPerson.id] || ""}
              // onChange={(event) => {
              //   const nextNote = event.target.value;

              //   setNotes((prev) => ({
              //     ...prev,
              //     [selectedPerson.id]: nextNote,
              //   }));

              //   if (user) {
              //     saveNodeNote(user.uid, selectedPerson, nextNote)
              //       .then(() => {
              //         setStatusMessage("Note saved.");
              //       })
              //       .catch((error) => {
              //         console.error("Failed to save note", error);
              //         setStatusMessage(`Could not save note: ${error.message}`);
              //       });
              //   } else {
              //     setStatusMessage("Sign in with Google before saving notes.");
              //   }
              // }}
                  onChange={(event) => {
      const nextNote = event.target.value;
      const [showInfo, setShowInfo] = useState(false);
      setNotes((prev) => ({
        ...prev,
        [selectedPerson.id]: nextNote,
      }));

      // Cancel previous autosave
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }

      // Save 10 seconds after typing stops
      saveTimeout.current = setTimeout(() => {
        saveNote(selectedPerson, nextNote);
      }, 10000);
    }}
                  placeholder="Write notes..."
            />
            {/* <button type="button" onClick={() => setSelectedPerson(null)}>
              Close
            </button> */}
            <button
      type="button"
      onClick={async () => {
    // Cancel pending autosave
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
    }

    // Force save immediately
    await saveNote(
      selectedPerson,
      notes[selectedPerson.id] || ""
    );

    setSelectedPerson(null);
        }}
        >
        Close
      </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Relation;
