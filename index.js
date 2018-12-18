var fs = require("fs"),
    _ = require("lodash");

var targetFile = "destinyArmor.csv";

var armorData = fs.readFileSync(targetFile).toString("utf8");
armorData = armorData.split("\n");
weaponsHeader = armorData.shift().split(",");
var filteredPerks = ["Armor", "Mod", "Curse"];
var unwantedPerks = [
    //these archetypes have plenty of ammo so very rare to need to scavenge/reserve it
    "Auto Rifle Scavenger", "Pulse Rifle Scavenger", "Scout Rifle Scavenger",
    "Auto Rifle Reserves", "Pulse Rifle Reserves", "Scout Rifle Reserves",
    //I rarely do melee so remove those perks
    "Impact Induction", "Light Reactor", "Invigoration", //"Hands-On",
    //Bow doesn't need reload speed improvements, plenty of ammo so no need to buff that either
    "Bow Reloader", "Bow Reserves", "Arrow Scavenger",
    //who needs to really aim these anyway?
    "Unflinching Grenade Launcher Aim", "Unflinching Power Aim",
    //Primary Ammo is already plentiful and if we're going to make a spec something that affects all Power weapons is meh
    "Primary Ammo Finder", "Unflinching Power Aim", "Power Dexterity"
];

// RL/LF/Sword Perk + non-matching RL/LF/Sword Perk
// real example: LF loader + sword scavener
var uniqueWeaponSlots = ["Sword", "Rocket", "Linear"];

var genericTypeNames = {
    "Kinetic Weapon": ["Scout Rifle", "Auto Rifle", "Hand Cannon", "Pulse Rifle", "Sniper Rifle", "Shotgun", "Bow", "Submachine Gun", "Sidearm", "Grenade Launcher"],
    "Energy Weapon": ["Scout Rifle", "Auto Rifle", "Hand Cannon", "Pulse Rifle", "Sniper Rifle", "Shotgun", "Bow", "Submachine Gun", "Sidearm", "Grenade Launcher", "Fusion Rifle"],
    "Power Weapon": ["Rocket Launcher", "Grenade Launcher", "Linear Fusion Rifle", "Sword", "Machine Gun", "Shotgun", "Sniper Rifle"],
    "Rifle": ["Scout Rifle", "Auto Rifle", "Pulse Rifle", "Sniper Rifle", "Linear Fusion Rifle"],
    "Oversize Weapon": ["Rocket Launcher", "Grenade Launcher", "Shotgun", "Bow"],
    "Large Weapon": ["Rocket Launcher", "Grenade Launcher", "Shotgun"],
    "Light Arms": ["Hand Cannon", "Submachine Gun", "Sidearm"],
    "Scatter Projectile": ["Auto Rifle", "Submachine Gun", "Pulse Rifle", "Sidearm", "Fusion Rifle"],
    "Precision Weapon": ["Hand Cannon", "Scout Rifle", "Trace Rifle", "Bow", "Linear Fusion Rifle", "Sniper", "Shotgun"]
};

var genericFullNames = _.zipObject(_.map(_.keys(genericTypeNames), function(keyName){ return keyName.split(" ")[0]; }), _.keys(genericTypeNames)); 

var genericTagNames = _.map(_.keys(genericTypeNames), function(keyName){ return keyName.split(" ")[0]; });

