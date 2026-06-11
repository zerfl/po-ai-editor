export interface GlossaryTerm {
  source: string;
  target: string;
  note?: string;
}

export type Glossary = GlossaryTerm[];
