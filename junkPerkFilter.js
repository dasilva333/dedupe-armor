const _ = require('lodash');

const junkPerkPresets = require('./config.js');
/*
    Terminology:
    4pa - 4-perk-armor: armor with 2 perks in the first column, 2 perks in the second column
    5pa - 5-perk-armor: armor with 3 perks in the first column, 2 perks in the second column
    combo: perk pair from first and second column traits
    ets: equal to specific, equivalent gain or improvement
*/
let _junkPerkMaps = null;

function initJunkPerks(stores) {
  if (_junkPerkMaps === null && stores.length > 0) {
    dupeReport = [];
    // console.log("initJunkPerks-0", stores.length);
    _junkPerkMaps = {
      legendaryArmor: _.reduce(
        stores,
        (memo, store) => {
          // console.log("initJunkPerks-1", store.items.length);
          _.each(store.items, (item) => {
            if (item.bucket.sort == 'Armor' && item.tier === 'Legendary' && (junkPerkPresets.skipTags.indexOf(item.tag) == -1 || junkPerkPresets.skipTags.length == 0)) {
              memo.push(item);
            }
          });
          return memo;
        },
        []
      ),
      /* Reason: Unwanted Perk Pair */
      unwantedPerkPairs: _.map(junkPerkPresets.unwantedPerkPairs, function(combo) {
        return combo.join(',');
      }),
      wantedPerkPairs: _.map(junkPerkPresets.wantedPerkPairs, function(combo) {
        return combo.join(',');
      }),
      genericEtsPerkNames: _.keys(junkPerkPresets.genericEtsPerks),
      statsByClassName: {}
    };
    /* transform the first and second column to perk-pairs */
    _.each(_junkPerkMaps.legendaryArmor, (item) => {
      /* Reason: Unique Armor Piece */
      const type = item.type;
      const name = item.name;
      const classType = item.classTypeName;
      //precompute all the stats per class name
      if (!_.has(_junkPerkMaps.statsByClassName, classType)) {
        _junkPerkMaps.statsByClassName[classType] = {
          armorCombos: {},
          armorPerks: {},
          impossiblePerkPairs: {},
          perkPairCount: {},
          armorPerkCount: {},
          itemTypeNameCounts: {},
          unwantedPairBcEnhanced: {},
          unwantedBcGenericEtsPairs: {}
        };
      }
      const junkPmByClass = _junkPerkMaps.statsByClassName[classType];
      if (!_.has(junkPmByClass.itemTypeNameCounts, type)) {
        junkPmByClass.itemTypeNameCounts[type] = {};
      }
      if (!_.has(junkPmByClass.itemTypeNameCounts[type], name)) {
        junkPmByClass.itemTypeNameCounts[type][name] = 0;
      }
      junkPmByClass.itemTypeNameCounts[type][name]++;

      /* Transform Native Perks format to simplified format */
      const armorPerks = item.sockets.sockets
        .filter((socket) => {
          return socket.hasRandomizedPlugItems;
        })
        .map((socket) => {
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
      junkPmByClass.armorPerks[item.id] = flatPerks;
      /* Armor Combos reason: figuring everything out */
      junkPmByClass.armorCombos[item.id] = armorCombos;
    });

    /* loop over combos to precompute statistics for the filter per class */
    _.each(_.keys(_junkPerkMaps.statsByClassName), (classTypeName) => {
      const junkPmByClass = _junkPerkMaps.statsByClassName[classTypeName];
      _.each(junkPmByClass.armorCombos, (combos, itemId) => {
        const isFourPa = combos.length == 4;
        const itemInfo = _.find(_junkPerkMaps.legendaryArmor, { id: itemId });
        const perks = junkPmByClass.armorPerks[itemId];
        const armorType = itemInfo.bucket.type;
        // const applicableGenericEtsNames = junkPerkPresets.genericTypeEquivalents
        /* Reason: Unique Perk */
        _.each(perks, (perkName) => {
          if (!_.has(junkPmByClass.armorPerkCount, perkName)) {
            junkPmByClass.armorPerkCount[perkName] = 0;
          }
          junkPmByClass.armorPerkCount[perkName]++;
        });

        _.each(combos, (combo) => {
          const fcPerkTag = combo[0].split(' ')[0];
          const scWeapon = combo[1].split(' ')[0];
          const comboString = combo.join(',');
          let fcPerkName = combo[0];
          //console.log("armorType", armorType);
          //manipulate the string in this way so I can check for the beginning of the string and avoid catch {{Other}} Rifle parks
          if (armorType == 'Chest Armor') {
            fcPerkName = fcPerkName.replace('Unflinching ', '');
          }
          _.each(_junkPerkMaps.genericEtsPerkNames, function(genericEtsPerkName) {
            //this check ensures it's only in the beginning (first character) of the perk name
            if (fcPerkName.indexOf(genericEtsPerkName) == 0) {
              // console.log("fcPerkName", genericEtsPerkName, combo );
              var affectedWeapons = junkPerkPresets.genericEtsPerks[genericEtsPerkName];
              _.each(affectedWeapons, function(weaponName) {
                //return an array of perks that aren't needed bc the equivalent is found
                var fcPerkNameEquiv = combo[0].replace(genericEtsPerkName, weaponName);
                if (armorType == 'Chest Armor' && genericEtsPerkName == 'Large Arms') {
                  fcPerkNameEquiv = fcPerkNameEquiv + ' Aim';
                }
                var equivalentCombo = [fcPerkNameEquiv, combo[1]].join(',');
                if (!_.has(junkPmByClass.unwantedBcGenericEtsPairs, equivalentCombo)) {
                  junkPmByClass.unwantedBcGenericEtsPairs[equivalentCombo] = {
                    fivePa: 0,
                    fourPa: 0,
                    fourPaIDs: [],
                    fivePaIDs: [],
                    combo: combo
                  };
                }
                var ids = junkPmByClass.unwantedBcGenericEtsPairs[equivalentCombo][isFourPa ? 'fourPaIDs' : 'fivePaIDs'];
                if (ids.indexOf(itemId) == -1) {
                  junkPmByClass.unwantedBcGenericEtsPairs[equivalentCombo][isFourPa ? 'fourPa' : 'fivePa']++;
                  ids.push(itemId);
                }

              });
              //console.log("combo", combo);
              //unwantedBcGenericFastPairs[keyName] = keyName;
            }
          });
          // console.log("junkPmByClass.unwantedBcGenericEtsPairs", junkPmByClass.unwantedBcGenericEtsPairs);

          /* Reason: Impossible Perk Pairs */
          if (
            junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) > -1 &&
            junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon) > -1 &&
            junkPerkPresets.uniqueWeaponSlots.indexOf(fcPerkTag) !=
            junkPerkPresets.uniqueWeaponSlots.indexOf(scWeapon)
          ) {
            junkPmByClass.impossiblePerkPairs[comboString] = comboString;
          }

          /* Reason Duplicate Perk Pair */
          if (!_.has(junkPmByClass.perkPairCount, comboString)) {
            junkPmByClass.perkPairCount[comboString] = {
              fivePa: 0,
              fourPa: 0,
              fivePaIDs: [],
              fourPaIDs: []
            };
          }
          var ids = junkPmByClass.perkPairCount[comboString][isFourPa ? 'fourPaIDs' : 'fivePaIDs'];
          if (ids.indexOf(itemId) == -1) {
            junkPmByClass.perkPairCount[comboString][isFourPa ? 'fourPa' : 'fivePa']++;
            ids.push(itemId);
          }

          /* Reason: Enhanced Pair
                      If you have Enhanced {{Perk1}} and {{Perk2}} then you don't need anything with {{Perk1}} {{Perk2}} pair ever
                      example: Enhanced HC Loader + Special Ammo Finder replaces all HC Loader + Special Ammo Finder combos
                      Enhanced Perks only affect the first column of the pair
                  */
          var isEnhancedCombo = combo[0].indexOf('Enhanced') > -1;
          if (isEnhancedCombo) {
            var normalCombo = _.clone(combo);
            normalCombo[0] = normalCombo[0].replace('Enhanced ', '');
            var keyName = normalCombo.join(',');
            junkPmByClass.unwantedPairBcEnhanced[keyName] = keyName;
          }
        });
      });
      junkPmByClass.impossiblePerkPairs = _.map(junkPmByClass.impossiblePerkPairs);
      //_junkPerkMaps.statsByClassName[classTypeName] = junkPmByClass;
      const pmStats = _.zipObject(
        _.keys(junkPmByClass),
        _.map(_.keys(junkPmByClass), (keyName) => {
          return _.keys(junkPmByClass[keyName]).length;
        })
      );
      console.log('junkPmByClass', classTypeName, pmStats);
    });

    //console.log("armor items", _junkPerkMaps.itemTypeNameCounts);
    const perkMapStats = _.zipObject(
      _.keys(_junkPerkMaps),
      _.map(_.keys(_junkPerkMaps), (keyName) => {
        return _.keys(_junkPerkMaps[keyName]).length;
      })
    );
    console.log('_junkPerkMaps', perkMapStats);
  }
  return _junkPerkMaps;
}

