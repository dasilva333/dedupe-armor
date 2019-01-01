const _ = require("lodash");

const junkPerkPresets = require("./config.js");
/*
    Terminology:
    4pa - 4-perk-armor: armor with 2 perks in the first column, 2 perks in the second column
    5pa - 5-perk-armor: armor with 3 perks in the first column, 2 perks in the second column
    combo: perk pair from first and second column traits
*/
let _junkPerkMaps = null;
function initJunkPerks(stores) {
    if (_junkPerkMaps === null && stores.length > 0) {
        dupeReport = [];
        // console.log("initJunkPerks-0", stores.length);
        _junkPerkMaps = {
            legendaryArmor: _.reduce(stores, (memo, store) => {
                // console.log("initJunkPerks-1", store.items.length);
                _.each(store.items, (item) => {
                    if (item.bucket.sort == "Armor" && item.tier === "Legendary") {
                        memo.push(item);
                    }
                });
                return memo;
            }, []),
            /* Reason: Unwanted Perk Pair */
            unwantedPerkPairs: _.map(junkPerkPresets.unwantedPerkPairs, function (combo) {
                return combo.join(",");
            }),
            armorCombos: {},
            armorPerks: {},
            impossiblePerkPairs: {},
            perkPairCount: {},
            armorPerkCount: {},
            itemTypeNameCounts: {},
            unwantedPairBcEnhanced: {}
        };
        // console.log("legendaryArmor!", _.keys(_junkPerkMaps.legendaryArmor).length);
        /* transform the first and second column to perk-pairs */
        _.each(_junkPerkMaps.legendaryArmor, (item) => {
            /* Reason: Unique Armor Piece */
            const type = item.type;
            const name = item.name;
            if (!_.has(_junkPerkMaps.itemTypeNameCounts, type)) {
                _junkPerkMaps.itemTypeNameCounts[type] = {};
            }
            if (!_.has(_junkPerkMaps.itemTypeNameCounts[type], name)) {
                _junkPerkMaps.itemTypeNameCounts[type][name] = 0;
            }
            _junkPerkMaps.itemTypeNameCounts[type][name]++;

            /* Transform Native Perks format to simplified format */
            const armorPerks = item.sockets.sockets.filter((socket) => {
                return socket.hasRandomizedPlugItems;
            }).map((socket) => {
                return socket.plugOptions.map((options) => {
                    return options.plugItem.displayProperties.name;
                });
            });

            let armorCombos = [];
            let flatPerks = [];
            if (armorPerks.length) {
                armorPerks[0].forEach((firstColumn) => {
                    flatPerks.push(firstColumn);
                    armorPerks[1].forEach((secondColumn) => {
                        armorCombos.push([firstColumn, secondColumn]);
                    });
                });
                armorPerks[1].forEach((secondColumn) => {
                    flatPerks.push(secondColumn);
                });
            }
            /* Armor Perks reason: Unique Perks */
            _junkPerkMaps.armorPerks[item.id] = flatPerks;
            /* Armor Combos reason: figuring everything out */
            _junkPerkMaps.armorCombos[item.id] = armorCombos;
        });

        /* loop over combos to precompute statistics for the filter */
        _.each(_junkPerkMaps.armorCombos, (combos, itemId) => {
            var isFourPa = combos.length == 4;
            var perks = _junkPerkMaps.armorPerks[itemId];

            /* Reason: Unique Perk */
            _.each(perks, (perkName) => {
                if (!_.has(_junkPerkMaps.armorPerkCount, perkName)) {
                    _junkPerkMaps.armorPerkCount[perkName] = 0;
                }
                _junkPerkMaps.armorPerkCount[perkName]++;
            });

            _.each(combos, (combo) => {
                const fcPerkTag = combo[0].split(" ")[0];
                const scWeapon = combo[1].split(" ")[0];
                const comboString = combo.join(",");
                /* Reason: Impossible Perk Pairs */
                if (junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) > -1 && junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon) > -1 &&
                    junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) != junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon)) {
                    _junkPerkMaps.impossiblePerkPairs[comboString] = comboString;
                }

                /* Reason Duplicate Perk Pair */
                if (!_.has(_junkPerkMaps.perkPairCount, comboString)) {
                    _junkPerkMaps.perkPairCount[comboString] = {
                        fivePa: 0,
                        fourPa: 0,
                        fivePaIDs: [],
                        fourPaIDs: []
                    };
                }
                var ids = _junkPerkMaps.perkPairCount[comboString][isFourPa ? 'fourPaIDs' : 'fivePaIDs'];
                if (ids.indexOf(itemId) == -1) {
                    _junkPerkMaps.perkPairCount[comboString][isFourPa ? 'fourPa' : 'fivePa']++;
                    ids.push(itemId);
                }

                /* Reason: Enhanced Pair 
                    If you have Enhanced {{Perk1}} and {{Perk2}} then you don't need anything with {{Perk1}} {{Perk2}} pair ever
                    example: Enhanced HC Loader + Special Ammo Finder replaces all HC Loader + Special Ammo Finder combos
                    Enhanced Perks only affect the first column of the pair
                */
               var isEnhancedCombo = combo[0].indexOf("Enhanced") > -1;
               if (isEnhancedCombo) {
                   var normalCombo = _.clone(combo);                   
                   normalCombo[0] = normalCombo[0].replace("Enhanced ", "");
                   var keyName = normalCombo.join(",");
                   _junkPerkMaps.unwantedPairBcEnhanced[keyName] = keyName;
               }


            });
        });
        _junkPerkMaps.impossiblePerkPairs = _.map(_junkPerkMaps.impossiblePerkPairs);

        //console.log("armor items", _junkPerkMaps.itemTypeNameCounts);
        const perkMapStats = _.zipObject(_.keys(_junkPerkMaps), _.map(_.keys(_junkPerkMaps), (keyName) => {
            return _.keys(_junkPerkMaps[keyName]).length;
        }));
        console.log("_junkPerkMaps", perkMapStats);
    }
    return _junkPerkMaps;
}

