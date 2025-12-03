---@type color
local color = require("common/color")
---@type coords_helper
local coords_helper = require("common/utility/coords_helper")
---@type graphics_helper
local graphics_helper = require("common/utility/graphics_helper")
---@type dungeons_helper
local dungeons_helper = require("common/utility/dungeons_helper")

local DUNGEON_MAP_IDS = {
    ["The Stonevault"] = 501,
    ["The Dawnbreaker"] = 505,
    ["Grim Batol"] = 507,
    ["Ara-Kara"] = 503,
    ["City of Threads"] = 502,
    ["Priory of the Sacred Flame"] = 499,
    ["Cinderbrew Meadery"] = 506,
    ["Darkflame Cleft"] = 504,
    ["The Rookery"] = 500,
    ["Operation: Floodgate"] = 525,
    ["Eco-Dome Al'dani"] = 542,
    ["Theater of Pain"] = 382,
    ["Mechagon - Workshop"] = 370,
    ["The MOTHERLODE!!"] = 247,
    ["Halls of Atonement"] = 378,
    ["Mists of Tirna Scithe"] = 375,
    ["The Necrotic Wake"] = 376,
    ["Siege of Boralus"] = 353,
    ["Tazavesh: Streets of Wonder"] = 391,
    ["Tazavesh: So'leah's Gambit"] = 392,
}

local ROUTES = {}

local menu_elements = {
    main_tree = core.menu.tree_node(),
    enable_esp = core.menu.checkbox(true, "route_esp_enabled"),
    show_pull_numbers = core.menu.checkbox(true, "show_pull_numbers"),
    show_mob_names = core.menu.checkbox(false, "show_mob_names"),
    circle_radius = core.menu.slider_float(5.0, 25.0, 12.0, "circle_radius"),
    pull_colors_tree = core.menu.tree_node(),
    current_pull_color = core.menu.colorpicker(color.new(0, 255, 0, 180), "current_pull_color"),
    next_pull_color = core.menu.colorpicker(color.new(255, 255, 0, 120), "next_pull_color"),
    future_pull_color = core.menu.colorpicker(color.new(100, 100, 255, 80), "future_pull_color"),
    completed_pull_color = core.menu.colorpicker(color.new(100, 100, 100, 40), "completed_pull_color"),
    show_path_lines = core.menu.checkbox(true, "show_path_lines"),
    path_line_color = core.menu.colorpicker(color.new(255, 165, 0, 150), "path_line_color"),
}

local current_pull_index = 1
local active_route = nil

local function mdt_to_world(mdt_x, mdt_y, map_id, height_override)
    local map_pos = { x = mdt_x, y = mdt_y }
    
    local world_2d = core.game_ui.get_world_pos_from_map_pos(map_id, map_pos)
    if not world_2d then
        return nil
    end
    
    local z = height_override
    if not z then
        local local_player = core.object_manager.get_local_player()
        if local_player then
            z = local_player:get_position().z + 2
        else
            z = 50
        end
    end
    
    local world_pos = { x = world_2d.x, y = world_2d.y, z = z }
    local ground_z = core.get_height_for_position(world_pos)
    if ground_z and ground_z > 0 then
        world_pos.z = ground_z + 0.5
    end
    
    return world_pos
end

local function get_pull_color(pull_index)
    if pull_index < current_pull_index then
        return menu_elements.completed_pull_color:get_color()
    elseif pull_index == current_pull_index then
        return menu_elements.current_pull_color:get_color()
    elseif pull_index == current_pull_index + 1 then
        return menu_elements.next_pull_color:get_color()
    else
        return menu_elements.future_pull_color:get_color()
    end
end

local function calculate_pull_center(enemies)
    if not enemies or #enemies == 0 then
        return nil
    end
    
    local sum_x, sum_y, sum_z = 0, 0, 0
    local count = 0
    
    for _, enemy in ipairs(enemies) do
        if enemy.world_pos then
            sum_x = sum_x + enemy.world_pos.x
            sum_y = sum_y + enemy.world_pos.y
            sum_z = sum_z + enemy.world_pos.z
            count = count + 1
        end
    end
    
    if count == 0 then
        return nil
    end
    
    return {
        x = sum_x / count,
        y = sum_y / count,
        z = sum_z / count
    }
end

