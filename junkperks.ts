/* this converts the csv output to the same internal format used by the DIM plugin */
const _ = require("lodash");

const stores = require("./dimStorageShim");

const placeholderFivePa = require("./dimFivePaShim");
const placeholderFourPa = require("./dimFourPaShim");

const junkPerkPresets = require("./config.js");

let _junkPerkMaps = null;

function initJunkPerks() {
    if (_junkPerkMaps === null) {
        //console.log("initJunkPerks!");
        _junkPerkMaps = {
            legendaryArmor: _.reduce(stores, (memo, store) => {
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
            itemTypeNameCounts: {}
        };

        /* transform the first and second column to perk-pairs */
        _.each(_junkPerkMaps.legendaryArmor, (item) => {
            /* Reason: Unique Armor Piece */
            const type = item.type;
            const name = item.name;
            if (!_.has(_junkPerkMaps.itemTypeNameCounts, type)){
                _junkPerkMaps.itemTypeNameCounts[type] = {};
            }
            if (!_.has(_junkPerkMaps.itemTypeNameCounts[type], name)){
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
            armorPerks[0].forEach((firstColumn) => {
                flatPerks.push(firstColumn);
                armorPerks[1].forEach((secondColumn) => {
                    armorCombos.push([firstColumn, secondColumn]);
                });
            });
            armorPerks[1].forEach((secondColumn) => {
                flatPerks.push(secondColumn);
            });
            /* Armor Perks reason: Unique Perks */
            _junkPerkMaps['armorPerks'][item.id] = flatPerks;
            /* Armor Combos reason: figuring everything out */
            _junkPerkMaps['armorCombos'][item.id] = armorCombos;
        });

        /* loop over combos to precompute statistics for the filter */
        _.each(_junkPerkMaps['armorCombos'], (combos, itemId) => {
            var isFourPa = combos.length == 4;
            var perks = _junkPerkMaps['armorPerks'][itemId];

            /* Reason: Unique Perk */
            _.each(perks, (perkName) => {
                if (!_.has(_junkPerkMaps['armorPerkCount'], perkName)) {
                    _junkPerkMaps['armorPerkCount'][perkName] = 0;
                }
                _junkPerkMaps['armorPerkCount'][perkName]++;
            });        

            _.each(combos, (combo) => {
                const fcPerkTag = combo[0].split(" ")[0];
                const scWeapon = combo[1].split(" ")[0];
                const comboString = combo.join(",");
                /* Reason: Impossible Perk Pairs */
                if (junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) > -1 && junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon) > -1 &&
                    junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) != junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon)) {
                    _junkPerkMaps['impossiblePerkPairs'][comboString] = comboString;
                }

                /* Reason Duplicate Perk Pair */
                if (!_.has(_junkPerkMaps['perkPairCount'], comboString)) {
                    _junkPerkMaps['perkPairCount'][comboString] = {
                        fivePa: 0,
                        fourPa: 0,
                        fivePaIDs: [],
                        fourPAIDs: []
                    };
                }
                var ids = _junkPerkMaps['perkPairCount'][comboString][isFourPa ? 'fourPAIDs' : 'fivePaIDs'];
                if ( ids.indexOf(itemId) == -1 ){
                    _junkPerkMaps['perkPairCount'][comboString][isFourPa ? 'fourPa' : 'fivePa']++;
                    ids.push(itemId);
                }
            });
        });
        _junkPerkMaps['impossiblePerkPairs'] = _.map(_junkPerkMaps['impossiblePerkPairs']);

        //console.log("armor items", _junkPerkMaps.itemTypeNameCounts);
    }
}

const dupeReport = [];
function junkperk(item) {
    var result = {
        reason: "",
        keep: true
    };
    if (item.bucket.sort == "Armor" && item.tier === "Legendary") {

        //if the item is marked with the tags set to make it skip analyze
        if (junkPerkPresets.ignoreTags.indexOf(item.dimInfo.tag) > -1) {
            return false;
        }

        initJunkPerks();

        const armorCombos = _junkPerkMaps.armorCombos[item.id];

        // Only Y1 Armor has no perks to make this array zero so mark it for dismantle
        if ( armorCombos.length === 0 ){
            dupeReport.push([item.name, 'light:=' + item.Power, item.id, "Reason: No Armor Combos Available"].join(" "));
            //console.log();
            return true;
        }

        // if the item is unique by type/name then regardless of anything else, keep it to ensure a full set is available
        var itemTypeNameCount = _junkPerkMaps.itemTypeNameCounts[item.type][item.name];        
        if (itemTypeNameCount === 1){
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
                6. multi-tier perks - heavy lookup - reason: Generic Fast Pair or Enhanced Pair
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
            if (perkPairCount.fourPa >= 2 || perkPairCount.fivePa >= 1) {
                // console.log("duplicate perk", comboString, perkPairCount);
                if ( isFourPa ){
                    comboReasons.push("Duplicate Pair " + perkPairCount.fourPa + "/" + perkPairCount.fivePa);
                    return false;
                } else {
                    if ( perkPairCount.fivePa > 1 ){
                        comboReasons.push("5PA Armor");
                        return false;
                    }
                }                
                
            }

            /*if (comboString == "Unflinching Fusion Rifle Aim,Special Ammo Finder") {
                console.log("test", perkPairCount)
            }*/
            //if it passes all these conditions then the perk-pair is wanted
            return true;
        });

        /*if (item.id == "6917529086013942993") {
            console.log("wantedCombos", wantedCombos);
        }*/
        /*
            Reasons to keep the item:
            - If it has 1 or more wanted combos

        */
        if ( wantedCombos.length == 0 ){
            //console.log("unwantedItem", item.name, 'light:=' + item.Power, item.id, armorCombos, comboReasons);
            dupeReport.push([item.name, 'light:=' + item.Power, item.id, "Reason: No Wanted Combos"].join(" "));
            _.each(armorCombos, (combo, index) => {
                var reason = comboReasons[index];
                dupeReport.push('"' + combo.join('" "') + '" (reason: ' + reason + ')');
            });
            dupeReport.push("\n");
        }

        //console.log("armorCombos", armorCombos, wantedCombos.length);
        //if it passes all the conditions the item is wanted (doShow=false)
        return false;
    }

}

// test one armor piece
junkperk(placeholderFivePa);

/* test all armor pieces */
_.each(_junkPerkMaps.legendaryArmor, function (armorItem) {
    junkperk(armorItem);
});

console.log(dupeReport.join("\n"));
//console.log("junkPerkPresets",placeholderItem);