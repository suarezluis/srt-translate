import path from "path";
import os from "os";
import { readFileSync, writeFileSync } from "fs";
export enum RcFiles {
  bashrc = ".bashrc",
  zshrc = ".zshrc",
}

export default class Installation {
  bashrc: string | undefined;
  zshrc: string | undefined;
  constructor() {
    this.bashrc = this.getRcFile(RcFiles.bashrc);
    this.zshrc = this.getRcFile(RcFiles.zshrc);
  }

  getRcFile = (rcFile: RcFiles) => {
    try {
      return readFileSync(`${os.homedir()}/${rcFile}`, "utf-8");
    } catch (error) {
      return undefined;
    }
  };

  writeRcFile = (rcFile: RcFiles, content: string) => {
    writeFileSync(`${os.homedir()}/${rcFile}`, content, "utf-8");
  };

  install = () => {
    const scriptPath = path.join(__dirname, "../index.js");
    const alias = `\n# srt-translate\nalias srt-translate='node ${scriptPath}'`;
    if (this.bashrc) {
      const newRcFile = this.bashrc + alias;
      this.writeRcFile(RcFiles.bashrc, newRcFile);
      console.log(
        `Installation successful, restart your terminal or run:\n    source ${os.homedir()}/.${
          RcFiles.bashrc
        }`
      );
    }
    if (this.zshrc) {
      const newRcFile = this.zshrc + alias;
      this.writeRcFile(RcFiles.zshrc, newRcFile);
      console.log(
        `Installation successful, restart your terminal or run:\n    source ${os.homedir()}/${
          RcFiles.zshrc
        }`
      );
    }
  };
}
