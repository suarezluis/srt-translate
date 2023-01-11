import axios from "axios";
import path from "path";
import StrExtractor from "./Classes/StrExtractor";
import Installation from "./Classes/Install";
import SrtTranslator from "./Classes/StrTranslator";

const currentDirectory = process.cwd();
const command = process.argv[2];
const inputFile = path.join(currentDirectory, process.argv[2] || "");
const outputFile = path.join(currentDirectory, process.argv[3] || "");

const main = async () => {
  // console.log(currentDirectory);
  // console.log(inputFile);
  // console.log(outputFile);
  // return;
  switch (command) {
    case "install":
      const installation = new Installation();
      installation.install();
      return;
    case "-h" || "--help":
      console.log(
        `Usage: srt-translate [command] [input file] [output file]\n
                [command] can be one of the following:
                -h, --help: show this help message
                install: install the srt-translate command into rc file
        `
      );
      return;
  }
  const inputExtension = inputFile.split(".").pop();
  if (inputExtension === "srt") {
    const translator = new SrtTranslator(inputFile, outputFile);
  } else {
    const extraction = new StrExtractor(inputFile);
    extraction.extract();
    const translator = new SrtTranslator(
      extraction.outputFile,
      extraction.outputFile
    );
  }
};

main();

// const main = async () => {
//   const options = {
//     method: "GET",
//     url: "https://api.opensubtitles.com/api/v1/subtitles",
//     params: {
//       query: "Yellowstone",
//       season_number: "5",
//       episode_number: "8",
//       languages: "en",
//     },
//     headers: {
//       "Content-Type": "application/json",
//       "Api-Key": "LrzMB5HQ7BgAN7sskO91mommP1ag3EBf",
//     },
//   };

//   axios
//     .request(options)
//     .then(function (response) {
//       writeFileSync("subtitles.json", JSON.stringify(response.data));
//       console.log(response.data);
//     })
//     .catch(function (error) {
//       console.error(error);
//     });
// };

// main();
