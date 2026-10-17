/**
 * Confirmed articles copied from reading-desk/bot/lib/shelf.ts.
 * Title, author, minutes, URL, topics, about, and gives are copied.
 * Do not add a piece that is not on that shelf.
 * `why` is one sentence from that piece's about text.
 * `leaveOut` is the part that does not belong in the choice, from about and gives.
 * Publication names are copied from reading-desk/bot/lib/publications.ts.
 */

export type Topic =
  | "empty states"
  | "critique"
  | "design systems"
  | "complexity"
  | "craft"
  | "product writing";

export type Piece = {
  id: string;
  publicationId: string;
  title: string;
  by: string;
  minutes: number;
  url: string;
  topics: Topic[];
  about: string;
  gives: string;
  /** A famous general essay. Hold it back when it does not change the decision. */
  general: boolean;
  why: string;
  leaveOut: string;
};

export const publicationNames: Record<string, string> = {
  stripe: "Stripe blog",
  "ux-collective": "UX Collective",
  "ux-planet": "UX Planet",
  "looking-glass": "Julie Zhuo, The Looking Glass",
  nngroup: "Nielsen Norman Group",
  smashing: "Smashing Magazine",
  alistapart: "A List Apart",
  intercom: "Intercom blog",
  figma: "Figma blog",
  linear: "Linear blog",
  bradfrost: "Brad Frost",
  "shape-up": "Shape Up",
};

