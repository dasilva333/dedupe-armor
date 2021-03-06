var fs = require("fs"),
    _ = require("lodash");

var targetFile = "destinyArmor.csv";

var armorData = fs.readFileSync(targetFile).toString("utf8");
armorData = armorData.split("\n");
weaponsHeader = armorData.shift().split(",");
var filteredPerks = ["Armor", "Mod", "Curse"];
var presets = require("./config");

//console.log("presets", presets);

/*var genericFullNames = _.zipObject(_.map(_.keys(presets.genericTypeNames), function(keyName){ return keyName.split(" ")[0]; }), _.keys(presets.genericTypeNames)); 

var genericTagNames = _.map(_.keys(presets.genericTypeNames), function(keyName){ return keyName.split(" ")[0]; });*/

var genericFastNames = _.keys(presets.genericFastTypeNames);

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
            var otherTier = _.find(values, {
                label: "Tier"
            }).value;
            if ( otherTier == "Legendary"){
                _.each(combos, function (combo) {
                    var isEnhancedCombo = combo.join(" ").indexOf("Enhanced") > -1;
                    if (isEnhancedCombo) {
                        var normalCombo = _.clone(combo);
                        //enhanced combos only affect the first column
                        normalCombo[0] = normalCombo[0].replace("Enhanced ", "");
                        var keyName = normalCombo.join(",");
                        unwantedPerksBcEnhanced[keyName] = keyName;
                    }
                });
            }            
            //return memo;
        }, []);
        //
        unwantedPerksBcEnhanced = _.map(unwantedPerksBcEnhanced);
        //console.log("enhancedArmorItems", armorType, unwantedPerksBcEnhanced);

        // there is 3 generic versions that are equal gain as the specific version
        // https://www.reddit.com/r/DestinyTheGame/comments/9oc1ki/massive_breakdown_of_gauntlet_reload_speed_perks/
        var unwantedBcGenericFastPairs = {};
        var unwantedBcGenericFastPairsMap = {};
        _.each(armorItems, function (values) {
            var combos = _.find(values, {
                label: "Armor Combinations"
            }).value;
            var armorType =_.find(values, {
                label: "Type"
            }).value;
            _.each(combos, function (combo) {
                //generic fast perks only exist in the first column
                var fcPerkName = combo[0];
                //manipulate the string in this way so I can check for the beginning of the string and avoid catch {{Other}} Rifle parks
                if ( armorType == "Chest Armor" ){
                    fcPerkName = fcPerkName.replace("Unflinching ", "");
                }
                _.each(genericFastNames, function(genericFastName){
                    //this check ensures it's only in the beginning (first character) of the perk name
                    if ( fcPerkName.indexOf(genericFastName) == 0 ){
                        var affectedWeapons = presets.genericFastTypeNames[genericFastName];
                        _.each(affectedWeapons, function(weaponName){
                            //return an array of perks that aren't needed bc the equivalent is found
                            var fcPerkNameEquiv = combo[0].replace(genericFastName, weaponName);
                            if (armorType=="Chest Armor" && genericFastName == "Large Arms"){
                                fcPerkNameEquiv = fcPerkNameEquiv + " Aim";
                            }
                            var equivalentCombo = [ fcPerkNameEquiv, combo[1] ].join(",");
                            unwantedBcGenericFastPairs[equivalentCombo] = combo;
                        });
                        //console.log("combo", combo);
                        //unwantedBcGenericFastPairs[keyName] = keyName;
                    }
                });
            });
            //return memo;
        }, []);
        unwantedBcGenericFastPairsMap = unwantedBcGenericFastPairs;
        unwantedBcGenericFastPairs = _.map(unwantedBcGenericFastPairs);
        if (armorType == "Helmet"){
            //console.log("unwantedBcGenericFastPairs", unwantedBcGenericFastPairsMap);
        }
        

        //join the array of unwanted perks and unwanted bc enhanced
        unwantedCombos = _.map(presets.unwantedPerkPairs, function(combo){
            return combo.join(",");
        }).concat(unwantedPerksBcEnhanced).concat(unwantedBcGenericFastPairs);

        //only consider deleting regular armor items which are those with 4 perks (2 columns of 2)
        var regArmorItems = _.filter(armorItems, function (values) {
            var stdPerks = _.filter(values, {
                label: "Armor Perks"
            });
            return stdPerks.length > 0; //&& (stdPerks[0].value.length == 4 || stdPerks[0].value.length == 5);
        });

        _.each(regArmorItems, function (values) {
            var combos = _.find(values, {
                label: "Armor Combinations"
            }).value;

            var id = _.find(values, {
                label: "Id"
            }).value;

            var tag = _.find(values, {
                label: "Tag"
            }).value;

            //avoid suggestion dismantle of items marked keep or favorite
            if ( tag == "favorite" || tag == "keep"){
                return;
            }
            /*if (id == "6917529069300791933"){
                console.log("item", values);
            }*/

            //filter combos to the combos that are wanted
            var comboReasons = [];

            var wantedCombos = _.filter(combos, function (combo) {
                //console.log("combos", combos, _.intersection(combos, unwantedPerks).length );
                //console.log("unwantedPerks", unwantedPerks);
                var fcPerkTag = combo[0].split(" ")[0];
                var scWeapon = combo[1].split(" ")[0];
                if (presets.uniqueWeaponSlots.indexOf(fcPerkTag) > -1 && presets.uniqueWeaponSlots.indexOf(scWeapon) > -1 &&
                presets.uniqueWeaponSlots.indexOf(fcPerkTag) != presets.uniqueWeaponSlots.indexOf(scWeapon)) {
                    //console.log("combo", combo, id);
                    comboReasons.push("Impossible Pair");
                    return false;
                }

                var fcPerkCount = _.filter(armorItems, function(otherValues){
                    var stdPerks = _.filter(otherValues, {
                        label: "Armor Perks"
                    });
                    var otherTier = _.find(otherValues, {
                        label: "Tier"
                    }).value;
                    if ( stdPerks.length && otherTier == "Legendary" ){
                        stdPerks = stdPerks[0].value;
                        //console.log("x", combo[0], stdPerks, stdPerks.indexOf(combo[0]) > -1)
                        return stdPerks.length > 0 && stdPerks.indexOf(combo[0]) > -1 && presets.unwantedPerks.indexOf(combo[0]) == -1;
                    } else {
                        return false;
                    }                        
                }).length;
                var scPerkCount = _.filter(armorItems, function(otherValues){
                    var stdPerks = _.filter(otherValues, {
                        label: "Armor Perks"
                    });
                    var otherTier = _.find(otherValues, {
                        label: "Tier"
                    }).value;
                    if ( stdPerks.length && otherTier == "Legendary" ){
                        stdPerks = stdPerks[0].value;
                        //console.log("x", combo[0], stdPerks, stdPerks.indexOf(combo[0]) > -1)
                        return stdPerks.length > 0 && stdPerks.indexOf(combo[1]) > -1 && presets.unwantedPerks.indexOf(combo[1]) == -1;
                    } else {
                        return false;
                    }                        
                }).length;
                /*if ( id == "6917529086013942993" ){
                    console.log("combo", combo, fcPerkCount, scPerkCount);
                }*/
                
                //if the perk is unique and not found in any other piece of armor don't delete it
                if ( fcPerkCount == 1 || scPerkCount == 1 ){
                    comboReasons.push("Unique Perk");
                    return true;
                }

                //if the combo is found in the array of existing unwanted perks i don't want it
                var comboString = combo.join(",");
               /* if ( id == "6917529085950983244" && combo[0] == "Hand Cannon Dexterity" && combo[1] == "Sidearm Scavenger" ){
                    console.log("matchesUnwanted", combo, matchesUnwanted, unwantedCombos);
               }*/
                if ( _.indexOf(unwantedBcGenericFastPairs, comboString) > -1 ){
                    comboReasons.push("Generic Fast Pair");
                    return false;
                } else if ( _.indexOf(unwantedPerksBcEnhanced, comboString) > -1 ){
                    comboReasons.push("Enhanced Pair");
                    return false;
                } else if ( _.indexOf(unwantedCombos, comboString) > -1 ){
                    comboReasons.push("Unwanted Pair");
                    return false;
                } else if ( _.intersection(presets.unwantedPerks, combo).length > 0 ){
                    comboReasons.push("Unwanted Perk");
                    return false;
                }

                //if the intersection between combo and unWantedPerks is zero that means it has none of the unwanted perks
                var hasWantedPerksOnly = _.intersection(combo, presets.unwantedPerks).length == 0;
                comboReasons.push(hasWantedPerksOnly ? "Duplicate Pair" : "Unwanted Perk");
                return hasWantedPerksOnly;
            });

            /*if ( id == "6917529086013942993" ){
                console.log("wantedCombos", wantedCombos);
            }*/

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
                    var isSafeToShard = false;
                    var advArmorCount = 0;
                    if (wantedCombos.length > 0) {
                        _.each(combos, function (combo, index) {
                            var isWantedCombo = _.indexOf(wantedCombos, combo) > -1;
                            var comboCount = _.filter(armorItems, function (values) {

                                var combos = _.filter(_.find(values, {
                                    label: "Armor Combinations"
                                }).value, function (otherCombos) {
                                    return _.intersection(otherCombos, combo).length == 2;
                                });
                                return combos.length > 0 && isWantedCombo;
                            });
                            //if the combo is found in other 5perk gear it's safe to delete
                            var comboCountw5Perks = _.filter(armorItems, function (values) {

                                var armorCombos = _.find(values, {
                                    label: "Armor Combinations"
                                }).value;

                                var combos = _.filter(armorCombos, function (otherCombos) {
                                    return _.intersection(otherCombos, combo).length == 2;
                                });

                                return combos.length > 0 && armorCombos.length == 6 && isWantedCombo;
                            });

                            if ( combos.length == 4 ){
                                isSafeToShard = true;
                                //var comboString = combo.join(",");
                                var reason = comboReasons[index];            
                                /*if ( id == "6917529085707103366" ){
                                    console.log("combo", combo, isWantedCombo, wantedCombos);
                                }*/
                                dupeText.push('"' + combo.join('" "') + '" ' + comboCount.length + ' (reason:' + reason + ')');                                
                            } else if ( combos.length == 6 ){
                                var reason = comboReasons[index];                 
                                if ( comboCountw5Perks.length > 1 && isWantedCombo ){                                    
                                    advArmorCount++;
                                    reason = "Other 5PAs";
                                }                                               
                                dupeText.push('"' + combo.join('" "') + '" ' + comboCount.length + '/' + comboCountw5Perks.length + '" (reason: ' + reason + ')');
                            
                            }                            
                        });
                        //has no desired combos      
                    } else {
                        isSafeToShard = true;
                        dupeText.push("No Desired Combos Available");
                        _.each(combos, function(combo, index){
                            var reason = comboReasons[index];
                            dupeText.push('"' + combo.join('" "') + '" (reason: ' + reason + ')');
                        });
                    }
                    if ( advArmorCount == wantedCombos.length && combos.length == 6 ){
                        isSafeToShard = true;
                    }
                    dupeText = "\n\n" + dupeText.join("\n");
                    //console.log(dupeText);
                    if ( isSafeToShard ){
                        dupeReport.push(dupeText);
                    }                    
                }

            }
        });
    });
});

//console.log(dupeReport);
var totalCount = "\ntotal junk items:" + dupeReport.length;
console.log(totalCount);
fs.writeFileSync("report.txt", totalCount + dupeReport.join(""));