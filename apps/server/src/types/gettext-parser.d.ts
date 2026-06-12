declare module 'gettext-parser' {
  export interface GettextComments {
    translator?: string;
    extracted?: string;
    reference?: string;
    flag?: string;
    previous?: string;
  }

  export interface GettextTranslation {
    msgstr: string[];
    msgctxt?: string;
    msgid?: string;
    msgid_plural?: string;
    comments?: GettextComments;
  }

  export interface GettextTranslations {
    [msgid: string]: GettextTranslation;
  }

  export interface GettextData {
    charset?: string;
    headers?: Record<string, string>;
    translations: {
      [context: string]: GettextTranslations;
    };
    obsolete?: {
      [context: string]: GettextTranslations;
    };
  }

  interface ParseOptions {
    defaultCharset?: string;
    validation?: boolean;
  }

  interface CompileOptions {
    foldLength?: number | false;
    sort?: boolean | ((left: GettextTranslation, right: GettextTranslation) => number);
    escapeCharacters?: boolean;
  }

  interface Parser {
    parse(content: string | Buffer, options?: ParseOptions): GettextData;
    compile(data: GettextData, options?: CompileOptions): Buffer;
  }

  export const po: Parser;
  export const mo: Parser;
}
