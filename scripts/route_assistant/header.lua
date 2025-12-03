local plugin = {}

plugin["name"] = "Route Assistant ESP"
plugin["version"] = "1.0.0"
plugin["author"] = "MDT Route Visualizer"
plugin["load"] = true

local local_player = core.object_manager.get_local_player()
if not local_player then
    plugin["load"] = false
    return plugin
end

return plugin
