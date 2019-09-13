const cfg = require("../../config.json");
const DataManager = require("../datamanager.js");
const PerformanceBreakdown = require("../perf.js");

function ActiveListCommand(deepblue, msg) {
    if(cfg.list.channels) {
        if(!cfg.list.channels.includes(msg.channel.name)) {
            return; //Not in the right channel
        }
    }

    let split = msg.content.toLowerCase().split(/\s+/);
    let page = 1;
    let type = null;

    if(split.length === 2) {
        //!list [page]
        //!list [type]
        page = parseInt(split[1]);
        if(isNaN(page) || page.toString() !== split[1] || PerformanceBreakdown.toPerfName(split[1]) !== split[1]) {
            type = split[1];
            page = 1;
        }
    } else if(split.length === 3) {
        //!list [type] [page]
        type = split[1];
        page = parseInt(split[2]);
        if(isNaN(page) || page.toString() !== split[2]) {
            deepblue.sendMessage(msg.channel, "Invalid page.");
            msg.delete(cfg.deepblue.messageDeleteDelay).catch(console.error);
            return;
        }
    }

    let allData = new DataManager(cfg.lichessTracker.dataFile).getData();
    let collectedData = Object.keys(allData);

    //Only active members are allowed to be listed
    let now = Date.now();
    if(allData[msg.member.id]) {
        //Make sure to immediatly allow sender to be shown
        allData[msg.member.id].lastMessageAt = now;
    }
    collectedData = collectedData.filter((uid) => {
        if(allData[uid].lastMessageAt) {
            let d = allData[uid].lastMessageAt + cfg.list.inactiveThreshold;
            return d > now;
        }
        return false;
    });

    //Apply penalty
    collectedData.forEach((uid) => {
        for(let type in allData[uid].perfs) {
            if(allData[uid].perfs[type].penalty) {
                allData[uid].perfs[type].rating -= allData[uid].perfs[type].penalty;
            }
        }
    });
    if(type) {
        type = PerformanceBreakdown.toPerfName(type);
        collectedData = collectedData.filter((uid) => {
            //If there is that type, and not provisional
            return allData[uid].perfs[type] && !allData[uid].perfs[type].prov;
        });
    }

    if(collectedData.length === 0) {
        deepblue.sendMessage(msg.channel, "Couldn't find listing for that chess variant.");
        msg.delete(cfg.deepblue.messageDeleteDelay).catch(console.error);
        return;
    }

    collectedData = collectedData.map((uid) => {
        //Add max rating
        allData[uid].maxRating = PerformanceBreakdown.getMaxRating(allData[uid].perfs, type || cfg.deepblue.perfsForRoles);
        allData[uid].uid = uid;
        return allData[uid];
    }); //Turn into data array

    //Remove provisional maxRating, means provisional role
    collectedData = collectedData.filter((data) => {
        return isFinite(data.maxRating.rating);
    });

    collectedData.sort((a, b) => {
        return b.maxRating.rating - a.maxRating.rating;
    });

    let perPage = cfg.list.perPage;
    let pages = Math.ceil(collectedData.length / perPage);

    if(page < 1) {
        page = 1;
    } else if(page > pages) {
        page = pages;
    }

    let output = {
        "embed": {
            "title": `Current standings${type ? ` for ${PerformanceBreakdown.perfToReadable(type)}` : ""}. Page ${page}/${pages}:`,
            "color": cfg.deepblue.embedColor,
            "description": ""
        }
    };

    let startPos = page * perPage - perPage;
    let endPos = startPos + perPage;
    let penaltyAdded = false;

    for(let i = startPos; i < collectedData.length && i < endPos; i++) {
        let member = deepblue.guild.members.get(collectedData[i].uid);
        let nick = member.nickname || member.user.username;
        let url = cfg.lichessTracker.lichessProfileUrl.replace("%username%", collectedData[i].username);
        let typeStr = `(${collectedData[i].maxRating.type})`;
        let penalty = "";

        if(collectedData[i].maxRating.penalty) {
            penalty = " ▼";
            penaltyAdded = true;
        }

        output.embed.description += `${(i + 1)}: **${collectedData[i].maxRating.rating}** [${nick}](${url}) ${typeStr}${penalty}\n`;
    }

    if(penaltyAdded) {
        output.embed.description += `\n▼ — Penalty of ${cfg.lichessTracker.highRatingDeviationPenalty}.`
        output.embed.description += ` RD is above ${cfg.lichessTracker.ratingDeviationThreshold}.`;
    }

    deepblue.sendMessage(msg.channel, output);
    msg.delete(cfg.deepblue.messageDeleteDelay).catch(console.error);
}

module.exports = ActiveListCommand;