armorData = armorData.map(function (row) {
    var values = row.split(",");
    var results = values.map(function (value, index) {
        return {
            label: weaponsHeader[index],
            value: value
        };
    });
    //perks have a special case
    var perks = _.find(results, {
        label: "Perks"
    });
    if (perks) {
        //turn the current value into an array
        perks.value = [perks.value.replace("*", "")];
        //console.log("perks", perks)
        //append the rest of the perks to that array
        _.each(results.reverse(), function (perk, index) {
            if (perk.label == undefined) {
                //console.log("perk", perk, index);
                perks.value.push(perk.value.replace("*", ""));
                delete results[index];
            }
        });
        armorPerks = _.clone(perks);
        armorPerks.label = "Armor Perks";
        armorPerks.value = _.filter(armorPerks.value, function (perk) {
            var parts = perk.split(" ");
            var lastWord = parts[parts.length - 1];
            //console.log("perk", lastWord, filteredPerks.indexOf(lastWord), lastWord.indexOf(filteredPerks));
            return filteredPerks.indexOf(lastWord) == -1;
        });
        if (armorPerks.value.length == 6) {
            armorPerks.value.pop();
        }
        var name = _.find(results, {
            label: "Name"
        }).value.toLowerCase();
        if (name.indexOf("reverie") == -1 && name.indexOf("great hunt") == -1 && armorPerks.value.length == 5) {
            armorPerks.value.pop();
        }
        results.push(armorPerks);

        /*var id = _.find(results, { label: "Id" }).value;
        if ( id == "6917529071939035354" ){
            console.log("perks", armorPerks.value);
        }*/
        armorCombos = _.clone(armorPerks);
        armorCombos.label = "Armor Combinations";
        var firstColumn = armorCombos.value.slice(0);
        secondColumn = firstColumn.splice(0, 2);
        armorCombos.value = [];
        _.each(firstColumn, function (fcPerkName) {
            _.each(secondColumn, function (scPerkName) {
                armorCombos.value.push([fcPerkName, scPerkName]);
            });
        });
        results.push(armorCombos);
    }
    return results;
});

var armorTypes = _.map(_.reduce(armorData, function (memo, values) {
    var type = _.find(values, {
        label: "Type"
    });
    if (type) {
        if (!_.has(memo, type.value)) {
            memo[type.value] = type.value;
        }
    }
    return memo;
}, {}));

var equipTypes = _.map(_.reduce(armorData, function (memo, values) {
    var type = _.find(values, {
        label: "Equippable"
    });
    if (type) {
        if (!_.has(memo, type.value)) {
            memo[type.value] = type.value;
        }
    }
    return memo;
}, {}));

