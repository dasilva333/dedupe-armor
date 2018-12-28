module.exports = {
    //unwanted individual single perks (any column)
    unwantedPerks: [
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
    ],
    //unwanted combos (first column + second column)
    unwantedPerkPairs: [
        ["Power Weapon Loader", "Sword Scavenger"]
    ],
    // RL/LF/Sword Perk + non-matching RL/LF/Sword Perk
    // real example: LF loader + sword scavener
    uniqueWeaponSlots: ["Sword", "Rocket", "Linear", "Machine"],

    // if you have the generic type you don't need the specific type (these generic are the same speed as the specific)
    genericFastTypeNames: {
        'Rifle': ['Scout Rifle', 'Auto Rifle', 'Pulse Rifle', 'Sniper Rifle', 'Linear Fusion Rifle'],
        'Large Weapon': ['Rocket Launcher', 'Grenade Launcher', 'Shotgun'],
        'Light Arms': ['Hand Cannon', 'Submachine Gun', 'Sidearm']
    },
    //if you have all the specific types you don't need the generic type
    genericTypeNames: {
        'Kinetic Weapon': [
            'Scout Rifle',
            'Auto Rifle',
            'Hand Cannon',
            'Pulse Rifle',
            'Sniper Rifle',
            'Shotgun',
            'Bow',
            'Submachine Gun',
            'Sidearm',
            'Grenade Launcher'
        ],
        'Energy Weapon': [
            'Scout Rifle',
            'Auto Rifle',
            'Hand Cannon',
            'Pulse Rifle',
            'Sniper Rifle',
            'Shotgun',
            'Bow',
            'Submachine Gun',
            'Sidearm',
            'Grenade Launcher',
            'Fusion Rifle'
        ],
        'Power Weapon': [
            'Rocket Launcher',
            'Grenade Launcher',
            'Linear Fusion Rifle',
            'Sword',
            'Machine Gun',
            'Shotgun',
            'Sniper Rifle'
        ],
        'Oversize Weapon': ['Rocket Launcher', 'Grenade Launcher', 'Shotgun', 'Bow'],
        'Scatter Projectile': [
            'Auto Rifle',
            'Submachine Gun',
            'Pulse Rifle',
            'Sidearm',
            'Fusion Rifle'
        ],
        'Precision Weapon': [
            'Hand Cannon',
            'Scout Rifle',
            'Trace Rifle',
            'Bow',
            'Linear Fusion Rifle',
            'Sniper',
            'Shotgun'
        ]
    }
}