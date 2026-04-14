export interface IsDateMessages {
  base?: string;
  min?: string;
  max?: string;
}

export interface IsDateOptions {
  min?: Date;
  max?: Date;
  message?: string | IsDateMessages;
}
