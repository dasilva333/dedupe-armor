const fs = require("fs"),
    _ = require("lodash");

var targetFile = "destinyArmor.csv";    
var armorData = fs.readFileSync(targetFile).toString("utf8");
armorData = armorData.split("\n");
weaponsHeader = armorData.shift().split(",");

var filteredPerks = ["Armor", "Mod", "Curse"];

var items = armorData.map(function (row) {
    var values = row.split(",");
    var results = values.map(function (value, index) {
        return {
            label: weaponsHeader[index],
            value: value
        };        
    });
    //perks have a special case
    var perks = _.map(_.filter(results, function(item){
        //console.log("item", item.label);
        return item.label.indexOf("Perks") > -1 && item.value != '' && item.value != '\r';
    }),'value');
    //console.log("perks", perks);
    if (perks.length) {
        //remap the object to something compatible with the rest of the code
        perksObject = {
            label: "Perks",
            //remove the asterisk denoting it's the active perk, reverse the array to make the shader last in the array
            value: _.map(perks, function(perk){
                return perk.replace("*", "").replace("\r", "");
            }).reverse()
        };
        
        armorPerks = _.clone(perksObject);
        armorPerks.label = "Armor Perks";
        //Inconsistent and limited way of limiting to only armor perks
        armorPerks.value = _.filter(armorPerks.value, function (perk) {
            var parts = perk.split(" ");
            var lastWord = parts[parts.length - 1];
            //console.log("perk", lastWord, filteredPerks.indexOf(lastWord), lastWord.indexOf(filteredPerks));
            return filteredPerks.indexOf(lastWord) == -1;
        });
        //if the amount of perks is 6 that means it's ....
        if (armorPerks.value.length == 6) {
            armorPerks.value.pop();
        }
        var name = _.find(results, {
            label: "Name"
        }).value.toLowerCase();
        if (name.indexOf("reverie") == -1 && name.indexOf("great hunt") == -1 && armorPerks.value.length == 5) {
            armorPerks.value.pop();
        }
        //console.log("armorPerks", armorPerks.value);
        //console.log("")
        results.push(armorPerks);
        var armorCombos = _.clone(armorPerks);
        armorCombos.label = "Armor Combinations";
        var firstColumn = armorCombos.value.slice(0);
        secondColumn = firstColumn.splice(0, 2);
        armorCombos.value = [firstColumn,secondColumn];
        results.push(armorCombos);
    } 
    var item = _.zipObject(_.map(results,'label'), _.map(results,'value'));
    item.dimInfo = {
        tag: item.Tag
    };
    item.sockets = {
        sockets: _.map(item['Armor Combinations'], function(perkColumn){
            return {
                hasRandomizedPlugItems: true, 
                plugOptions: _.map(perkColumn, function(perkName){
                    return {
                        plugItem: {
                            displayProperties: {
                                name: perkName
                            }
                        }
                    };
                })
            };
        })
    }
    item.id = item.Id;
    item.name = item.Name;
    item.type = item.Type;
    item.Tag = item.tag;
    item.tier = item.Tier;
    item.basePower = item.Power;
    item.classTypeName = item.Equippable;
    item.bucket = {
        //this can be hardcoded because it's always processing destinyArmor.csv
        sort: "Armor",
        type: item.Type
    }
    
    return item;
});

//console.log("Items", JSON.stringify(items[0].sockets, null, 4));

var stores = [
    { items: items }
];

module.exports = stores;