export const pieces: Piece[] = [
  {
    id: "empty-states",
    publicationId: "nngroup",
    title: "Designing Empty States in Complex Applications: 3 Guidelines",
    by: "Kate Kaplan",
    minutes: 8,
    url: "https://www.nngroup.com/articles/empty-state-interface-design/",
    topics: ["empty states", "craft"],
    about:
      "An empty panel should say the system status, teach what belongs there, and offer a path to fill it.",
    gives: "A line that states what is empty, what can be learned there, and the pathway out.",
    general: false,
    why: "An empty panel should say the system status, teach what belongs there, and offer a path to fill it.",
    leaveOut:
      "Leave out an empty panel that does not say the status, what belongs there, and a path to fill it.",
  },
  {
    id: "progressive-disclosure",
    publicationId: "nngroup",
    title: "Progressive Disclosure",
    by: "Jakob Nielsen",
    minutes: 10,
    url: "https://www.nngroup.com/articles/progressive-disclosure/",
    topics: ["complexity", "craft"],
    about:
      "Show the few options people use often, and put rare ones behind a control whose label says what is behind it.",
    gives:
      "A line that keeps everyday controls on the first view and moves rare ones behind a labeled door.",
    general: false,
    why: "Show the few options people use often, and put rare ones behind a control whose label says what is behind it.",
    leaveOut:
      "Leave out rare options on the first view. They belong behind a control whose label says what is behind it.",
  },
  {
    id: "training-wheels",
    publicationId: "nngroup",
    title: "Training Wheels User Interface",
    by: "Jakob Nielsen",
    minutes: 6,
    url: "https://www.nngroup.com/articles/training-wheels-user-interface/",
    topics: ["craft", "complexity"],
    about: "A new person gets the core controls first. The rest waits until that set is working.",
    gives: "A line that starts with the core set and holds the rest back.",
    general: false,
    why: "A new person gets the core controls first, and the rest waits until that set is working.",
    leaveOut: "Leave out the rest of the controls until the core set is working.",
  },
  {
    id: "ten-heuristics",
    publicationId: "nngroup",
    title: "10 Usability Heuristics for User Interface Design",
    by: "Jakob Nielsen",
    minutes: 12,
    url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
    topics: ["craft"],
    about: "Ten broad rules of thumb. They do not choose what one screen should do.",
    gives: "A checklist that applies to many products and does not decide this screen.",
    general: true,
    why: "Ten broad rules of thumb that do not choose what one screen should do.",
    leaveOut: "Leave out the ten rules. They do not choose what this screen should do.",
  },
  {
    id: "set-boundaries",
    publicationId: "shape-up",
    title: "Set Boundaries",
    by: "Ryan Singer",
    minutes: 12,
    url: "https://basecamp.com/shapeup/1.2-chapter-03",
    topics: ["complexity", "product writing"],
    about: "Shaping starts by fixing the appetite and narrowing the problem before anyone designs a solution.",
    gives: "A line that names the appetite and the narrow problem this work will solve.",
    general: false,
    why: "Shaping starts by fixing the appetite and narrowing the problem before anyone designs a solution.",
    leaveOut: "Leave out a solution drawn before the appetite and the narrow problem are fixed.",
  },
  {
    id: "write-the-pitch",
    publicationId: "shape-up",
    title: "Write the Pitch",
    by: "Ryan Singer",
    minutes: 12,
    url: "https://basecamp.com/shapeup/1.5-chapter-06",
    topics: ["product writing"],
    about: "A pitch states the problem, the appetite, the solution, the rabbit holes, and the no-gos.",
    gives: "A line that writes the problem, appetite, solution, rabbit holes, and no-gos.",
    general: false,
    why: "A pitch states the problem, the appetite, the solution, the rabbit holes, and the no-gos.",
    leaveOut: "Leave out a pitch that skips the problem, the appetite, the rabbit holes, or the no-gos.",
  },
  {
    id: "no-crap",
    publicationId: "bradfrost",
    title: "Don't put crap in the design system",
    by: "Brad Frost",
    minutes: 7,
    url: "https://bradfrost.com/blog/post/dont-put-crap-in-the-design-system/",
    topics: ["design systems"],
    about: "Product-specific work stays a recipe and does not enter the design system.",
    gives: "A line that keeps a one-off as a recipe instead of a system component.",
    general: false,
    why: "Product-specific work stays a recipe and does not enter the design system.",
    leaveOut: "Leave out product-specific work. It stays a recipe and does not enter the design system.",
  },
  {
    id: "governance-conversation",
    publicationId: "bradfrost",
    title: "Master design system governance with this one weird trick",
    by: "Brad Frost",
    minutes: 6,
    url: "https://bradfrost.com/blog/post/master-design-system-governance-with-this-one-weird-trick/",
    topics: ["design systems"],
    about: "Governance starts by asking whether the thing belongs in the system at all.",
    gives: "A line that asks whether this belongs before anyone adds it.",
    general: false,
    why: "Governance starts by asking whether the thing belongs in the system at all.",
    leaveOut: "Leave out the addition until someone has asked whether it belongs in the system.",
  },
  {
    id: "governance-process",
    publicationId: "bradfrost",
    title: "A Design System Governance Process",
    by: "Brad Frost",
    minutes: 14,
    url: "https://bradfrost.com/blog/post/a-design-system-governance-process/",
    topics: ["design systems"],
    about: "Incoming system work is a bug, a discrepancy, a feature, or a recipe.",
    gives: "A line that sorts the request as a bug, a discrepancy, a feature, or a recipe.",
    general: false,
    why: "Incoming system work is a bug, a discrepancy, a feature, or a recipe.",
    leaveOut:
      "Leave out a request that has not been sorted as a bug, a discrepancy, a feature, or a recipe.",
  },
  {
    id: "atomic-design",
    publicationId: "bradfrost",
    title: "Atomic Design",
    by: "Brad Frost",
    minutes: 15,
    url: "https://atomicdesign.bradfrost.com/",
    topics: ["design systems"],
    about: "A book that names interface parts as atoms, molecules, organisms, templates, and pages.",
    gives: "A vocabulary of parts. It does not choose which parts this decision needs.",
    general: true,
    why: "A book that names interface parts as atoms, molecules, organisms, templates, and pages.",
    leaveOut:
      "Leave out the vocabulary of atoms and pages. It does not choose which parts this decision needs.",
  },
  {
    id: "product-critique",
    publicationId: "looking-glass",
    title: "How to do a Product Critique",
    by: "Julie Zhuo",
    minutes: 8,
    url: "https://medium.com/the-year-of-the-looking-glass/how-to-do-a-product-critique-98b657050638",
    topics: ["critique"],
    about:
      "Walk the product as the user, name blockers in ordinary language, and order them by impact.",
    gives: "A line that lists the blockers in ordinary language, ordered by impact.",
    general: false,
    why: "Walk the product as the user, name blockers in ordinary language, and order them by impact.",
    leaveOut:
      "Leave out a critique that does not walk the product, name blockers in ordinary language, and order them by impact.",
  },
  {
    id: "stripe-payments-apis",
    publicationId: "stripe",
    title: "Stripe's payments APIs: The first 10 years",
    by: "Michelle Bu",
    minutes: 14,
    url: "https://stripe.com/blog/payment-api-design",
    topics: ["complexity", "craft"],
    about:
      "How Stripe's payments API grew past a few lines of code, and why adding parameters became product debt.",
    gives: "A line that names the complexity being hidden and the migration the user should not have to redo.",
    general: false,
    why: "How Stripe's payments API grew past a few lines of code, and why adding parameters became product debt.",
    leaveOut:
      "Leave out another parameter. Name the complexity being hidden, and the migration the user should not have to redo.",
  },
  {
    id: "stripe-color",
    publicationId: "stripe",
    title: "Designing accessible color systems",
    by: "Daryl Koopersmith and Wilson Miner",
    minutes: 10,
    url: "https://stripe.com/blog/accessible-color-systems",
    topics: ["craft", "design systems"],
    about: "A palette can stay vivid and still pass contrast when lightness is judged the way people see it.",
    gives: "A line that checks contrast and visual weight before a palette is called done.",
    general: false,
    why: "A palette can stay vivid and still pass contrast when lightness is judged the way people see it.",
    leaveOut: "Leave out a palette that has not been checked for contrast and visual weight.",
  },
  {
    id: "smashing-empty",
    publicationId: "smashing",
    title: "The Role Of Empty States In User Onboarding",
    by: "Nick Babich",
    minutes: 9,
    url: "https://www.smashingmagazine.com/2017/02/user-onboarding-empty-states-mobile-apps/",
    topics: ["empty states"],
    about: "A first-use empty screen is part of onboarding: it says what will show up and how to fill it.",
    gives: "A line that treats the empty screen as the first step, with short copy and one action.",
    general: false,
    why: "A first-use empty screen is part of onboarding: it says what will show up and how to fill it.",
    leaveOut: "Leave out an empty screen that does not say what will show up and how to fill it.",
  },
  {
    id: "smashing-microcopy",
    publicationId: "smashing",
    title: "How To Improve Your Microcopy: UX Writing Tips For Non-UX Writers",
    by: "Irina Silyanova",
    minutes: 12,
    url: "https://www.smashingmagazine.com/2024/06/how-improve-microcopy-ux-writing-tips-non-ux-writers/",
    topics: ["product writing", "craft"],
    about:
      "Empty-state copy should give a way out, put the important fact first, and use one idea per line.",
    gives: "A line of empty-state copy that says what to do next, not that the screen is empty.",
    general: false,
    why: "Empty-state copy should give a way out, put the important fact first, and use one idea per line.",
    leaveOut: "Leave out a line that only says the screen is empty.",
  },
  {
    id: "ala-modular",
    publicationId: "alistapart",
    title: "The Language of Modular Design",
    by: "Alla Kholmatova",
    minutes: 12,
    url: "https://alistapart.com/article/language-of-modular-design/",
    topics: ["design systems"],
    about: "Modules only stay reusable when the team shares names for them before they are built.",
    gives: "A line that names the module by what it does, in words the team already agreed.",
    general: false,
    why: "Modules only stay reusable when the team shares names for them before they are built.",
    leaveOut: "Leave out a module the team has not named by what it does.",
  },
  {
    id: "ala-interaction",
    publicationId: "alistapart",
    title: "Designing for Easy Interaction",
    by: "Whitney Quesenbery and Sarah Horton",
    minutes: 11,
    url: "https://alistapart.com/article/designing-for-easy-interaction/",
    topics: ["craft", "complexity"],
    about: "People do better with controls they already know, in an order they can follow with a keyboard.",
    gives: "A line that keeps a familiar control and puts feedback next in the reading order.",
    general: false,
    why: "People do better with controls they already know, in an order they can follow with a keyboard.",
    leaveOut: "Leave out a novel control, and feedback that is not next in the reading order.",
  },
  {
    id: "intercom-dribbblisation",
    publicationId: "intercom",
    title: "The dribbblisation of design",
    by: "Paul Adams",
    minutes: 8,
    url: "https://www.intercom.com/blog/the-dribbblisation-of-design/",
    topics: ["critique", "craft"],
    about:
      "Work that looks finished in a gallery can still miss the problem, the tradeoff, and the business.",
    gives: "A line that asks what problem the screen solves before anyone discusses how it looks.",
    general: false,
    why: "Work that looks finished in a gallery can still miss the problem, the tradeoff, and the business.",
    leaveOut:
      "Leave out a discussion of how the screen looks before anyone has said what problem it solves.",
  },
  {
    id: "figma-ds-101",
    publicationId: "figma",
    title: "Design system 101: What is a design system?",
    by: "Chad Bergman",
    minutes: 8,
    url: "https://www.figma.com/blog/design-systems-101-what-is-a-design-system/",
    topics: ["design systems"],
    about: "A design system is the shared blocks and standards a product reuses, not a sticker sheet.",
    gives: "A line that names the system as shared blocks and standards.",
    general: false,
    why: "A design system is the shared blocks and standards a product reuses, not a sticker sheet.",
    leaveOut: "Leave out the sticker sheet. A design system is the shared blocks and standards a product reuses.",
  },
  {
    id: "figma-handoff",
    publicationId: "figma",
    title: "The designer's handbook for developer handoff",
    by: "Jake Albaugh and Chad Bergman",
    minutes: 10,
    url: "https://www.figma.com/blog/the-designers-handbook-for-developer-handoff/",
    topics: ["craft", "design systems"],
    about:
      "Handoff works when the file uses the system on purpose and a deviation says why it left the system.",
    gives: "A line that names the system part used, or why this screen left it.",
    general: false,
    why: "Handoff works when the file uses the system on purpose and a deviation says why it left the system.",
    leaveOut: "Leave out a deviation that does not say why it left the system.",
  },
  {
    id: "figma-content",
    publicationId: "figma",
    title: "How to do content design / UX writing in Figma",
    by: "Ryan Cordell",
    minutes: 8,
    url: "https://www.figma.com/blog/how-to-do-content-design-ux-writing-in-figma/",
    topics: ["product writing", "craft"],
    about: "Write the words in the same file as the layout, and put guidance on the component itself.",
    gives: "A line of interface copy written in the file, with the decision noted beside it.",
    general: false,
    why: "Write the words in the same file as the layout, and put guidance on the component itself.",
    leaveOut: "Leave out words written outside the file, and guidance that is not on the component.",
  },
  {
    id: "linear-settings",
    publicationId: "linear",
    title: "Settings are not a design failure",
    by: "Adrien Griveau",
    minutes: 7,
    url: "https://linear.app/blog/settings-are-not-a-design-failure",
    topics: ["complexity", "craft"],
    about:
      "Some settings are preferences people want. They are not proof the product failed to decide.",
    gives: "A line that separates a preference someone should set from a default the product should choose.",
    general: false,
    why: "Some settings are preferences people want, and they are not proof the product failed to decide.",
    leaveOut: "Leave out the claim that a setting is proof the product failed to decide.",
  },
  {
    id: "linear-design-reset",
    publicationId: "linear",
    title: "A design reset (part I)",
    by: "Karri Saarinen",
    minutes: 8,
    url: "https://linear.app/now/a-design-reset",
    topics: ["design systems", "craft"],
    about:
      "Small ships add design debt. A reset is justified when the product's job has widened and the chrome no longer fits.",
    gives: "A line that says which new job the current screen can no longer hold.",
    general: false,
    why: "Small ships add design debt, and a reset is justified when the product's job has widened and the chrome no longer fits.",
    leaveOut: "Leave out a reset that does not name the new job the current screen can no longer hold.",
  },
  {
    id: "uxcollective-empty-types",
    publicationId: "ux-collective",
    title: "7 types of empty states and how to use them",
    by: "Kinneret Yifrah",
    minutes: 11,
    url: "https://uxdesign.cc/7-types-of-empty-states-and-how-to-use-them-717006dfaa8a",
    topics: ["empty states", "product writing"],
    about:
      "First use, waiting, come back later, done, upgrade, and two kinds of no-results each need different words.",
    gives: "A line that names which empty-state type this screen is, and the words that type needs.",
    general: false,
    why: "First use, waiting, come back later, done, upgrade, and two kinds of no-results each need different words.",
    leaveOut: "Leave out one generic empty message. Name which type this screen is, and the words that type needs.",
  },
  {
    id: "uxplanet-empty-guide",
    publicationId: "ux-planet",
    title: "Empty State Design: A Practical Guide",
    by: "Zhiyang",
    minutes: 5,
    url: "https://uxplanet.org/empty-state-design-a-practical-guide-94ad0adbda45",
    topics: ["empty states"],
    about: "An empty state should say what is happening, why, and what the person can do next.",
    gives: "A line that answers what is happening, why, and the next action.",
    general: false,
    why: "An empty state should say what is happening, why, and what the person can do next.",
    leaveOut:
      "Leave out an empty state that does not say what is happening, why, and what the person can do next.",
  },
];

export function publicationName(publicationId: string): string {
  return publicationNames[publicationId] ?? publicationId;
}
