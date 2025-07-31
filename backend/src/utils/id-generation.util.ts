// src/utils/id-generation.util.ts
export class IdGenerationUtil {
  private static lastNumber = 0;

  static generateFeedbackId(): string {
    this.lastNumber += 1;
    const paddedNumber = this.lastNumber.toString().padStart(4, '0');
    return `AQA-${paddedNumber}`;
  }

  static initialize(lastId: number) {
    this.lastNumber = lastId || 0;
  }
}