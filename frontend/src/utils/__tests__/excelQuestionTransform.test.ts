import { describe, it, expect } from 'vitest';
import { transformExcelRowsToQuestions } from '../excelQuestionTransform';

describe('excelQuestionTransform', () => {
  it('should correctly transform valid multiple_choice row', () => {
    const rows = [
      {
        text: '1 + 1 = ?',
        type: 'multiple_choice',
        subject: 'Toan',
        difficulty: 'easy',
        tags: 'toan,coban',
        option_1: '2',
        option_2: '3',
        option_3: '4',
        correct_answer: '1',
      },
    ];

    const result = transformExcelRowsToQuestions(rows);
    expect(result.errors).toHaveLength(0);
    expect(result.payloads).toHaveLength(1);

    const q = result.payloads[0];
    expect(q.content.text).toBe('1 + 1 = ?');
    expect(q.type).toBe('multiple_choice');
    expect(q.options).toHaveLength(3);
    expect(q.options[0].is_correct).toBe(true);
    expect(q.options[1].is_correct).toBe(false);
    expect(q.correct_answer).toBe('opt_1');
    expect(q.metadata.subject).toBe('Toan');
  });

  it('should correctly transform valid true_false row', () => {
    const rows = [
      {
        text: 'Trái đất hình cầu',
        type: 'true_false',
        subject: 'DiaLy',
        correct_answer: 'đúng',
      },
    ];

    const result = transformExcelRowsToQuestions(rows);
    expect(result.errors).toHaveLength(0);
    expect(result.payloads).toHaveLength(1);

    const q = result.payloads[0];
    expect(q.type).toBe('true_false');
    expect(q.correct_answer).toBe('opt_true');
  });

  it('should catch invalid rows with missing text or options', () => {
    const rows = [
      {
        type: 'multiple_choice',
        subject: 'Toan',
      },
      {
        text: 'Câu hỏi thiếu options',
        type: 'multiple_choice',
        subject: 'Toan',
        option_1: 'A',
      },
    ];

    const result = transformExcelRowsToQuestions(rows);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.payloads).toHaveLength(0);
  });
});
