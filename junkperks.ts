/* this converts the csv output to the same internal format used by the DIM plugin */
const _ = require("lodash");

const stores = require("./dimStorageShim");
const placeholderFivePa = require("./dimFivePaShim");
const placeholderFourPa = require("./dimFourPaShim");

const jpf = require("./junkPerkFilter.js");

 let _junkPerkMaps = jpf.initJunkPerks(stores);

function junkperk(item) {
    return jpf.junkPerkFilter(item);
}

// test one armor piece
junkperk(placeholderFivePa);

/* test all armor pieces */
_.each(_junkPerkMaps.legendaryArmor, function (armorItem) {
    junkperk(armorItem);
});

console.log(jpf.dupeReport.join("\n"));
//console.log("junkPerkPresets",placeholderItem);