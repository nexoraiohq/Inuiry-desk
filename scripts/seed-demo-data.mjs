import { createRequire } from "node:module";

/**
 * Seeds five months of realistic demo activity into one workspace.
 * Requires FA_PROJECT, FA_EMAIL, FA_KEY supplied by the operator at runtime.
 * Every document is tagged with `demoSeed` and an id prefixed `demo_` so the
 * whole set can be identified and removed without touching real records.
 */
const require = createRequire(import.meta.url);
const { cert, initializeApp } = require("firebase-admin/app");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");

initializeApp({
  credential: cert({
    projectId: process.env.FA_PROJECT,
    clientEmail: process.env.FA_EMAIL,
    privateKey: process.env.FA_KEY.replace(/\\n/g, "\n"),
  }),
});
const db = getFirestore();

const WORKSPACE_ID = process.env.SEED_WORKSPACE_ID ?? "RWG7QxEvTzbBbwGjdW2fvKj50Q03";
const OWNER = WORKSPACE_ID;
const DAY = 86_400_000;
const NOW = new Date();
const START = new Date(NOW.getTime() - 150 * DAY);
const SEED = "phase-10-demo";

// Deterministic pseudo-random generator so the dataset is reproducible.
let state = 20261127;
function rand() {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}
const pick = (list) => list[Math.floor(rand() * list.length)];
const chance = (p) => rand() < p;
const between = (a, b) => a + Math.floor(rand() * (b - a + 1));
const timeIn = (from, to) => new Date(from.getTime() + rand() * (to.getTime() - from.getTime()));
const ts = (date) => Timestamp.fromDate(date);

const firstNames = ["Amina", "Brian", "Carol", "David", "Elena", "Frank", "Grace", "Hassan", "Ivy", "James", "Karen", "Liam", "Maria", "Noah", "Olivia", "Peter", "Quinn", "Rachel", "Samuel", "Teresa", "Uma", "Victor", "Wendy", "Yusuf", "Zoe", "Daniel", "Faith", "George", "Hannah", "Isaac"];
const lastNames = ["Mwangi", "Otieno", "Kamau", "Njeri", "Ali", "Wekesa", "Mutua", "Ochieng", "Kariuki", "Mohamed", "Achieng", "Kiptoo", "Maina", "Odhiambo", "Wafula", "Njoroge", "Omondi", "Wanjiku", "Kipchoge", "Atieno"];
const services = ["Website design", "Brand identity", "Social media management", "SEO audit", "Landing page", "Logo design", "Digital marketing", "Content writing", "E-commerce setup", "Website redesign", "Consultation", "Photography"];
const sources = ["website", "whatsapp", "referral", "instagram", "phone", "facebook", "walk_in"];
const statuses = ["new", "contacted", "qualified", "converted", "lost"];
const priorities = ["low", "normal", "high"];
const notes = [
  "Asked for a quote and a rough timeline.",
  "Budget is flexible if the scope is clear.",
  "Needs to speak with the team before deciding.",
  "Referred by an existing client.",
  "Send examples of similar work.",
  "Follow up after the weekend.",
  "Wants a phased proposal.",
  "Price sensitive — offer a smaller package.",
  null,
  null,
];
const summaries = [
  "Discussed the scope and agreed to share a proposal.",
  "Sent the quote and answered questions about the timeline.",
  "Customer asked about payment terms and deliverables.",
  "Quick call to confirm requirements for the project.",
  "Shared portfolio links and next steps.",
  "No answer — left a message and will try again later.",
  "Confirmed the brief and requested a start date.",
  "Customer replied with additional requirements.",
];

const channels = ["phone", "whatsapp", "email", "sms", "in_person"];
const outcomes = {
  phone: ["connected", "no_answer", "voicemail"],
  whatsapp: ["message_sent", "customer_replied", "no_response"],
  email: ["email_sent", "customer_replied", "no_response"],
  sms: ["message_sent", "customer_replied", "no_response"],
  in_person: ["meeting_completed", "meeting_missed"],
};
const followUpTitles = ["Call to confirm scope", "Send the proposal", "Check in on the quote", "Schedule a discovery call", "Follow up on feedback", "Confirm project start", "Share revised pricing"];

