export type OperationType = 'add' | 'sub' | 'mul' | 'div' | 'fraction' | 'decimal';

export interface OperationConcept {
  operation: OperationType;
  definition: string;
  kidFriendlyExplanation: string;
  visualExplanation: string;
  examples: string[];
  commonMistakes: string[];
}
