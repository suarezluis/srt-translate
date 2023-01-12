import { writeFileSync } from "fs";
import { execSync, spawn } from "child_process";

export default class StrExtractor {
  inputFile: string;
  outputFile: string;
  constructor(inputFile: string) {
    this.inputFile = inputFile;
    this.outputFile = inputFile.split(".").slice(0, -1).join(".") + ".srt";
  }
  extract = () => {
    execSync(`ffmpeg -y -i ${this.inputFile} -f srt ${this.outputFile}`, {
      stdio: "pipe",
    });
  };
  listStreams = () => {
    const ls = execSync(`ffprobe ${this.inputFile}`, {
      encoding: "utf8",
    });
    const re = /Stream #([0-9]*):([0-9]*)\(([a-z]*)\): ([a-zA-Z]*)/;
    const stdOut = ls.toString();
    writeFileSync("ffprobe.txt", stdOut);
    // console.log(ls.toString());
  };
  extractStream = (stream: number) => {
    execSync(
      `ffmpeg -y -i ${this.inputFile} -map 0:s:${stream} ${this.outputFile}`
    );
  };
}
