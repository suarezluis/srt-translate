import chalk from "chalk";

export default class Status {
  body: string;
  status: string;
  color: string;

  constructor(body: string, status: string) {
    this.body = body;
    this.status = status;
    this.color = "yellow";
    this.create(body, status);
  }
  setColor = (color: string, status: string) => {
    let setColor = chalk.white;
    switch (color) {
      case "red":
        setColor = chalk.red;
        break;
      case "green":
        setColor = chalk.green;
        break;
      case "yellow":
        setColor = chalk.yellow;
        break;
      default:
        setColor = chalk.white;
        break;
    }
    return setColor(status);
  };
  create = (body: string, status: string) => {
    this.body = body;
    this.status = status;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${this.body} ${this.setColor(this.color, this.status)}`
    );
  };
  update = (status: string, color: string) => {
    this.status = status;
    this.color = color;
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${this.body} ${this.setColor(this.color, this.status)}`
    );
  };
  complete = () => {
    this.status = "✅";
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(
      `${this.setColor("green", this.body)} ${this.setColor(
        "green",
        this.status
      )} \n`
    );
  };
}
