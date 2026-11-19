import { spokenToAnswer } from './spoken-answer';

describe('spokenToAnswer', () => {
  const cases: Array<[string, string]> = [
    // Whole numbers, as words or as the digits a speech engine sends
    ['twenty three', '23'], ['23', '23'], ['seventy-five', '75'], ['one hundred and five', '105'],
    ['two thousand three hundred forty', '2340'], ['1,000', '1000'], ['one lakh', '100000'], ['zero', '0'],
    // Negatives
    ['minus five', '-5'], ['negative twelve', '-12'], ['-7', '-7'], ['minus i', '-i'],
    // Fractions, including "3 by 4"
    ['three quarters', '3/4'], ['three fourths', '3/4'], ['3/4', '3/4'], ['3 / 4', '3/4'], ['three over four', '3/4'],
    ['3 by 4', '3/4'], ['three by four', '3/4'], ['minus 3 by 4', '-3/4'], ['15 by 4', '15/4'], ['twenty one divided by four', '21/4'],
    ['eleven twelfths', '11/12'], ['five thirds', '5/3'], ['a half', '1/2'],
    // Mixed numbers and decimals
    ['two and three quarters', '2 3/4'], ['two and a half', '2 1/2'], ['minus two and one third', '-2 1/3'],
    ['zero point two five', '0.25'], ['point five', '0.5'], ['three point one four', '3.14'], ['12.5', '12.5'],
    // Several values, joined as typed
    ['x equals 3 and y equals minus 2', '3, -2'], ['3 comma minus 2', '3, -2'], ['three and five', '3, 5'],
    // Sums and products stay as said, e.g. expanded form and prime factors
    ['300 + 40 + 6', '300 + 40 + 6'], ['300+40+6', '300 + 40 + 6'], ['three hundred plus forty plus six', '300 + 40 + 6'],
    ['2 × 3 × 5', '2 × 3 × 5'], ['two times two times three', '2 × 2 × 3'], ['5 minus 2', '5 - 2'],
    // Filler, units and word answers
    ['the answer is forty two', '42'], ['it is 18 degrees', '18'], ['rational', 'rational'], ['i', 'i'],
    // A digit said alone that the engine heard as a word
    ['for', '4'], ['to', '2'],
  ];

  for (const [said, typed] of cases) {
    it(`turns "${said}" into "${typed}"`, () => {
      expect(spokenToAnswer(said)).toBe(typed);
    });
  }
});
