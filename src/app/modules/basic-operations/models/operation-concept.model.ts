export type OperationType = 'add' | 'sub' | 'mul' | 'div' | 'fraction' | 'decimal';

export const OPERATION_DIFFICULTY_BOUNDS = {
  min: 1,
  max: 50,
} as const;

export const OPERATION_ICON_MAP: Record<OperationType, string> = {
  add: '➕',
  sub: '➖',
  mul: '✖️',
  div: '➗',
  fraction: '½',
  decimal: '0.1',
};

export const OPERATION_DISPLAY_NAME_MAP: Record<OperationType, string> = {
  add: 'Addition',
  sub: 'Subtraction',
  mul: 'Multiplication',
  div: 'Division',
  fraction: 'Fractions',
  decimal: 'Decimals',
};

export const OPERATION_SKILL_MAP: Record<OperationType, string> = {
  add: 'addition',
  sub: 'subtraction',
  mul: 'multiplication',
  div: 'division',
  fraction: 'fraction',
  decimal: 'decimal',
};

export interface OperationConcept {
  operation: OperationType;
  definition: string;
  kidFriendlyExplanation: string;
  visualExplanation: string;
  examples: string[];
  commonMistakes: string[];
}
