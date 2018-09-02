const request = require('request-promise-native');
const AWS = require('aws-sdk');
const moment = require('moment');
const fs = require('fs');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const config = require('./config.json');
let status = null;

AWS.config.update({ region: config.awsRegion, accessKeyId: config.awsAccessKey, secretAccessKey: config.awsSecretKey });

async function run() {
    for (let watcher of config.watchers) {
        const url = watcher.url;
        const headers = watcher.headers;
        const matchText = watcher.matchText;

        if (status[url] && status[url].notified) {
            // if we've already notified for this url then skip it
            continue;
        }

        console.log(formatLog(`Fetching ${url}`));
        const doc = await fetchPage(url, headers);
        console.log(formatLog(`Searching ${url} for ${matchText}`));
        if (searchForMatch(doc, matchText)) {
            console.log(formatLog(`Found a match! Notifying ${config.awsTopicArn}`));
            try {
                const message = config.message
                    .replace('${matchText}', matchText)
                    .replace('${url}', url);
                await notifyMatch(config.awsTopicArn, message);
                console.log(formatLog(`Notification sent.`));
                if (!status[url]) {
                    status[url] = {};
                }
                status[url].notified = true;
                await storeStatus();
            } catch (e) {
                console.error(formatLog(`Failed to send notification: ` + e));
            }
        } else {
            console.log(formatLog(`No matches found.`));
        }
    }
}

async function fetchPage(url, headers) {
    const body = await request({ uri: url, headers: headers ? JSON.parse(headers) : undefined, maxRedirects: 5 });
    return body;
}

function searchForMatch(doc, matchText) {
    const matched = doc.toLowerCase().indexOf(matchText.toLowerCase()) !== -1;
    if (matched) {
        return true;
    }
    return false;
}

async function notifyMatch(topicARN, message) {
    const params = {
        Message: message,
        TopicArn: topicARN
    };
    const data = await new AWS.SNS({ apiVersion: '2010-03-31' }).publish(params).promise();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function formatLog(message) {
    return `[${moment().format('LL @ LT')}] ${message}`;
}

async function loadStatus() {
    let data = null;
    try {
        data = await readFile('./status.json', 'utf8');
    } catch (e) {
        status = {};
        await storeStatus();
    }
    if (data) {
        status = JSON.parse(data);
    }
}

async function storeStatus() {
    await writeFile('./status.json', JSON.stringify(status), 'utf8');
}

(async () => {
    while (true) {
        try {
            await loadStatus();
            await run();
        } catch (err) {
            console.error(err);
        }
        await sleep(config.interval);
    }
})();
