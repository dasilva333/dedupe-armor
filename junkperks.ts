const _ = require("lodash");
const fs = require("fs");

/* this converts the csv output to the same internal format used by the DIM plugin */
const stores = require("./dimStorageShim");
/* this is placeholder items to have a reference native DIM object available 
const placeholderFivePa = require("./dimFivePaShim");
const placeholderFourPa = require("./dimFourPaShim"); */
//return console.log("item", stores[0].items[0])
const jpf = require("./junkPerkFilter.js");

let _junkPerkMaps = jpf.initJunkPerks(stores);
let dupeReport = [];

function junkperk(item) {
    return jpf.junkPerkFilter(item, dupeReport);
}

// test one armor piece
// junkperk(placeholderFivePa);

/* test all armor pieces */
_.each(_junkPerkMaps.legendaryArmor, function (armorItem) {
    junkperk(armorItem);
});

var totalCount = "total junk items:" + dupeReport.length + "\n\n";

var compiledJunkItemTemplate = _.template(jpf.junkPerkConfig.junkItemTemplate);
var compiledJunkReasonTemplate = _.template(jpf.junkPerkConfig.junkReasonTemplate);

//sort items by type for both json/text reports
dupeReport = _.sortBy(dupeReport, 'type');

var dupeReportText = _.map(dupeReport, (junkItem) => {
    return compiledJunkItemTemplate(junkItem) + "\n" + _.map(junkItem.reasons, (junkItemReason) => {
        return compiledJunkReasonTemplate(junkItemReason) + "\n";
    }).join("");
}).join("\n");
fs.writeFileSync("report-v2.txt", totalCount + dupeReportText);
fs.writeFileSync("report-json.txt", JSON.stringify(dupeReport, null, 4));

console.log(totalCount);
//console.log("junkPerkPresets",placeholderItem);