export interface IsNumberMessages {
  base?: string;
  int?: string;
  positive?: string;
  negative?: string;
  nonnegative?: string;
  min?: string;
  max?: string;
  finite?: string;
  multipleOf?: string;
}

export interface IsNumberOptions {
  int?: boolean;
  positive?: boolean;
  negative?: boolean;
  nonnegative?: boolean;
  min?: number;
  max?: number;
  finite?: boolean;
  multipleOf?: number;
  message?: string | IsNumberMessages;
}
