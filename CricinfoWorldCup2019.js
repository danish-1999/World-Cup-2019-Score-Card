/*the purpose of thuis project is to extract information of world cup 2019 from cricinfo and printing the result 
in the form of excel and pdf score cards.
the real purpose of this project is to learn how to extract information and to be familier with JS.
A very good reason to ever make a project is to have great fun.   
*/

// npm install minimist
// npm install axios
// npm install jsdom
// npm install excel4node
// npm install pdf-lib
// node CricinfoWorldCup2019.js --excel=WorldCup.csv --dataFolder=WorldCup2019 --source=https://www.espncricinfo.com/series/icc-cricket-world-cup-2019-1144415/match-results


let minimist = require("minimist");
let axios = require("axios");
let jsdom = require("jsdom");
let excel = require("excel4node");
let pdf = require("pdf-lib");
let fs = require("fs");
let path = require("path");

// download using axios
// read using jsdom
// make excel using excel4node
// make pdf using pdf-lib

let args = minimist(process.argv);
let prmtodnld = axios.get(args.source);
prmtodnld.then(function (response) {
    let html = response.data;
    let dom = new jsdom.JSDOM(html);
    let document = dom.window.document;

    let matches = [];
    let matchScoreDivs = document.querySelectorAll("div.match-score-block");
    for (let i = 0; i < matchScoreDivs.length; i++) {
        let match = {

        };
        let namePs = matchScoreDivs[i].querySelectorAll("p.name");
        match.t1 = namePs[0].textContent;
        match.t2 = namePs[1].textContent;
        let scoreSpans = matchScoreDivs[i].querySelectorAll("div.score-detail > span.score");
        if (scoreSpans.length == 2) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = scoreSpans[1].textContent
        }
        else if (scoreSpans.length == 1) {
            match.t1s = scoreSpans[0].textContent;
            match.t2s = "";
        }
        else {
            match.t1s = "";
            match.t2s = "";
        }
        let resultspan = matchScoreDivs[i].querySelector("div.status-text > span");
        match.result = resultspan.textContent;
        matches.push(match);
    }
    let matchesJSON = JSON.stringify(matches);
    fs.writeFileSync("matches.json", matchesJSON, "utf-8");

    let teams = [];
    for (let i = 0; i < matches.length; i++) {
        PutTeamInTeamsArrayIfMissing(teams, matches[i]);
    }
    for (let i = 0; i < matches.length; i++) {
        PutMatchInAppropriateTeam(teams, matches[i]);
    }
    let teamJSON = JSON.stringify(teams);
    fs.writeFileSync("teams.json", teamJSON, "utf-8");

    createExcelFile(teams);
    createPDFfile(teams);

}).catch(function (err) {
    console.log(err);
})

function createPDFfile(teams) {
    fs.mkdirSync(args.dataFolder);
    for (let i = 0; i < teams.length; i++) {
        let teamFN = path.join(args.dataFolder, teams[i].name);
        fs.mkdirSync(teamFN);
        for (j = 0; j < teams[i].matches.length; j++) {
            let matchFN = path.join(teamFN, teams[i].matches[j].vs);
            createScoreCard(teams[i].name, teams[i].matches[j], matchFN);
        }
    }
    function createScoreCard(teamName, match, matchFN) {
        let t1 = teamName;
        let t2 = match.vs;
        let t1s = match.selfScore;
        let t2s = match.oppScore;
        let result = match.result;

        let originalBytes = fs.readFileSync("NewTemplate.pdf");
        let prmtodoc = pdf.PDFDocument.load(originalBytes);
        prmtodoc.then(function (pdf) {
            let page = pdf.getPage(0);
            page.drawText(t1, {
                x: 230,
                y: 655,
                size: 15
            })
            page.drawText(t2, {
                x: 230,
                y: 625,
                size: 15
            })
            page.drawText(t1s, {
                x: 230,
                y: 595,
                size: 15
            })
            page.drawText(t2s, {
                x: 230,
                y: 565,
                size: 15
            })
            page.drawText(result, {
                x: 230,
                y: 535,
                size: 15
            })
            let FinalBytesPrm = pdf.save();
            FinalBytesPrm.then(function (changedBytes) {
                if(fs.existsSync(matchFN + ".pdf")==true){
                    fs.writeFileSync(matchFN + "(2nd match).pdf", changedBytes);
                }else{
                    fs.writeFileSync(matchFN + ".pdf", changedBytes);
                }
            })
        })
    }
}

function createExcelFile(teams) {
    let wb = new excel.Workbook();
    for (let i = 0; i < teams.length; i++) {
        let sheet = wb.addWorksheet(teams[i].name);
        sheet.cell(1, 1).string("VS");
        sheet.cell(1, 2).string("Self Score");
        sheet.cell(1, 3).string("Opp Score");
        sheet.cell(1, 4).string("Result");

        for (let j = 0; j < teams[i].matches.length; j++) {
            sheet.cell(j + 2, 1).string(teams[i].matches[j].vs);
            sheet.cell(j + 2, 2).string(teams[i].matches[j].selfScore);
            sheet.cell(j + 2, 3).string(teams[i].matches[j].oppScore);
            sheet.cell(j + 2, 4).string(teams[i].matches[j].result);
        }

    }
    wb.write(args.excel);
}

function PutTeamInTeamsArrayIfMissing(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    if (t1idx == -1) {
        teams.push({
            name: match.t1,
            matches: []
        });

    }
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    if (t2idx == -1) {
        teams.push({
            name: match.t2,
            matches: []
        });

    }
}

function PutMatchInAppropriateTeam(teams, match) {
    let t1idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t1) {
            t1idx = i;
            break;
        }
    }
    let team1 = teams[t1idx];
    team1.matches.push({
        vs: match.t2,
        selfScore: match.t1s,
        oppScore: match.t2s,
        result: match.result
    })
    let t2idx = -1;
    for (let i = 0; i < teams.length; i++) {
        if (teams[i].name == match.t2) {
            t2idx = i;
            break;
        }
    }
    let team2 = teams[t2idx];
    team2.matches.push({
        vs: match.t1,
        selfScore: match.t2s,
        oppScore: match.t1s,
        result: match.result
    })
}