local function render_route()
    if not active_route or not active_route.pulls then
        return
    end
    
    local radius = menu_elements.circle_radius:get_value()
    local show_numbers = menu_elements.show_pull_numbers:get_state()
    local show_names = menu_elements.show_mob_names:get_state()
    local show_lines = menu_elements.show_path_lines:get_state()
    
    local pull_centers = {}
    
    for pull_idx, pull in ipairs(active_route.pulls) do
        local pull_color = get_pull_color(pull_idx)
        
        for _, enemy in ipairs(pull.enemies) do
            if enemy.world_pos then
                core.graphics.circle_3d(enemy.world_pos, radius, pull_color, 2.0, 2.5)
                
                if show_names and pull_idx >= current_pull_index then
                    local label = enemy.name or ("NPC " .. tostring(enemy.id))
                    graphics_helper:draw_text_outlined_3d(label, enemy.world_pos, {
                        text_size = 14,
                        text_color = color.white(200)
                    })
                end
            end
        end
        
        local center = calculate_pull_center(pull.enemies)
        if center then
            pull_centers[pull_idx] = center
            
            if show_numbers then
                local label = "Pull " .. tostring(pull_idx)
                if pull.note then
                    label = label .. "\n" .. pull.note
                end
                graphics_helper:draw_text_outlined_3d(label, center, {
                    text_size = 20,
                    text_color = pull_color
                })
            end
        end
    end
    
    if show_lines then
        local line_color = menu_elements.path_line_color:get_color()
        for i = 1, #pull_centers - 1 do
            local from = pull_centers[i]
            local to = pull_centers[i + 1]
            if from and to then
                core.graphics.line_3d(from, to, line_color, 2.0, 2.5, true)
            end
        end
    end
end

local function load_route(route_data, dungeon_name)
    if not route_data or not route_data.pulls then
        core.log_warning("[RouteESP] Invalid route data")
        return false
    end
    
    local map_id = DUNGEON_MAP_IDS[dungeon_name]
    if not map_id then
        core.log_warning("[RouteESP] Unknown dungeon: " .. tostring(dungeon_name))
        return false
    end
    
    active_route = {
        dungeon = dungeon_name,
        map_id = map_id,
        pulls = {}
    }
    
    for pull_idx, pull in ipairs(route_data.pulls) do
        local converted_pull = {
            index = pull_idx,
            enemies = {},
            note = pull.note or "",
            total_count = pull.total_count or 0
        }
        
        for _, enemy in ipairs(pull.enemies or {}) do
            local world_pos = mdt_to_world(enemy.x, enemy.y, map_id, nil)
            
            table.insert(converted_pull.enemies, {
                name = enemy.name,
                id = enemy.id,
                mdt_x = enemy.x,
                mdt_y = enemy.y,
                world_pos = world_pos,
                count = enemy.count or 0
            })
        end
        
        table.insert(active_route.pulls, converted_pull)
    end
    
    current_pull_index = 1
    core.log("[RouteESP] Loaded route for " .. dungeon_name .. " with " .. #active_route.pulls .. " pulls")
    return true
end

local function check_pull_completion()
    if not active_route then return end
    
    local local_player = core.object_manager.get_local_player()
    if not local_player then return end
    
    local objects = core.object_manager.get_all_objects()
    local current_pull = active_route.pulls[current_pull_index]
    if not current_pull then return end
    
    local all_dead = true
    for _, enemy in ipairs(current_pull.enemies) do
        for _, obj in ipairs(objects) do
            if obj:get_entry_id() == enemy.id then
                if obj:is_alive() then
                    all_dead = false
                    break
                end
            end
        end
        if not all_dead then break end
    end
    
    if all_dead and current_pull_index < #active_route.pulls then
        current_pull_index = current_pull_index + 1
        core.log("[RouteESP] Advanced to Pull " .. tostring(current_pull_index))
    end
end

local function on_update()
    if not menu_elements.enable_esp:get_state() then
        return
    end
    
    if dungeons_helper:is_mythic_plus_dungeon() then
        check_pull_completion()
    end
end

local function on_render()
    if not menu_elements.enable_esp:get_state() then
        return
    end
    
    render_route()
end

local function on_render_menu()
    menu_elements.main_tree:render("Route Assistant ESP", function()
        menu_elements.enable_esp:render("Enable ESP Overlay")
        menu_elements.show_pull_numbers:render("Show Pull Numbers")
        menu_elements.show_mob_names:render("Show Mob Names")
        menu_elements.circle_radius:render("Circle Radius", "%.1f")
        menu_elements.show_path_lines:render("Show Path Lines")
        
        menu_elements.pull_colors_tree:render("Pull Colors", function()
            menu_elements.current_pull_color:render("Current Pull")
            menu_elements.next_pull_color:render("Next Pull")
            menu_elements.future_pull_color:render("Future Pulls")
            menu_elements.completed_pull_color:render("Completed Pulls")
            menu_elements.path_line_color:render("Path Line")
        end)
    end)
end

core.register_on_update_callback(on_update)
core.register_on_render_callback(on_render)
core.register_on_render_menu_callback(on_render_menu)

_G.RouteESP = {
    load_route = load_route,
    set_current_pull = function(idx) current_pull_index = idx end,
    get_current_pull = function() return current_pull_index end,
    next_pull = function() 
        if active_route and current_pull_index < #active_route.pulls then
            current_pull_index = current_pull_index + 1
        end
    end,
    prev_pull = function()
        if current_pull_index > 1 then
            current_pull_index = current_pull_index - 1
        end
    end,
    clear_route = function() active_route = nil end,
    mdt_to_world = mdt_to_world,
    DUNGEON_MAP_IDS = DUNGEON_MAP_IDS,
}

core.log("[RouteESP] Route Assistant ESP loaded successfully!")
