export interface PoComment {
  translator?: string;
  extracted?: string;
  reference?: string;
  flag?: string;
  previous?: string;
}

export interface PoEntry {
  id: string;
  msgctxt: string | null;
  msgid: string;
  msgidPlural: string | null;
  msgstr: string;
  msgstrPlural: string[];
  comments: PoComment;
  isFuzzy: boolean;
  isObsolete: boolean;
  isTranslated: boolean;
}

export interface PoMetadata {
  projectVersion: string;
  reportMsgidBugsTo: string;
  potCreationDate: string;
  poRevisionDate: string;
  lastTranslator: string;
  languageTeam: string;
  language: string;
  contentType: string;
  contentTransferEncoding: string;
  pluralForms: string;
  xGenerator?: string;
  extraHeaders?: Record<string, string>;
}

export interface PoFile {
  entries: PoEntry[];
  metadata: PoMetadata;
  filename: string;
}
