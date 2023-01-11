import { exec, execSync } from "child_process";
import { writeFileSync, readFileSync } from "fs";
import { randomUUID } from "crypto";
import { launch } from "puppeteer";
import chalk from "chalk";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "..", ".env") });
export interface SrtObject {
  number: string;
  time: string;
  text: string;
}

const localServerURL = process.env.LOCAL_SERVER_URL;
const translatedLocalPageURL = process.env.TRANSLATED_LOCAL_SERVER_URL;
const githubPagesURL = process.env.GITHUB_PAGES_URL;
const translatedGithubPagesURL = process.env.TRANSLATED_GITHUB_PAGES_URL;
export default class SrtTranslator {
  localDeployment: boolean;
  localPageURL: string;
  githubPagesURL: string;
  translatedLocalPageURL: string;
  translatedGithubPagesURL: string;
  runId: string;
  srtTranslatedObjects: any[];
  translatedHTML: string;
  inputFileName: string;
  outputFileName: string;
  inputFileContent: string;
  inputStrObjects: any[];
  inputSrtHTML: string;
  childProcess: any;
  pathToDist: string;

  constructor(inputFileName: string, outputFileName: string) {
    this.localDeployment = true;
    this.pathToDist = path.join(__dirname, "..", "dist");
    this.localPageURL = localServerURL || "";
    this.githubPagesURL = githubPagesURL || "";
    this.translatedLocalPageURL = translatedLocalPageURL || "";
    this.translatedGithubPagesURL = translatedGithubPagesURL || "";
    this.runId = randomUUID();
    this.srtTranslatedObjects = [];
    this.translatedHTML = "";
    this.inputFileName = inputFileName;
    this.outputFileName = outputFileName;
    this.inputFileContent = this.readFile(this.inputFileName);
    this.inputStrObjects = this.fileContentToSrtObjects(this.inputFileContent);
    this.inputSrtHTML = this.convertStrObjectsToHTML(this.inputStrObjects);
    this.run();
  }

  run = async () => {
    this.writeContentToFile(
      path.join(this.pathToDist, "index.html"),
      this.inputSrtHTML
    );
    if (this.localDeployment) {
      await this.deployLocally();
      await this.testLocalPage();
      await this.translatePage(this.translatedLocalPageURL);
      await this.childProcess.kill();
    } else {
      this.deployToGithubPages();
      await this.testGithubPages();
      await this.translatePage(this.translatedGithubPagesURL);
    }
    const translatedStrString = this.srtObjectToSrtString(
      this.srtTranslatedObjects
    );
    this.printStatus("Writing translated file", "Working", "yellow");
    this.writeContentToFile(this.outputFileName, translatedStrString);
    this.printStatus("Writing translated file", "Done", "green", true);
    this.printStatus(`\n${this.outputFileName}`, "Complete\n", "green", true);
  };

  readFile(fileName: string) {
    const fileContent = readFileSync(fileName, "utf-8");
    return fileContent.replace(/\r/g, "");
  }