var dupeReport = [];
//Loop over helmets, chests, boots etc
_.each(armorTypes, function (armorType) {
    //loop over hunter, warlock, titan
    _.each(equipTypes, function (equipType) {

        //query by those items in the loop
        var armorItems = _.filter(armorData, function (values) {
            return _.filter(values, {
                label: "Type",
                value: armorType
            }).length > 0 && _.filter(values, {
                label: "Equippable",
                value: equipType
            }).length > 0;
        });
        //console.log("armorItems", equipType, armorType, armorItems.length);

        var unwantedPerksBcEnhanced = {};
        _.each(armorItems, function (values) {
            var combos = _.find(values, {
                label: "Armor Combinations"
            }).value;
            _.each(combos, function (combo) {
                var isEnhancedCombo = combo.join(" ").indexOf("Enhanced") > -1;
                if (isEnhancedCombo) {
                    var normalCombo = _.clone(combo);
                    //enhanced combos only affect the first column
                    normalCombo[0] = normalCombo[0].replace("Enhanced ", "");
                    var keyName = normalCombo.join(",");
                    //memo.push([normalCombo, combo]);
                    /*var inter = _.intersection(memo, normalCombo);
                    if ( normalCombo[0] == "Shotgun Dexterity" && normalCombo[1] == "Pulse Rifle Scavenger" ){
                        console.log("A", inter);
                    }
                    if ( inter.length == 0 ){
                        memo.push(normalCombo);    
                    }      */
                    unwantedPerksBcEnhanced[keyName] = keyName;
                }
            });
            //return memo;
        }, []);
        unwantedPerksBcEnhanced = _.map(unwantedPerksBcEnhanced /*, function(a){ return a.split(","); }*/ );
        //console.log("enhancedArmorItems", armorType, unwantedPerksBcEnhanced);

        //only consider deleting regular armor items which are those with 4 perks (2 columns of 2)
        var regArmorItems = _.filter(armorItems, function (values) {
            var stdPerks = _.filter(values, {
                label: "Armor Perks"
            });
            return stdPerks.length > 0 && stdPerks[0].value.length == 4;
        });

        _.each(regArmorItems, function (values) {
            var combos = _.find(values, {
                label: "Armor Combinations"
            }).value;

            var id = _.find(values, {
                label: "Id"
            }).value;

            //filter combos to the combos that are wanted
            var wantedCombos = _.filter(combos, function (combo) {
                //console.log("combos", combos, _.intersection(combos, unwantedPerks).length );
                //console.log("unwantedPerks", unwantedPerks);
                var fcPerkTag = combo[0].split(" ")[0];
                var scWeapon = combo[1].split(" ")[0];
                if (uniqueWeaponSlots.indexOf(fcPerkTag) > -1 && uniqueWeaponSlots.indexOf(scWeapon) > -1 &&
                    uniqueWeaponSlots.indexOf(fcPerkTag) != uniqueWeaponSlots.indexOf(scWeapon)) {
                    //console.log("combo", combo, id);
                    return false;
                } else if ( genericTagNames.indexOf(fcPerkTag) > -1 ){
                    var fullGenericName = genericFullNames[fcPerkTag];                    
                    var specificCombos = genericTypeNames[fullGenericName];
                    var specificComboCounts = _.map(specificCombos, function(specificGunName){
                        var fcPerkName = specificGunName + combo[0].replace(fullGenericName, "").replace(fcPerkTag, "");
                        var wantedCombo = [fcPerkName, combo[1]];
                        var otherArmor = _.filter(armorItems, function (otherValues) {
                            var otherId = _.find(otherValues, {
                                label: "Id"
                            }).value;
                            var otherTier = _.find(otherValues, {
                                label: "Tier"
                            }).value;
                            var hasMatchingParks = false;
                            if (otherId != id && otherTier == "Legendary") {
                                var otherCombos = _.find(otherValues, {
                                    label: "Armor Combinations"
                                }).value;
                                //loop through the other combos and see if it has a combination that matches wanted combo
                                hasMatchingParks = _.filter(otherCombos, function (otherCombo) {
                                    return _.intersection(wantedCombo, otherCombo).length == 2 || _.intersection(["Enhanced " + wantedCombo[0], wantedCombo[1]], otherCombo).length == 2; //has both perks in the wantedCombo
                                }).length > 0;
        
                                /*if ( id == "6917529068982983584" && wantedCombo.indexOf("Shotgun Reserves") > -1 && wantedCombo.indexOf("Scout Rifle Targeting") > -1 ){
                                    console.log("\n1.hasMatchingParks: ", hasMatchingParks, "\n\n2.wantedCombo", wantedCombo, "\n\n3.otherCombos", otherCombos, "\n");
                                }
                                hasMatchingParks = false;*/
                            }
                            return hasMatchingParks;
                        });
                        
                        //console.log("searching for combo", wantedCombo, otherArmor.length);
                        return otherArmor.length;
                    });
                    //console.log("generic combo", combo, specificComboCounts);
                    //if there is no item with a zero then all specific slots that can fill the generic are available
                    if ( specificComboCounts.indexOf(0) == -1 ){
                        //console.log("generic combo-2", combo, specificComboCounts);
                        return false;
                    }
                }

                //if the combo is found in the array of existing enhanced perks then I don't want it
                var matchesEnhancedSet = unwantedPerksBcEnhanced.indexOf(combo.join(",")) > -1;
                /*if ( id == "6917529084644326694" && combo[0] == "Hand Cannon Dexterity" && combo[1] == "Sidearm Scavenger" ){
                    console.log("matchesEnhancedSet", combo, matchesEnhancedSet);
                }*/
                if (matchesEnhancedSet) {
                    return false;
                }

                //if the intersection between combo and unWantedPerks is zero that means it has none of the unwanted perks
                return _.intersection(combo, unwantedPerks).length == 0;
            });

            if ( id == "6917529085010708383" ){
                console.log("wantedCombos", wantedCombos);
            }

            // the armor piece might have just one desired combo
            // if the length of armor pieces that fit each combo then it's a dupe
            // eg. [ [fp,sp] ]
            var otherArmorWithSamePerks = _.filter(wantedCombos, function (wantedCombo) {

                //so for this wanted combo look through all the armor items that are legendary to find something else that can do that
                return _.filter(armorItems, function (otherValues) {
                    var otherId = _.find(otherValues, {
                        label: "Id"
                    }).value;
                    var otherTier = _.find(otherValues, {
                        label: "Tier"
                    }).value;
                    var hasMatchingParks = false;
                    if (otherId != id && otherTier == "Legendary") {
                        var otherCombos = _.find(otherValues, {
                            label: "Armor Combinations"
                        }).value;
                        //loop through the other combos and see if it has a combination that matches wanted combo
                        hasMatchingParks = _.filter(otherCombos, function (otherCombo) {
                            return _.intersection(wantedCombo, otherCombo).length == 2; //has both perks in the wantedCombo
                        }).length > 0;

                        /*if ( id == "6917529068982983584" && wantedCombo.indexOf("Shotgun Reserves") > -1 && wantedCombo.indexOf("Scout Rifle Targeting") > -1 ){
                            console.log("\n1.hasMatchingParks: ", hasMatchingParks, "\n\n2.wantedCombo", wantedCombo, "\n\n3.otherCombos", otherCombos, "\n");
                        }
                        hasMatchingParks = false;*/
                    }
                    return hasMatchingParks;
                }).length > 0;
            });

            if (otherArmorWithSamePerks.length == wantedCombos.length) {
                var name = _.find(values, {
                    label: "Name"
                }).value;
                var power = _.find(values, {
                    label: "Power"
                }).value;
                var itemCount = _.filter(armorData, function (values) {
                    return _.filter(values, {
                        label: "Name",
                        value: name
                    }).length > 0 && _.filter(values, {
                        label: "Type",
                        value: armorType
                    }).length > 0;
                }).length;
                if (itemCount > 1) {
                    var hasMod = _.find(values, {
                        label: "Perks"
                    }).value.join(",").split("Mod").length > 3;
                    var result = [equipType, armorType, name, 'light:=' + power, 'items:' + itemCount, 'hasMod:' + hasMod, id];
                    /*if ( id == "6917529080335610926" ){
                        console.log("dupe found", result, combos, wantedCombos);
                        AbortController;
                    }*/
                    var dupeText = [result.join(" ")];
                    //has possible combos that can be made by other items
                    if (wantedCombos.length > 0) {
                        _.each(wantedCombos, function (wantedCombo) {
                            var comboCount = _.filter(armorItems, function (values) {

                                var combos = _.filter(_.find(values, {
                                    label: "Armor Combinations"
                                }).value, function (otherCombos) {
                                    return _.intersection(otherCombos, wantedCombo).length == 2;
                                });
                                return combos.length > 0;
                            });
                            /*if (id == "6917529084875220621"){
                                if ( wantedCombo[0] == "Recuperation" && wantedCombo[1] == "Submachine Gun Reserves"){
                                    console.log("wantedCombo", wantedCombo, comboCount);
                                }
                                
                            }*/

                            dupeText.push('"' + wantedCombo.join('" "') + '" ' + comboCount.length);
                        });
                        //has no desired combos      
                    } else {
                        dupeText.push("No Desired Combos Available");
                    }
                    dupeText = "\n\n" + dupeText.join("\n");
                    //console.log(dupeText);
                    dupeReport.push(dupeText);
                }

            }
        });
    });
});

//console.log(dupeReport);
console.log("\ntotal junk items:", dupeReport.length);
fs.writeFileSync("object.txt", JSON.stringify(dupeReport, null, 4));
fs.writeFileSync("report.txt", dupeReport.join(""));