import { Readable } from "node:stream";
export default class QueryStream extends Readable {
  constructor(statement, variables, pageSize = 10, maxResults = Infinity) {
    super({ objectMode: true, highWaterMark: pageSize });

    if (statement.constructor.name !== "Statement") {
      throw TypeError(
        "Invalid argument passed to `statement` expected db.prepare statement"
      );
    }

    if (typeof variables !== "object" || Array.isArray(variables)) {
      throw TypeError("Invalid argument passed to `variables` expected object");
    }

    this.statement = statement;
    this.variables = variables;
    this.pageSize = pageSize;
    this.maxResults = maxResults;

    this.offset = 0;

    console.log(statement);
  }

  _remaining() {
    if (this.offset > this.maxResults) {
      return 0;
    }

    return this.maxResults - this.offset;
  }

  _getVariables() {
    return {
      ...this.variables,
      limit: Math.min(this.pageSize + 1, this._remaining()),
      offset: this.offset,
    };
  }
  _read(size) {
    console.log("READ", { size, readable: this.readableLength });

    if (size < this.readableLength) {
      return;
    }

    if (this.readableLength > this.readableHighWaterMark) {
      this.pause();
      return;
    }

    const results = this.statement.all(this._getVariables());
    const rows = results.slice(0, this.pageSize);
    for (let row of rows) {
      this.push(row);
      this.offset++;
    }

    if (this._remaining() == 0) {
      this.push(null);
    }
  }
}
