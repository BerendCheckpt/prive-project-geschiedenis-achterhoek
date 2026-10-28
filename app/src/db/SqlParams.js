/** Collects query parameters and hands out $n placeholders. */
export class SqlParams {
  constructor() {
    this.values = [];
  }

  add(value) {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}
