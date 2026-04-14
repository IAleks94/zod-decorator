export interface IsStringMessages {
  base?: string;
  min?: string;
  max?: string;
  length?: string;
  email?: string;
  url?: string;
  uuid?: string;
  regex?: string;
  startsWith?: string;
  endsWith?: string;
}

export interface IsStringOptions {
  min?: number;
  max?: number;
  length?: number;
  email?: boolean;
  url?: boolean;
  uuid?: boolean;
  regex?: RegExp;
  trim?: boolean;
  toLowerCase?: boolean;
  toUpperCase?: boolean;
  startsWith?: string;
  endsWith?: string;
  message?: string | IsStringMessages;
}
