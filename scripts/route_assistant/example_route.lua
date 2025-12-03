local RouteESP = _G.RouteESP

local STONEVAULT_ROUTE = {
    dungeon = "The Stonevault",
    pulls = {
        {
            note = "First pull - Invaders and Golem",
            enemies = {
                { name = "Cursedheart Invader", id = 212389, x = 415.05, y = -94.20, count = 5 },
                { name = "Cursedheart Invader", id = 212389, x = 427.45, y = -94.72, count = 5 },
                { name = "Earth Infused Golem", id = 210109, x = 420.81, y = -102.14, count = 10 },
            },
            total_count = 20
        },
        {
            note = "Second pull - Before first boss",
            enemies = {
                { name = "Cursedheart Invader", id = 212389, x = 415.65, y = -128.03, count = 5 },
            },
            total_count = 5
        },
        {
            note = "Pack before Skarmorak",
            enemies = {
                { name = "Cursedheart Invader", id = 212389, x = 411.50, y = -147.04, count = 5 },
                { name = "Cursedheart Invader", id = 212389, x = 420.96, y = -146.67, count = 5 },
                { name = "Cursedheart Invader", id = 212389, x = 430.43, y = -146.62, count = 5 },
            },
            total_count = 15
        },
    }
}

if RouteESP then
    local success = RouteESP.load_route(STONEVAULT_ROUTE, "The Stonevault")
    if success then
        core.log("[Example] Stonevault route loaded successfully!")
    end
end