(async () => {
  const root = db.collection("workspaces").doc(WORKSPACE_ID);
  const existing = await root.collection("inquiries").where("demoSeed", "==", SEED).limit(1).get();
  if (!existing.empty) {
    console.log("demo data already present — nothing added");
    return;
  }

  const inquiries = [];
  const followUps = [];
  const communications = [];
  const activities = [];

  const activity = (type, inquiryId, description, at) => {
    activities.push({
      id: `demo_act_${String(activities.length + 1).padStart(4, "0")}`,
      type,
      inquiryId,
      description,
      createdAt: ts(at),
      createdByUid: OWNER,
      demoSeed: SEED,
    });
  };

  const inquiryCount = 68;
  for (let i = 0; i < inquiryCount; i += 1) {
    const id = `demo_inq_${String(i + 1).padStart(3, "0")}`;
    const created = timeIn(START, new Date(NOW.getTime() - DAY));
    const status = pick(statuses);
    const updated = timeIn(created, NOW);
    const archived = chance(0.1);
    const fullName = `${pick(firstNames)} ${pick(lastNames)}`;
    const record = {
      fullName,
      phone: `+2547${between(10000000, 99999999)}`,
      email: chance(0.7) ? `${fullName.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com` : null,
      service: pick(services),
      source: pick(sources),
      status,
      priority: pick(priorities),
      notes: pick(notes),
      pinned: !archived && chance(0.06),
      pinnedAt: null,
      sortOrder: i,
      archived,
      createdAt: ts(created),
      updatedAt: ts(updated),
      lastContactedAt: status === "new" ? null : ts(timeIn(created, updated)),
      nextFollowUpAt: null,
      createdByUid: OWNER,
      demoSeed: SEED,
    };
    if (record.pinned) record.pinnedAt = ts(updated);
    inquiries.push({ id, ...record });
    activity("inquiry_created", id, `Inquiry created from ${record.source}.`, created);
    if (status !== "new") {
      activity("status_changed", id, `Status changed from new to ${status}.`, updated);
    }
    if (chance(0.15)) {
      activity("note_added", id, "Note added to the inquiry.", timeIn(created, updated));
    }
  }

  const activeInquiries = inquiries.filter((item) => !item.archived && item.status !== "lost");
  for (let i = 0; i < 52; i += 1) {
    const inquiry = pick(activeInquiries);
    const id = `demo_fu_${String(i + 1).padStart(3, "0")}`;
    const created = timeIn(inquiry.createdAt.toDate(), new Date(Math.min(NOW.getTime(), inquiry.createdAt.toDate().getTime() + 60 * DAY)));
    const roll = rand();
    const status = roll < 0.34 ? "pending" : roll < 0.87 ? "completed" : "cancelled";
    const dueDate = timeIn(created, new Date(created.getTime() + 14 * DAY));
    const completedAt = status === "completed" ? timeIn(dueDate, NOW) : null;
    const record = {
      inquiryId: inquiry.id,
      customerName: inquiry.fullName,
      title: pick(followUpTitles),
      description: chance(0.5) ? "Check progress and agree on the next step." : null,
      dueAt: ts(dueDate),
      status,
      priority: pick(priorities),
      scheduleVersion: between(1, 3),
      createdAt: ts(created),
      updatedAt: ts(completedAt ?? dueDate),
      completedAt: completedAt ? ts(completedAt) : null,
      createdByUid: OWNER,
      demoSeed: SEED,
    };
    followUps.push({ id, ...record });
    activity("follow_up_created", inquiry.id, `Follow-up scheduled: ${record.title}.`, created);
    if (status === "completed") activity("follow_up_completed", inquiry.id, "Follow-up completed.", completedAt);
    if (status === "cancelled") activity("follow_up_cancelled", inquiry.id, "Follow-up cancelled.", record.updatedAt.toDate());
    if (status === "pending" && chance(0.3)) {
      activity("follow_up_rescheduled", inquiry.id, "Follow-up rescheduled.", record.updatedAt.toDate());
    }
    const existingNext = inquiry.nextFollowUpAt;
    if (!existingNext || dueDate.getTime() < existingNext.toDate().getTime()) {
      inquiry.nextFollowUpAt = ts(dueDate);
    }
  }

  for (let i = 0; i < 64; i += 1) {
    const inquiry = pick(inquiries);
    const channel = pick(channels);
    const occurred = timeIn(inquiry.createdAt.toDate(), NOW);
    const record = {
      inquiryId: inquiry.id,
      channel,
      direction: chance(0.6) ? "outgoing" : "incoming",
      outcome: pick(outcomes[channel]),
      summary: pick(summaries),
      occurredAt: ts(occurred),
      createdAt: ts(occurred),
      updatedAt: ts(occurred),
      followUpId: chance(0.4) ? pick(followUps).id : null,
      createdByUid: OWNER,
      demoSeed: SEED,
    };
    communications.push({ id: `demo_com_${String(i + 1).padStart(3, "0")}`, ...record });
    activity("communication_logged", inquiry.id, `${channel} interaction logged.`, occurred);
    if (!inquiry.lastContactedAt || occurred.getTime() > inquiry.lastContactedAt.toDate().getTime()) {
      inquiry.lastContactedAt = ts(occurred);
    }
  }

  // Write in batches of 450 to stay under Firestore's 500-operation limit.
  const write = async (collectionName, docs) => {
    for (let i = 0; i < docs.length; i += 450) {
      const batch = db.batch();
      for (const doc of docs.slice(i, i + 450)) {
        const { id, ...data } = doc;
        batch.set(root.collection(collectionName).doc(id), data);
      }
      await batch.commit();
    }
    console.log(`${collectionName}=${docs.length}`);
  };

  await write("inquiries", inquiries);
  await write("followUps", followUps);
  await write("communications", communications);
  await write("activities", activities);

  console.log(`workspace=${WORKSPACE_ID} window=${START.toISOString()}..${NOW.toISOString()}`);
})().catch((error) => {
  console.error(`seed_failed=${String(error && error.message ? error.message : error)}`);
  process.exitCode = 1;
});
