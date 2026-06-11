declare module 'gettext-parser' {
  export interface GettextTranslation {
    msgstr: string[];
    msgctxt?: string;
    msgid_plural?: string;
    comments?: {
      translator?: string;
      extracted?: string;
      reference?: string;
      flag?: string;
    };
  }

  export interface GettextTranslations {
    [msgid: string]: GettextTranslation;
  }

  export interface GettextData {
    translations: {
      [context: string]: GettextTranslations;
    };
  }

  interface Parser {
    parse(content: string | Buffer, encoding?: string): GettextData;
    compile(data: GettextData): Buffer;
  }

  export const po: Parser;
  export const mo: Parser;
}