//return false for opacity 0, return true for opacity 1, opacity 1 means dismantle
function junkPerkFilter(item, dupeReport) {
    //console.log("dupeReport", dupeReport.length);
    
    if (item.bucket.sort == "Armor" && item.tier === "Legendary") {

        //if the item is marked with the tags set to make it skip analyze
        if (junkPerkPresets.ignoreTags.indexOf(item.dimInfo.tag) > -1) {
            return false;
        }

        initJunkPerks();

        const armorCombos = _junkPerkMaps.armorCombos[item.id];

        // Only Y1 Armor has no perks to make this array zero so mark it for dismantle
        if (!armorCombos || armorCombos && armorCombos.length === 0) {
            dupeReport.push([item.name, 'light:=' + item.basePower, item.id, "Reason: No Armor Combos Available"].join(" "));
            //console.log();
            return true;
        }

        // if the item is unique by type/name then regardless of anything else, keep it to ensure a full set is available
        var itemTypeNameCount = _junkPerkMaps.itemTypeNameCounts[item.type][item.name];
        if (itemTypeNameCount === 1) {
            //console.log("Skipping Unique Item", item.name, 'light:=' + item.Power, item.id, "No Armor Combos Available");
            return false;
        }
        //filter combos to the combos that are wanted
        const comboReasons = [];

        var isFourPa = armorCombos.length == 4;

        const wantedCombos = _.filter(armorCombos, (combo) => {
            /* item checks
                1. individual perks count -  quick lookup - reason: Having a unique wanted perk is alright even if it's with a bad pair rather than losing it
                2. preset unwanted perks - quick lookup - reason: Unwanted perk makes the entire pair unwanted
                3. preset unwanted pairs - quick lookup - reason: Unwanted Pair are preconfigured by the user
                4. preset impossible heavy pairs - quick lookup - reason: Impossible Pair are first column heady second column mismatched heavy
                5. perk-pairs count - quick lookup - reason: Other 5PA with the same pair available
                5. enhanced-pairs - quick lookup - reason: Other armor with the enhanced version of the perk pair is available
                6. multi-tier perks - heavy lookup - reason: 
                    - if you have Light Arms Loader then you don't need HC Loader bc it's just as good
            */
            /* Unique Perk */
            const fcPerkName = combo[0];
            const scPerkName = combo[1];
            const fcPerkCount = _junkPerkMaps.armorPerkCount[fcPerkName];
            const scPerkCount = _junkPerkMaps.armorPerkCount[scPerkName];
            /*if (item.id == "6917529086013942993") {
                console.log("fcPerkCount", fcPerkCount, fcPerkName,  "scPerkCount", scPerkCount, scPerkName);
            }*/
            if (fcPerkCount == 1 || scPerkCount == 1) {
                comboReasons.push("Unique Perk");
                return true;
            }

            /* Unwanted Perk */
            const unwantedPerk = _.intersection(junkPerkPresets.unwantedPerks, combo).length > 0;
            if (unwantedPerk) {
                comboReasons.push("Unwanted Perk");
                return false;
            }

            /* Unwanted Pair */
            const comboString = combo.join(",");
            const unwantedPair = _.indexOf(_junkPerkMaps.unwantedPerkPairs, comboString) > -1;
            if (unwantedPair) {
                comboReasons.push("Unwanted Perk Pair");
                return false;
            }

            /* Impossible Pair */
            const impossiblePair = _.indexOf(_junkPerkMaps.impossiblePerkPairs, comboString) > -1;
            if (impossiblePair) {
                comboReasons.push("Impossible Pair");
                return false;
            }

            /* Duplicate Perk */
            const perkPairCount = _junkPerkMaps.perkPairCount[comboString];
            /*if (item.id == "6917529086278883300") {
                console.log("perkPairCount", perkPairCount, perkPairCount.fourPa > 2, perkPairCount.fivePa > 2);
            }*/
            // if the item has a replacement 4pa piece it needs another 4pa or 5pa replacement to be considered a dupe
            if (isFourPa && (perkPairCount.fourPa >= 2 || perkPairCount.fivePa >= 1)) {
                comboReasons.push("Duplicate Pair " + perkPairCount.fourPa + "/" + perkPairCount.fivePa);
                return false;
            }
            //if the item is a 5pa then it can only be replaced by another 5pa armor piece
            if (!isFourPa && perkPairCount.fivePa >= 2) {
                comboReasons.push("Dupe In Other 5PA " + perkPairCount.fourPa + "/" + perkPairCount.fivePa);
                return false;
            }
            /*if (comboString == "Unflinching Fusion Rifle Aim,Special Ammo Finder") {
                console.log("test", perkPairCount)
            }*/
            /* Enhanced Pair - Enhanced version of the perk pair available */
            const hasEnhancedPair = _.has(_junkPerkMaps.unwantedPairBcEnhanced, comboString);
            if (hasEnhancedPair){
                comboReasons.push("Enhanced Pair Available");
                return false;
            }

            //if it passes all these conditions then the perk-pair is wanted
            comboReasons.push("Wanted Perk Pair");
            return true;
        });

        /*if (item.id == "6917529086431217491") {
            console.log("wantedCombos", wantedCombos, comboReasons);
        }*/

        // if the item has no wanted combos then it can safely be dismantled
        if (wantedCombos.length == 0) {
            let dupeText = [];
            //console.log("unwantedItem", item.name, 'light:=' + item.Power, item.id, armorCombos, comboReasons);
            dupeText.push([item.name, 'light:=' + item.basePower, item.id, "Reason: No Wanted Combos"].join(" "));
            _.each(armorCombos, (combo, index) => {
                var reason = comboReasons[index];
                dupeText.push('"' + combo.join('" "') + '" (reason: ' + reason + ')');
            });
            dupeText.push("");
            dupeReport.push(dupeText.join("\n"))
            return true;
        }

    }

    //console.log("armorCombos", armorCombos, wantedCombos.length);
    //if it passes all the conditions the item is wanted (opacity: 0)
    return false;
}

module.exports = {
    initJunkPerks: initJunkPerks,
    junkPerkFilter: junkPerkFilter
};