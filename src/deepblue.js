const cfg = require("../config.json");
const FenCommand = require("./commands/fen.js");
const HelpCommand = require("./commands/help.js");
const ArenaCommand = require("./commands/arena.js");
const LeagueCommand = require("./commands/league.js");
const StudyCommand = require("./commands/study.js");
const VariantsCommand = require("./commands/variants.js");
const LichessCommand = require("./commands/lichess.js");
const RemoveCommand = require("./commands/remove.js");

const RatingRoleManager = require("./ratingrolemanager.js");
const LichessTracker = require("./lichesstracker.js");

const ListCommand = require("./commands/list.js");
const ActiveListCommand = require("./commands/activelist.js");
const RankCommand = require("./commands/rank.js");
const ActiveRankCommand = require("./commands/activerank.js");

function DeepBlue(discord) {
    this.guild = discord.guilds.first();
    this.botChannel = this.guild.channels.find(c => c.name === cfg.deepblue.botChannelName);
    this.modChannel = this.guild.channels.find(c => c.name === cfg.deepblue.modChannelName);
    this.staffRole = this.guild.roles.find(val => val.name === cfg.deepblue.staffRole);
    this.discord = discord;
    this.ratingRoleManager = new RatingRoleManager(this);
    this.lichessTracker = new LichessTracker(this);

    discord.on("message", msg => this.onMessage(msg));

    discord.on("guildMemberRemove", member => {
        this.lichessTracker.remove(null, member);
    });
}

DeepBlue.prototype.onMessage = function(msg) {
    if(!cfg.deepblue.commandStartChars.includes(msg.content[0])) {
        return; //Not a command
    }
    let cmd = msg.content.substring(1).toLowerCase();

    if(cmd.startsWith("fen")) {
        FenCommand(this, msg);
    } else if(cmd.startsWith("help") || cmd.startsWith("dbhelp")) {
        HelpCommand(this, msg);
    } else if(cmd.startsWith("lichess") || cmd.startsWith("link")) {
        LichessCommand(this, msg);
    } else if(cmd.startsWith("rank") || cmd.startsWith("myrank")) {
        RankCommand(this, msg);
    } else if(cmd.startsWith("activerank") || cmd.startsWith("activemyrank") || cmd.startsWith("actrank") || cmd.startsWith("actmyrank")) {
        ActiveRankCommand(this, msg);
    } else if(cmd.startsWith("list")) {
        ListCommand(this, msg);
    } else if(cmd.startsWith("active") || cmd.startsWith("actlist")) {
        ActiveListCommand(this, msg);
    } else if(cmd === "remove" || cmd === "unlink") {
        RemoveCommand(this, msg);
    } else if(cmd === "arena") {
        ArenaCommand(this, msg);
    } else if(cmd === "league") {
        LeagueCommand(this, msg);
    } else if(cmd === "study") {
        StudyCommand(this, msg);
    } else if(cmd === "variants") {
        VariantsCommand(this, msg);
    }
    console.log(new Date().toString(), msg.member.nickname || msg.author.username, msg.content);
};

DeepBlue.prototype.sendMessage = function(channel, msg) {
    if(!channel) {
        channel = this.botChannel;
    }
    channel.send(msg)
    .then(sent => {
        sent.delete(cfg.deepblue.messageDeleteDelay).catch(console.error);
    }).catch(console.error);
};

DeepBlue.prototype.getMemberFromMention = function(text) {
    if(!text.startsWith("<@") || !text.endsWith(">")) {
        return null;
    }
    text = text.replace(/[^\d]/g, "");
    return this.guild.members.get(text);
};

module.exports = DeepBlue;