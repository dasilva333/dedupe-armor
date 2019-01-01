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