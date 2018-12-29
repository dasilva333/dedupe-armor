[WIP] Tool that lists armor that's safe to dismantle

Hey guys I've been out of the scene for a while quietly enjoying DIM and DIM Beta as a great and robust tool to manage your inventory. The only problem I had was that I don't have a very good way to manage what armor perks I have and don't have, what perks I want and don't want and I don't want to keep a mental map of all the perk pairs I have so I can decide whether this new piece that dropped is worthy of keeping or not. So I created a NodeJs script that will process the output armor file that DIM produces (destinyArmor.csv) and create a report that shows you what armor you can safely dismantle based on a few principles outlined below and then explained in detail in their respective section. Please note that this tool does not care for or take into consideration two additional parts of the armor which is the resistance type and the stats archetype (mobility etc).

- Duplicate Perks: You have two armor pieces with exact perks in the first and second column, it'll suggest you delete one or the other, the script further expands this concept by looking at the individual pairs and finding replacements for it in other armor pieces.
- Unwanted Perks: This is a configurable list of perks that can exist in column 1 or 2 that allows the report to remove any armor with that perk from the list of possible pairs you're considering to keep. 
- Unwanted Pairs: You can also configure unwanted pairs such as Power Reload + Sword Scavenger to remove them from consideration as a viable pair.
- Impossible Perks: There's certain pairs that can be rolled that are literally impossible to use so the script finds those pairs and suggests you delete it if the other 3 combinations are also no good.
- Redundant Perks: So certain perks have 3 tiers of improvement such as reload speed. If you have enhanced hand cannon loader for example then you don't need Hand Cannon Loader. Also if you have Light Arms Loader and not the Enhanced version then you also don't need HC Loader.
- Raid Gear & DC Gear (5-perk-armor): The script will priotize armor with 3-perks 1st column, 2-perks 2nd column (5-perk-armor or 5pa) over 4pa armor. So if you have a 5pa piece that can achieve everything the 4pa is capable of then it'll suggest you delete the 4pa armor. 5pa armor will only be marked for deletion if there is other 5pa armor that can achieve equal or better results.
- Unique Clause: No matter how bad the roll is or how many reasons there is for deletion if it's the only piece of it's kind the report will exclude it from the list so that you can maintain a full set of armor for everything.

[Duplicate Perks]
- So let's suppose you have a piece of armor that has Shotgun/Hand Cannon Loader + Special/Heavy Ammo Finder
- That means the armor piece can have 4 different combinations:
SG Loader + SA Finder, HC Loader + SA Finder, HC Loader + HA Finder and SG Loader + HA Finder
- The script can find anywhere from 1 to 4 other pieces of armor that can create that combination
- The idea is that if you have other armor that can do what those perks are then you don't really need it

[Unwanted Perks]
- This part is subjective and can be freely modified, I created a list of perks that I think are useless in the overall scheme of things or not that useful that it warrants having it included in every combination.
//these archetypes have plenty of ammo so very rare to need to scavenge/reserve it
"Auto Rifle Scavenger", "Pulse Rifle Scavenger", "Scout Rifle Scavenger",
"Auto Rifle Reserves", "Pulse Rifle Reserves", "Scout Rifle Reserves",
//I rarely do melee as a hunter so remove those perks
"Impact Induction", "Light Reactor", "Invigoration", 
//Bows don't need reload speed improvements, plenty of ammo so no need to buff that either
"Bow Reloader", "Bow Reserves", "Arrow Scavenger",
//who needs to really aim these anyway?
"Unflinching Grenade Launcher Aim", "Unflinching Power Aim",
//Primary Ammo is already plentiful only very specific cases where you'd run out of bricks
"Primary Ammo Finder",
//making a spec that affects all Power weapons that are rarely used seems like a waste
"Unflinching Power Aim", "Power Dexterity"
- So for example if the armor piece has Primary Ammo Finder (PAF) and AR Scavenger then it's considered a piece that has no good combinations because they both exist in column 2 so you can't take anything from column 1 and 2 to make something that works.

[Impossible Perks]
- There are 4 weapon types as of now that can only exist in the Heavy slot.
- Linear Fusion Rifles, Rocket Launchers, Machine Guns and Swords.
- If you have a piece of armor that has let's say Linear Fusion Rifle Loader + Sword Scavenger then that's an impossible perk pair.
- It's considered impossible because you can't have both weapon types equipped at the same time.
- The script finds combinations that are impossible and removes them from consideration as something you'd want
- The overall idea is if the armor piece has no wanted combinations then it's of no use

[Redundant Perks]
- Info gathered from: https://www.reddit.com/r/DestinyTheGame/comments/9oc1ki/massive_breakdown_of_gauntlet_reload_speed_perks/
- This one is tricky because there's 2 or 3 tiers of improvement for redundant perks.
- This part of the code hasn't been finalized and it still under development.
- Tier 1 is perks that give 'slightly' improved behaviour.
- Tier 2 is perks that improve the behaviour.
- Tier 3 is perks that greatly improve the behaviour.
- So if you have Enhanced HC Loader (tier 3) + Special Ammo finder for example, you don't need any armor with HC Loader (tier 2) + Special Ammo Finder because you already have something that's better.
- If you have Light Arms Loader (tier 2) + SA Finder you also don't need HC Loader + SA Finder because you have something that's equivalent improvement if not better because it can target multiple slots.
- Lastly Kinetic/Energy/Power Loader is only wanted if you don't have existing armor that can target the weapons for that existing perk, this part is still in development.

