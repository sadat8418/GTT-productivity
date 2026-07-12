import {
  doc,
  getDocs,
  collection,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase/firebase";

// Save position of ANY node
export async function saveNodePosition(userId, node) {
  await setDoc(
    doc(db, "users", userId, "nodes", String(node.id)),
    {
      x: node.x,
      y: node.y,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

// Save note ONLY if editable
export async function saveNodeNote(userId, node, note) {
  if (!node.editable) return;

  await setDoc(
    doc(db, "users", userId, "nodes", String(node.id)),
    {
      note,
      updatedAt: new Date(),
    },
    { merge: true }
  );
}

export async function loadUserNodes(userId) {
  const snapshot = await getDocs(
    collection(db, "users", userId, "nodes")
  );

  const positions = {};
  const notes = {};

  snapshot.forEach((nodeDoc) => {
    const data = nodeDoc.data();
    const id = Number(nodeDoc.id);

    if (
      Number.isFinite(id) &&
      typeof data.x === "number" &&
      typeof data.y === "number"
    ) {
      positions[id] = {
        cx: data.x,
        cy: data.y,
      };
    }

    if (
      Number.isFinite(id) &&
      typeof data.note === "string"
    ) {
      notes[id] = data.note;
    }
  });

  return {
    positions,
    notes,
  };
}