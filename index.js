const program = require('commander');
const ppt = require('puppeteer');

const Scraper = require('./lib/Scraper');
const IssueManager = require('./lib/IssueManager');
const UserManager = require('./lib/UserManager');

const thisYear = new Date().getFullYear().toString();

program
    .usage('-y year')
    .option('-y, --year [value]', 'set target year to scrape, like 2018. Default value is This year', thisYear)
    .option('-v, --view', 'set this option when you want to see GUI')
    .option('-f, --force', 'force start from scracth')
    .parse(process.argv);

const targetYear = program.year || thisYear;
const isHeadless = !program.view;
// scrape mode, scrape from scratch or resume from last time
const isForce = program.force?  true: false;

const puppenomist = async () => {
    const userManager = new UserManager();
    await userManager.askAccount();

    const browser = await ppt.launch({ headless: isHeadless });
    let page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 1000 });

    await userManager.login(page).catch((error) => {
        console.log(error.message);
    });
    if(!userManager.isLogined) {
        console.log("terminating...");
        await browser.close();
        process.exit(1);        
    }

    const scrapeMode = IssueManager.decideMode(isForce, targetYear);
    const issueMgr = new IssueManager(scrapeMode, targetYear);
    await issueMgr.selectTarget(page).catch((err) => {throw new Error(err.message)});

    for (link of issueMgr.issueLinks) {
        issueMgr.setStarted(link);
        const scraper = new Scraper(page, link);
        await scraper.extractArticleLinks();
        await scraper.scrape();
        issueMgr.setDone(link);
    }

    await browser.close();
};

(async () => {
    await puppenomist();
})();

module.exports = puppenomist;