  fileContentToSrtObjects(fileContent: string) {
    const fragments = fileContent.split("\n\n");
    const srtObjects: SrtObject[] = [];
    for (const fragment of fragments) {
      const lines = fragment.split("\n");
      const [number, time, firstLineOfText, secondLineOfText] = lines;
      const text = [firstLineOfText, secondLineOfText || ""].join(" ").trim();
      srtObjects.push({ number, time, text });
    }
    return srtObjects;
  }
  convertStrObjectsToHTML(srtObjects: SrtObject[]) {
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${this.runId}</title>
    </head>
    <body>
      <div id="run-id">${this.runId}</div>`;
    for (const srtObject of srtObjects) {
      html += `        
        <br>
        <br>
        <div class="srt-object">
          <div class="number">${srtObject.number}</div>
          <div class="time">${srtObject.time}</div>
          <div class="text">${srtObject.text}</div>
        </div>
        <br>
        <br>`;
    }
    html += `
    </body>
    </html>
    `;
    return html;
  }

  writeContentToFile = (fileName: string, content: string) => {
    writeFileSync(fileName, content, "utf-8");
  };

  deployLocally = async () => {
    const pathToServe = path.join(__dirname, "..", "dist", "index.html");
    this.printStatus("Deploying to localhost:3333", "Working", "yellow");
    this.childProcess = exec(
      `live-server --port=3333 --no-browser ${pathToServe}`,
      (error, stdout, stderr) => {
        // console.log(stdout);
        console.log(stderr);
        if (error !== null) {
          // console.log(`exec error: ${error}`);
        }
      }
    );
    await this.delay(1000);
    this.printStatus("Deploying to localhost:3333", "Deployed", "green", true);
  };

  testLocalPage = async () => {
    let status = false;

    this.printStatus("Launching browser", "Waiting", "yellow");
    const browser = await launch();
    this.printStatus("Launching browser", "Done", "green", true);

    this.printStatus("Opening page", "Waiting", "yellow");
    const page = await browser.newPage();
    this.printStatus("Opening page", "Done", "green", true);
    this.printStatus(`Navigating to ${this.localPageURL}`, "waiting", "yellow");
    await page.goto(this.localPageURL);
    this.printStatus(
      `Navigating to ${this.localPageURL}`,
      "Done",
      "green",
      true
    );
    let count = 1;
    while (!status) {
      await page.waitForNetworkIdle();
      await page.waitForSelector("#run-id");
      const localPageRuID = await page.$eval("#run-id", (el) => {
        const element = el as HTMLElement;
        return element.innerText;
      });
      if (this.runId === localPageRuID) {
        this.printStatus(
          "Checking if Run ID is live on localPage",
          "Done",
          "green",
          true
        );
        status = true;
        await browser.close();
      } else {
        this.printStatus(
          "Checking if Run ID is live on localPage",
          `Retrying ${count} time${count > 1 ? "s" : ""}`,
          "yellow"
        );
        await this.delay(5000);
        await page.reload();
        count++;
      }
    }
  };

  deployToGithubPages = () => {
    this.printStatus("Deploying to GitHub Pages", "Working", "yellow");
    const output = execSync("npm run deploy");
    this.printStatus("Deploying to GitHub Pages", "Deployed", "green", true);
    if (output.toString().includes("ERROR")) {
      this.printStatus("Deploying to GitHub Pages", "Error", "red", true);
      console.error(
        "An error occurred while deploying to GitHub Pages, see deployment.log for more details"
      );
      writeFileSync(`deployment.log`, output.toString(), "utf-8");
    }
  };

  testGithubPages = async () => {
    let status = false;

    this.printStatus("Launching browser", "Waiting", "yellow");
    const browser = await launch();
    this.printStatus("Launching browser", "Done", "green", true);

    this.printStatus("Opening page", "Waiting", "yellow");
    const page = await browser.newPage();
    this.printStatus("Opening page", "Done", "green", true);

    this.printStatus(
      `Navigating to ${this.githubPagesURL}`,
      "waiting",
      "yellow"
    );
    await page.goto(this.githubPagesURL);
    this.printStatus(
      `Navigating to ${this.githubPagesURL}`,
      "Done",
      "green",
      true
    );
    let count = 1;
    while (!status) {
      await page.waitForNetworkIdle();
      await page.waitForSelector("#run-id");
      const gitHubRunId = await page.$eval("#run-id", (el) => {
        const element = el as HTMLElement;
        return element.innerText;
      });
      if (this.runId === gitHubRunId) {
        this.printStatus(
          "Checking if Run ID is live on github pages",
          "Done",
          "green",
          true
        );
        status = true;
        await browser.close();
      } else {
        this.printStatus(
          "Checking if Run ID is live on github pages",
          `Retrying ${count} time${count > 1 ? "s" : ""}`,
          "yellow"
        );
        await this.delay(5000);
        await page.reload();
        count++;
      }
    }
  };

  printStatus = (
    body: string,
    status: string,
    color: string,
    newLine: boolean = false
  ) => {
    let setColor = (body: string) => {};
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
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    process.stdout.write(`${body} ${setColor(status)} ${newLine ? "\n" : ""}`);
  };

  delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  translatePage = async (url: string) => {
    const browser = await launch();
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitForNetworkIdle();
    await page.waitForSelector("#run-id");
    const windowHeight = await page.evaluate(() => window.innerHeight);
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentHeight = 0;
    this.printStatus("Scrolling translation page", "0%", "yellow");

    for (let i = 0; i <= scrollHeight; i += windowHeight) {
      await page.evaluate((i) => {
        window.scrollTo(0, i);
        return i;
      }, i);

      await this.delay(50);
      currentHeight += windowHeight;
      const percentage = parseInt(`${(currentHeight / scrollHeight) * 100}`);
      this.printStatus(
        "Scrolling translation page",
        percentage + "%",
        percentage === 100 ? "green" : "yellow"
      );
    }

    const srtTranslatedObjects = await page.evaluate(() => {
      // remove scripts to avoid grabbing original text from the page
      let scripts = document.getElementsByTagName("script");
      while (scripts.length > 0) {
        for (const script of scripts) {
          script.remove();
        }
        scripts = document.getElementsByTagName("script");
      }
      // remove iframe
      let frames = document.getElementsByTagName("iframe");
      for (const iframe of frames) {
        iframe.remove();
      }
      // remove all elements that are original text
      let originalText = document.getElementsByClassName("original-text");
      while (originalText.length > 0) {
        for (const text of originalText) {
          text.remove();
        }
        originalText = document.getElementsByClassName("original-text");
      }

      let data: SrtObject[] = [];

      let elements = document.getElementsByClassName("srt-object");
      for (var element of elements) {
        const numberDiv = element.children[0] as HTMLElement;
        const timeDiv = element.children[1] as HTMLElement;
        const textDiv = element.children[2] as HTMLElement;

        const number = numberDiv.innerText;
        const time = timeDiv.innerText;
        let text = textDiv.innerText;

        if (text.length > 30) {
          const array = text.split(" ");
          const numberOfWords = array.length;
          const halfWay = Math.ceil(numberOfWords / 2);
          const firstHalf = array.slice(0, halfWay).join(" ");
          const secondHalf = array.slice(halfWay).join(" ");
          text = `${firstHalf}\n${secondHalf}`;
        }

        data.push({ number, time, text });
      }
      return data;
    });
    const pageContent = await page.content();
    this.writeContentToFile(
      path.join(this.pathToDist, "translated.html"),
      pageContent
    );
    this.translatedHTML = pageContent;
    this.srtTranslatedObjects = srtTranslatedObjects;
    await browser.close();
  };

  srtObjectToSrtString = (srtObjects: SrtObject[]) => {
    let strString = "";
    for (const srtObject of srtObjects) {
      const { number, time, text } = srtObject;
      if (number && time && text) {
        strString += `${number}\n${time}\n${text}\n\n`;
      }
    }
    return strString;
  };
}