//return false for opacity 0, return true for opacity 1, opacity 1 means dismantle
function junkPerkFilter(item, dupeReport) {
  //console.log("dupeReport", dupeReport.length);

  if (item.bucket.sort == 'Armor' && item.tier === 'Legendary') {
    //if the item is marked with the tags set to make it skip analyze
    if (junkPerkPresets.ignoreTags.indexOf(item.dimInfo.tag) > -1) {
      return false;
    }

    initJunkPerks();

    const junkPmByClass = _junkPerkMaps.statsByClassName[item.classTypeName];
    const armorCombos = junkPmByClass.armorCombos[item.id];

    const hasArmorCombos = !armorCombos || (armorCombos && armorCombos.length === 0);

    // look up the count of instance of that item by type/name
    const itemTypeNameCount = junkPmByClass.itemTypeNameCounts[item.type][item.name];
    // if the item is unique regardless of whether it has combos the preset determines it has to be kept
    const isUniqueAlwaysKeep = itemTypeNameCount === 1 && junkPerkPresets.keepUniqueAlways;
    // the item is unique but keepUniqueALways set to false so it needs to have combos (perk pairs) to be kept
    const isUniqueNeedsComboToKeep = itemTypeNameCount === 1 && !junkPerkPresets.keepUniqueAlways && !hasArmorCombos;
    /*if (item.id == "6917529087059658459") {
      console.log("isUniqueAlwaysKeep", isUniqueAlwaysKeep, "isUniqueNeedsComboToKeep", isUniqueNeedsComboToKeep);
    }*/
    if (isUniqueAlwaysKeep || isUniqueNeedsComboToKeep) {
      //console.log("Skipping Unique Item", item.name, 'light:=' + item.Power, item.id, "No Armor Combos Available");
      return false;
    }


    // Only Y1 Armor has no perks to make this array zero so mark it for dismantle
    if (hasArmorCombos) {
      dupeReport.push(
        [
          item.classTypeName,
          item.bucket.type,
          item.name,
          'light:=' + item.basePower,
          item.id,
          'Reason: No Armor Combos Available'
        ].join(' ')
      );
      //console.log();
      return true;
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
      const fcPerkCount = junkPmByClass.armorPerkCount[fcPerkName];
      const scPerkCount = junkPmByClass.armorPerkCount[scPerkName];
      /*if (item.id == "6917529086013942993") {
                console.log("fcPerkCount", fcPerkCount, fcPerkName,  "scPerkCount", scPerkCount, scPerkName);
            }*/
      if (fcPerkCount == 1 || scPerkCount == 1) {
        comboReasons.push('Unique Perk');
        return true;
      }

      /* Explicitly Wanted Pair desipte unwanted Perk */
      const comboString = combo.join(',');
      const wantedPair = _.indexOf(_junkPerkMaps.wantedPerkPairs, comboString) > -1;
      if (wantedPair) {
        //TODO fix this logic so it doesn't repeat further down
        const perkPairCount = junkPmByClass.perkPairCount[comboString];
        if (isFourPa && (perkPairCount.fourPa >= 2 || perkPairCount.fivePa >= 1)) {
          comboReasons.push(
            'Duplicate Exp. Pair (' + perkPairCount.fourPa + '/' + perkPairCount.fivePa + ')'
          );
          return false;
        }
        //if the item is a 5pa then it can only be replaced by another 5pa armor piece
        if (!isFourPa && perkPairCount.fivePa >= 2) {
          comboReasons.push(
            'Dupe Exp. Pair In Other 5PA (' +
            perkPairCount.fourPa +
            '/' +
            perkPairCount.fivePa +
            ')'
          );
          return false;
        }
        //if the particular pair is wanted and it's not an existing dupe in other armor then return true to keep this unique perk pair
        comboReasons.push('Explicit Wanted Perk Pair');
        return true;
      }

      /* Unwanted Perk */
      const unwantedPerk = _.intersection(junkPerkPresets.unwantedPerks, combo).length > 0;
      if (unwantedPerk) {
        comboReasons.push('Unwanted Perk');
        return false;
      }

      /* Unwanted Pair */
      const unwantedPair = _.indexOf(_junkPerkMaps.unwantedPerkPairs, comboString) > -1;
      if (unwantedPair) {
        comboReasons.push('Unwanted Perk Pair');
        return false;
      }

      /* Impossible Pair */
      const impossiblePair = _.indexOf(junkPmByClass.impossiblePerkPairs, comboString) > -1;
      if (impossiblePair) {
        comboReasons.push('Impossible Pair');
        return false;
      }

      /* Enhanced Pair - Enhanced version of the perk pair available */
      const hasEnhancedPair = _.has(junkPmByClass.unwantedPairBcEnhanced, comboString);
      if (hasEnhancedPair) {
        comboReasons.push('Enhanced Pair Available');
        return false;
      }

      /* Generic ETS Available */
      //TODO: Check if 5PA item to ensure ETS is available in other 5PA only
      const hasGenericReplacement = _.has(junkPmByClass.unwantedBcGenericEtsPairs, comboString);
      if (hasGenericReplacement) {
        const replacementGenericEtsInfo = junkPmByClass.unwantedBcGenericEtsPairs[comboString];
        const rplcInfoComboCount = ' - ' + replacementGenericEtsInfo.combo + '(' + replacementGenericEtsInfo.fourPa + '/' + replacementGenericEtsInfo.fivePa + ')';
        if (isFourPa) {
          comboReasons.push('Generic ETS' + rplcInfoComboCount);
          return false;
        } else if (!isFourPa && replacementGenericEtsInfo.fivePa >= 2) {
          comboReasons.push('Generic ETS w 5PA ' + rplcInfoComboCount);
          return false;
        }
      }

      /* Duplicate Perk */
      const perkPairCount = junkPmByClass.perkPairCount[comboString];

      // if the item has a replacement 4pa piece it needs another 4pa or 5pa replacement to be considered a dupe
      if (isFourPa && (perkPairCount.fourPa >= 2 || perkPairCount.fivePa >= 1)) {
        comboReasons.push(
          'Duplicate Pair (' + perkPairCount.fourPa + '/' + perkPairCount.fivePa + ')'
        );
        return false;
      }
      //if the item is a 5pa then it can only be replaced by another 5pa armor piece
      if (!isFourPa && perkPairCount.fivePa >= 2) {
        comboReasons.push(
          'Dupe In Other 5PA (' + perkPairCount.fourPa + '/' + perkPairCount.fivePa + ')'
        );
        return false;
      }

      //if it passes all these conditions then the perk-pair is wanted
      comboReasons.push('Wanted Perk Pair');
      return true;
    });

    /*if (item.id == "6917529086431217491") {
            console.log("wantedCombos", wantedCombos, comboReasons);
        }*/

    // if the item has no wanted combos then it can safely be dismantled
    if (wantedCombos.length == 0) {
      let dupeText = [];
      //console.log("unwantedItem", item.name, 'light:=' + item.Power, item.id, armorCombos, comboReasons);
      dupeText.push(
        [
          item.classTypeName,
          item.bucket.type,
          item.name,
          'light:=' + item.basePower,
          item.id,
          'Reason: No Wanted Combos'
        ].join(' ')
      );
      _.each(armorCombos, (combo, index) => {
        var reason = comboReasons[index];
        dupeText.push('"' + combo.join('" "') + '" - ' + reason);
      });
      dupeText.push('');
      dupeReport.push(dupeText.join('\n'));
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