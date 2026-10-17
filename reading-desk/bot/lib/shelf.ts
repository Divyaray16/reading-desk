/** Confirmed articles. Real URLs only. UX Collective, UX Planet, Intercom, and Linear stay on the map with no article. */
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
};

export const shelf: Piece[] = [
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
  },
  {
    id: "smashing-inclusion",
    publicationId: "smashing",
    title: "Designing For Accessibility And Inclusion",
    by: "Steven Lambert",
    minutes: 30,
    url: "https://www.smashingmagazine.com/2018/04/designing-accessibility-inclusion/",
    topics: ["craft"],
    about:
      "Accessibility is settled in the design, by looking at a screen through lenses such as color, controls, keyboard, and layout.",
    gives: "A line that names the accessibility lens this screen still fails.",
    general: false,
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
  },
];

export function pieceById(id: string): Piece | undefined {
  return shelf.find((piece) => piece.id === id);
}
