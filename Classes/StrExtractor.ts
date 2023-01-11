import { execSync } from "child_process";

export default class StrExtractor {
  inputFile: string;
  outputFile: string;
  constructor(inputFile: string) {
    this.inputFile = inputFile;
    this.outputFile = inputFile.split(".").slice(0, -1).join(".") + ".srt";
  }
  extract = () => {
    console.log(this.outputFile);
    execSync(
      `ffmpeg -y -i ${this.inputFile} -f srt ${this.outputFile.replace(
        /\ /g,
        " "
      )}`,
      {
        stdio: "pipe",
      }
    );
  };
  listStream = () => {
    execSync(`ffprobe ${this.inputFile}`);
  };
  extractStream = (stream: number) => {
    execSync(
      `ffmpeg -y -i ${this.inputFile} -map 0:s:${stream} ${this.outputFile}`
    );
  };
}
