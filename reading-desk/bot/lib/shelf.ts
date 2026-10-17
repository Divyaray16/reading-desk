/** One published piece. Edit this list to change what the desk can recommend. */
export type Piece = {
  id: string;
  title: string;
  by: string;
  source: string;
  year: string | null;
  minutes: number;
  url: string;
  about: string;
  gives: string;
};

export const shelf: Piece[] = [
  {
    id: "empty-states",
    title: "Designing Empty States in Complex Applications",
    by: "Kate Kaplan",
    source: "NN/g",
    year: "2021",
    minutes: 6,
    url: "https://www.nngroup.com/articles/empty-state-interface-design/",
    about:
      "An empty screen should show status, offer something to learn, and give a pathway forward.",
    gives:
      "A line that states what is empty, what the person can learn there, and the pathway out.",
  },
  {
    id: "progressive-disclosure",
    title: "Progressive Disclosure",
    by: "Jakob Nielsen",
    source: "NN/g",
    year: "2006",
    minutes: 8,
    url: "https://www.nngroup.com/articles/progressive-disclosure/",
    about:
      "Frequent options stay in front, and rare ones sit behind a door that is labeled.",
    gives:
      "A line that keeps everyday controls on the first view and moves rare ones behind a labeled door.",
  },
  {
    id: "training-wheels",
    title: "Training Wheels User Interface",
    by: "Jakob Nielsen",
    source: "NN/g",
    year: "2006",
    minutes: 5,
    url: "https://www.nngroup.com/articles/training-wheels-user-interface/",
    about:
      "A new person gets the core set of controls first, and the rest waits until that set is working.",
    gives: "A line that starts with the core set and holds the rest back.",
  },
  {
    id: "set-boundaries",
    title: "Set Boundaries",
    by: "Ryan Singer",
    source: "Shape Up",
    year: "2019",
    minutes: 12,
    url: "https://basecamp.com/shapeup/1.2-chapter-03",
    about: "Shaping starts by fixing the appetite and narrowing the problem.",
    gives: "A line that names the appetite and the narrow problem this work will solve.",
  },
  {
    id: "write-the-pitch",
    title: "Write the Pitch",
    by: "Ryan Singer",
    source: "Shape Up",
    year: "2019",
    minutes: 10,
    url: "https://basecamp.com/shapeup/1.5-chapter-06",
    about:
      "A pitch states the problem, the appetite, the solution, the rabbit holes, and the no-gos.",
    gives:
      "A line that writes the problem, appetite, solution, rabbit holes, and no-gos.",
  },
  {
    id: "no-crap",
    title: "Don’t put crap in the design system",
    by: "Brad Frost",
    source: "bradfrost.com",
    year: null,
    minutes: 7,
    url: "https://bradfrost.com/blog/post/dont-put-crap-in-the-design-system/",
    about: "Product-specific work stays a recipe and does not enter the design system.",
    gives: "A line that keeps a one-off as a recipe instead of a system component.",
  },
  {
    id: "governance-conversation",
    title: "Master design system governance with this one weird trick",
    by: "Brad Frost",
    source: "bradfrost.com",
    year: null,
    minutes: 6,
    url: "https://bradfrost.com/blog/post/master-design-system-governance-with-this-one-weird-trick/",
    about: "Governance starts by asking whether the thing belongs in the system at all.",
    gives: "A line that asks whether this belongs before anyone adds it.",
  },
  {
    id: "governance-process",
    title: "A Design System Governance Process",
    by: "Brad Frost",
    source: "bradfrost.com",
    year: null,
    minutes: 14,
    url: "https://bradfrost.com/blog/post/a-design-system-governance-process/",
    about: "Incoming system work is a bug, a discrepancy, a feature, or a recipe.",
    gives:
      "A line that sorts the request as a bug, a discrepancy, a feature, or a recipe.",
  },
  {
    id: "product-critique",
    title: "How to do a Product Critique",
    by: "Julie Zhuo",
    source: "The Looking Glass",
    year: null,
    minutes: 8,
    url: "https://medium.com/the-year-of-the-looking-glass/how-to-do-a-product-critique-98b657050638",
    about:
      "A critique walks the product as the user, names blockers in ordinary language, and orders them by impact.",
    gives: "A line that lists the blockers in ordinary language, ordered by impact.",
  },
  {
    id: "ten-heuristics",
    title: "Ten Usability Heuristics",
    by: "Jakob Nielsen",
    source: "NN/g",
    year: null,
    minutes: 10,
    url: "https://www.nngroup.com/articles/ten-usability-heuristics/",
    about: "A broad usability checklist that does not choose what one screen should do.",
    gives: "Ten general checks that apply to many products and do not decide this screen.",
  },
  {
    id: "atomic-design",
    title: "Atomic Design",
    by: "Brad Frost",
    source: "atomicdesign.bradfrost.com",
    year: null,
    minutes: 12,
    url: "https://atomicdesign.bradfrost.com/",
    about: "A metaphor that names interface parts as atoms, molecules, and organisms.",
    gives:
      "A vocabulary of atoms, molecules, and organisms that does not choose which parts this decision needs.",
  },
];

export function pieceById(id: string): Piece | undefined {
  return shelf.find((piece) => piece.id === id);
}
