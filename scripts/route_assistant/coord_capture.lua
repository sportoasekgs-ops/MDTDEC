---@type color
local color = require("common/color")

local menu_elements = {
    main_tree = core.menu.tree_node(),
    enable_capture = core.menu.checkbox(false, "coord_capture_enabled"),
    capture_key = core.menu.keybind(0x74, false, "capture_coords_key"),
    show_cursor_pos = core.menu.checkbox(true, "show_cursor_pos"),
}

local captured_coords = {}
local last_capture_time = 0

local function capture_coordinate()
    local world_pos = core.graphics.get_cursor_world_position()
    if not world_pos then
        core.log_warning("[CoordCapture] Could not get cursor world position")
        return
    end
    
    local local_player = core.object_manager.get_local_player()
    local map_id = core.get_map_id()
    local dungeon_name = core.get_instance_name()
    
    local entry = {
        x = world_pos.x,
        y = world_pos.y,
        z = world_pos.z,
        map_id = map_id,
        dungeon = dungeon_name,
        timestamp = core.time()
    }
    
    table.insert(captured_coords, entry)
    
    local log_msg = string.format(
        "[CoordCapture] #%d: x=%.2f, y=%.2f, z=%.2f (Map: %d - %s)",
        #captured_coords,
        world_pos.x,
        world_pos.y,
        world_pos.z,
        map_id,
        dungeon_name or "Unknown"
    )
    core.log(log_msg)
    
    local filename = "coord_captures_" .. tostring(map_id) .. ".txt"
    local line = string.format(
        "{ x = %.4f, y = %.4f, z = %.4f }, -- %s #%d\n",
        world_pos.x,
        world_pos.y,
        world_pos.z,
        dungeon_name or "Unknown",
        #captured_coords
    )
    core.write_log_file(filename, line)
end

local function on_update()
    if not menu_elements.enable_capture:get_state() then
        return
    end
    
    if menu_elements.capture_key:is_key_pressed() then
        local current_time = core.time()
        if current_time - last_capture_time > 0.3 then
            capture_coordinate()
            last_capture_time = current_time
        end
    end
end

local function on_render()
    if not menu_elements.enable_capture:get_state() then
        return
    end
    
    if menu_elements.show_cursor_pos:get_state() then
        local world_pos = core.graphics.get_cursor_world_position()
        if world_pos then
            local screen_pos = { x = 20, y = 100 }
            local text = string.format(
                "Cursor: x=%.2f, y=%.2f, z=%.2f\nCaptured: %d points",
                world_pos.x,
                world_pos.y,
                world_pos.z,
                #captured_coords
            )
            core.graphics.text_2d(text, screen_pos, 16, color.white(255), false)
        end
    end
    
    local map_id = core.get_map_id()
    local local_player = core.object_manager.get_local_player()
    if local_player then
        local pos = local_player:get_position()
        local screen_pos = { x = 20, y = 150 }
        local text = string.format(
            "Player: x=%.2f, y=%.2f, z=%.2f\nMap ID: %d",
            pos.x,
            pos.y,
            pos.z,
            map_id
        )
        core.graphics.text_2d(text, screen_pos, 14, color.yellow(255), false)
    end
end

local function on_render_menu()
    menu_elements.main_tree:render("Coordinate Capture", function()
        menu_elements.enable_capture:render("Enable Coordinate Capture")
        menu_elements.capture_key:render("Capture Key (F5)")
        menu_elements.show_cursor_pos:render("Show Cursor Position")
        
        if core.menu.button("clear_coords"):render("Clear Captured Coords") then
            captured_coords = {}
            core.log("[CoordCapture] Cleared all captured coordinates")
        end
        
        if core.menu.button("export_coords"):render("Export to Console") then
            core.log("--- Captured Coordinates ---")
            for i, coord in ipairs(captured_coords) do
                core.log(string.format(
                    "%d: { x = %.4f, y = %.4f, z = %.4f },",
                    i, coord.x, coord.y, coord.z
                ))
            end
            core.log("--- End of Coordinates ---")
        end
    end)
end

core.register_on_update_callback(on_update)
core.register_on_render_callback(on_render)
core.register_on_render_menu_callback(on_render_menu)

_G.CoordCapture = {
    get_coords = function() return captured_coords end,
    clear = function() captured_coords = {} end,
    capture = capture_coordinate,
}

core.log("[CoordCapture] Coordinate Capture utility loaded!")
