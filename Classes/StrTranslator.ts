import { exec, execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync } from "fs";
import { randomUUID } from "crypto";
import { launch } from "puppeteer";
import chalk from "chalk";
import path from "path";
import * as dotenv from "dotenv";
import Status from "./Status";

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
  removeInputOnCompletion: boolean;

  constructor(
    inputFileName: string,
    outputFileName: string,
    removeInputOnCompletion = false
  ) {
    this.localDeployment = false;
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
    this.removeInputOnCompletion = removeInputOnCompletion;
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
    const writingTranslatedFileStatus = new Status(
      "Writing translated file",
      "Working"
    );
    this.writeContentToFile(this.outputFileName, translatedStrString);
    writingTranslatedFileStatus.complete();
    if (this.removeInputOnCompletion) {
      const removingInputFileStatus = new Status(
        "Removing input srt file",
        "Working"
      );
      unlinkSync(this.inputFileName);
      removingInputFileStatus.complete();
    }
    console.log("");
    process.exit(0);
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

    const localDeploymentStatus = new Status(
      "Deploying to localhost:3333",
      "Working"
    );
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
    localDeploymentStatus.complete();
  };

  testLocalPage = async () => {
    let status = false;

    const browserStatus = new Status("Launching browser", "Working");
    const browser = await launch();
    browserStatus.complete();

    const pageStatus = new Status("Opening page", "Working");
    const page = await browser.newPage();
    pageStatus.complete();
    const navigationStatus = new Status(
      `Navigating to ${this.localPageURL}`,
      "Working"
    );

    await page.goto(this.localPageURL);
    navigationStatus.complete();
    const checkingRunIdStatus = new Status(
      "Checking if Run ID is live on localPage",
      "Working"
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
        checkingRunIdStatus.complete();
        status = true;
        await browser.close();
      } else {
        checkingRunIdStatus.update(
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
    const gitHubPagesDeploymentStatus = new Status(
      "Deploying to GitHub Pages",
      "Working"
    );

    const output = execSync("npm run deploy");
    if (output.toString().includes("ERROR")) {
      gitHubPagesDeploymentStatus.update("Error\n", "red");
      console.error(
        "An error occurred while deploying to GitHub Pages, see deployment.log for more details"
      );
      writeFileSync(`deployment.log`, output.toString(), "utf-8");
    } else {
      gitHubPagesDeploymentStatus.complete();
    }
  };

  testGithubPages = async () => {
    let status = false;
    const browserStatus = new Status("Launching browser", "Working");

    const browser = await launch();
    browserStatus.complete();
    const pageStatus = new Status("Opening page", "Working");

    const page = await browser.newPage();
    pageStatus.complete();
    const navigationStatus = new Status(
      `Navigating to ${this.githubPagesURL}`,
      "Working"
    );

    await page.goto(this.githubPagesURL);
    navigationStatus.complete();
    let count = 1;
    const checkingRunIdStatus = new Status(
      "Checking if Run ID is live on github pages",
      "Working"
    );
    while (!status) {
      await page.waitForNetworkIdle();
      await page.waitForSelector("#run-id");
      const gitHubRunId = await page.$eval("#run-id", (el) => {
        const element = el as HTMLElement;
        return element.innerText;
      });
      if (this.runId === gitHubRunId) {
        checkingRunIdStatus.complete();
        status = true;
        await browser.close();
      } else {
        checkingRunIdStatus.update(
          stringToEmoji(`Retrying ${count} time${count > 1 ? "s" : ""}`),
          "yellow"
        );
        await this.delay(5000);
        await page.reload();
        count++;
      }
    }
  };

  delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  translatePage = async (url: string) => {
    const browserStatus = new Status("Launching browser", "Waiting");
    const browser = await launch();
    browserStatus.complete();
    const pageStatus = new Status("Opening page", "Waiting");
    const page = await browser.newPage();
    pageStatus.complete();
    const navigationStatus = new Status(
      `Navigating to translated URL`,
      "Waiting"
    );
    await page.goto(url);
    await page.waitForNetworkIdle();
    await page.waitForSelector("#run-id");
    navigationStatus.complete();
    const windowHeight = await page.evaluate(() => window.innerHeight);
    const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
    let currentHeight = 0;
    const scrollStatus = new Status("Scrolling translation page", "0%");

    for (let i = 0; i <= scrollHeight; i += windowHeight) {
      await page.evaluate((i) => {
        window.scrollTo(0, i);
        return i;
      }, i);

      await this.delay(50);
      currentHeight += windowHeight;
      const percentage = parseInt(`${(currentHeight / scrollHeight) * 100}`);
      scrollStatus.update(stringToEmoji(percentage + "%"), "yellow");
    }
    scrollStatus.complete();
    const scriptRemovalStatus = new Status("Removing scripts", "Working");
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
    scriptRemovalStatus.complete();
    const writingTranslatedHTMLStatus = new Status(
      "Writing translated HTML",
      "Working"
    );
    const pageContent = await page.content();
    this.writeContentToFile(
      path.join(this.pathToDist, "translated.html"),
      pageContent
    );
    this.translatedHTML = pageContent;
    this.srtTranslatedObjects = srtTranslatedObjects;
    writingTranslatedHTMLStatus.complete();
    const closingBrowserStatus = new Status("Closing browser", "Working");
    await browser.close();
    closingBrowserStatus.complete();
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

const stringToEmoji = (string: string) => {
  let newString = "";
  const stringArray = string.split("");
  for (const char of stringArray) {
    switch (char) {
      case "1":
        newString += "1️⃣ ";
        break;
      case "2":
        newString += "2️⃣ ";
        break;
      case "3":
        newString += "3️⃣ ";
        break;
      case "4":
        newString += "4️⃣ ";
        break;
      case "5":
        newString += "5️⃣ ";
        break;
      case "6":
        newString += "6️⃣ ";
        break;
      case "7":
        newString += "7️⃣ ";
        break;
      case "8":
        newString += "8️⃣ ";
        break;
      case "9":
        newString += "9️⃣ ";
        break;
      case "0":
        newString += "0️⃣ ";
        break;
      default:
        newString += char;
        break;
    }
  }
  return newString;
};