[Raid and Dreaming City Enhanced Armor]
- There is a few special conditions for these armor sets because they drop with 5 perks (5pa) instead of 4 and because they can drop with enhanced versions of certain perks.
- For example if you have Enhanced HC Loader + SA Finder then you don't need any armor that has HC Loader + SA Finder because you have the better version already.
- I have a goal of eventually having only 5-perk armor sets in an effort to reduce the amount of space each piece takes by optimizing with the 5th perk and by having every enhanced version of the perk 
- The script will only suggest you delete 5pa pieces if there is existing 5pa pieces that can achieve the same results.

[Unique Clause]
- For the sake of bounties and collections I made it so that no matter how bad or how duplicate the item is, if it's the only one of it's kind it won't be suggested for deletion.
- The idea here is to have a full armor set of everything in case the need arises to have to wear it for a quest.

[Caveats]
- This tool does not take into consideration the mobility/recovery/resillience aspect of the armor
- Also does not take into consideration the damage resistance of that armor
- This tool will not warn you when you are possibly deleting a unique combination or unique armor piece, it suggests deletion assuming you're going to delete one or the other. It doesn't keep track of what it's suggesting you delete therefore it might suggest you to delete two different pieces that have a unique combination of perks or armor.
- This is a real example of what you might see in the report:
hunter Gauntlets "Wing Contender" light:=647 items:3 hasMod:false 6917529084207890703
"Light Arms Loader" "Sword Scavenger" 2
"Light Arms Loader" "Linear Fusion Rifle Scavenger" 2

hunter Gauntlets "Wing Contender" light:=632 items:8 hasMod:false 6917529086085362547
"Light Arms Loader" "Sniper Rifle Scavenger" 2
"Light Arms Loader" "Linear Fusion Rifle Scavenger" 2

So basically it's saying I can delete the 647 because there is 2 armor pieces (incuding itself) that can provide LAL + LF Scav. This 2 actually means there's 1 other piece that can achieve this combination, so if the report shows the 632 is also marked for deletion you have to be aware that you're supposed to delete one or the other otherwise you lose LAL + LFS because those two have overlapping pairs. Also assuming I only have two Wing Contender Gauntlets if you delete both you won't have any more Wing Contender Gauntlets.
- Suggested workflow for dismantling is to remove anything marked No Combinations first, delete everything with less than 4 combinations second, and then delete everything that has 4 pairs last, while doing so it helps to re run the report after dismantling the low hanging fruit to ensure you didn't miss any overlap.
- You can also copy and paste stuff such as "Wing Contender" light:=632 into DIM to filter for the item you're looking for.
- You can also filter for stuff such as: "Light Arms Loader" "Sniper Rifle Scavenger" to see all the pieces that can achieve that perk pair.

[Benefits]
- I started doing this to make space in my vault and help me figure out what's worth deleting.
- This has evolved in other benefits such as increasing the light level of all my existing armor using only glimmer, if it suggests I dismantle 650 gear and it's not modded I'll just infuse it to an existing piece of gear of the same kind while cherry picking the most useful combination for right now.
- My rule of thumb is if the armor piece marked for deletion is 20 light levels higher than my lowest light level piece of the same type (631 Prodigal Cloak) and I have a 520 cloak in the vault I can go ahead and infuse the 520 with the only exception is if it has a mod then I'll delete it.
- Less hassle having to analyze every perk and keep mental note of what you have and don't have and what's useful and not useful and what the names are for and what they mean as well as a complex matrix of unwanted perks, equivalent perks, tiers and various other factors outlined above.
- Armor collection starts to evolve into more meaningful and useful overall perks with the eventual goal of having armor sets where every perk and perk combination in it is considered useful.
- If you consider 5pa armor can produce 6 pairs and 4pa armor can produce 4 pairs the ultimate goal is to have armor that has 6 and 4 useful pairs rather than having a useless pair in them.

[DIM Integration]
- I've been working on porting this script to DIM as a filter, it's working however because this script is still in development I have to port my latest changes to the filter version.
- The filter version makes DIM pretty slow but it helps for avoiding having to constantly create a new report because you can dismantle, refresh, and see if anything that was marked for dismantle is still marked.
- The filter is called is:junkperks so you put that into the search and it'll highlight items that are safe to dismantle based on the principles outlined above.
- You can find my custom branch here: https://github.com/dasilva333/DIM
- You can find how to run this version locally here: https://github.com/dasilva333/DIM/blob/master/docs/CONTRIBUTING.md

[Script Install Instructions]
- Visit my Github project
- Download the zip file https://github.com/dasilva333/dedupe-armor/archive/master.zip
- Extract it anywhere you want
- Keep a note of where it is because you have to put your armor file (destinyArmor.csv) into it
- Visit the NodeJS website and install it https://nodejs.org/en/download/
- Visit the folder it was extracted to from the command line
- Type 'npm install' to set up the libraries (lodash) for use with the script.

[Usage Instructions]
- Make sure DIM is refreshed and up to date
- Click the Cog wheel to visit Settings
- Scroll to the bottom 
- Click on Armor under Spreadsheets
- File will be downloaded to your system
- Copy this file to the place you extracted the project overwriting the existing destinyArmor.csv file
- On Windows simply click create_report.bat, on any other system run the command "node index.js" in that folder.
- Report.txt file will be created/updated in that folder with the latest armor pieces that can be deleted.
- Rinse and repeat as you get new armor just put in the vault for later review.

[Code Review]
You may find the direct link to the main NodeJs Javascript source file here:
https://github.com/dasilva333/dedupe-armor/blob/master/index.js