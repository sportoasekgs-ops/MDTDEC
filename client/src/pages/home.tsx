import { useState } from "react";
import { decodeMDT, resolveCoordinates, generateSylvanasLuaCode, DUNGEON_METADATA, type ResolvedRoute } from "@/lib/mdt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Shield, Skull, Map as MapIcon, Code, Info, MapPin, Target, Download, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function luaTableToArray(obj: any): any[] {
  if (!obj || typeof obj !== 'object') return [];
  if (Array.isArray(obj)) return obj;
  const keys = Object.keys(obj).filter(k => !isNaN(Number(k))).sort((a, b) => Number(a) - Number(b));
  return keys.map(k => obj[k]);
}

function countPulls(pulls: any): number {
  if (!pulls) return 0;
  if (Array.isArray(pulls)) return pulls.length;
  return Object.keys(pulls).filter(k => !isNaN(Number(k))).length;
}

function generateLuaExport(route: ResolvedRoute, useSylvanasVec3: boolean = false): string {
  if (useSylvanasVec3) {
    return generateSylvanasLuaCode(route);
  }
  
  const dungeonVar = route.dungeonName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  
  let lua = `-- Route for ${route.dungeonName}\n`;
  lua += `-- Generated from MDT Decoder\n`;
  lua += `-- Total Forces: ${route.totalCount}\n`;
  lua += `-- Map ID: ${route.mapID}\n`;
  lua += `-- Scale Multiplier: ${route.scaleMultiplier}\n`;
  lua += `-- Coordinates: MDT canvas pixels (840x555)\n`;
  lua += `\n`;
  
  lua += `local ${dungeonVar}_ROUTE = {\n`;
  lua += `    dungeon = "${route.dungeonName}",\n`;
  lua += `    map_id = ${route.mapID},\n`;
  lua += `    scale_multiplier = ${route.scaleMultiplier},\n`;
  lua += `    pulls = {\n`;
  
  for (const pull of route.pulls) {
    lua += `        {\n`;
    lua += `            note = "Pull ${pull.pullIndex}",\n`;
    lua += `            enemies = {\n`;
    for (const enemy of pull.enemies) {
      lua += `                { name = "${enemy.name}", id = ${enemy.id}, x = ${enemy.x.toFixed(2)}, y = ${enemy.y.toFixed(2)}, normalizedX = ${(enemy.normalizedX || 0).toFixed(6)}, normalizedY = ${(enemy.normalizedY || 0).toFixed(6)}, sublevel = ${enemy.sublevel}, count = ${enemy.count} },\n`;
    }
    lua += `            },\n`;
    lua += `            total_count = ${pull.totalCount}\n`;
    lua += `        },\n`;
  }
  
  lua += `    }\n`;
  lua += `}\n\n`;
  
  lua += `-- Load route into ESP\n`;
  lua += `if _G.RouteESP then\n`;
  lua += `    _G.RouteESP.load_route(${dungeonVar}_ROUTE, "${route.dungeonName}")\n`;
  lua += `end\n`;
  
  return lua;
}

export default function Home() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<any>(null);
  const [resolvedRoute, setResolvedRoute] = useState<ResolvedRoute | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [useSylvanasVec3, setUseSylvanasVec3] = useState(false);
  const [vec3Acknowledged, setVec3Acknowledged] = useState(false);

  const handleDecode = async () => {
    if (!input) return;
    
    setIsDecoding(true);
    setError(null);
    setData(null);
    setResolvedRoute(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const result = decodeMDT(input);
      setData(result);
      
      if (result) {
        const resolved = resolveCoordinates(result);
        setResolvedRoute(resolved);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDecoding(false);
    }
  };

  const handleCopyLua = async () => {
    if (!resolvedRoute) return;
    const lua = generateLuaExport(resolvedRoute, useSylvanasVec3);
    await navigator.clipboard.writeText(lua);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadLua = () => {
    if (!resolvedRoute) return;
    const lua = generateLuaExport(resolvedRoute, useSylvanasVec3);
    const blob = new Blob([lua], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${resolvedRoute.dungeonName.replace(/[^a-zA-Z0-9]/g, '_')}_route.lua`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-6 md:p-12 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <header className="space-y-2 text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-3">
          <div className="p-3 bg-primary/20 rounded-lg border border-primary/30">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-white tracking-tight">MDT <span className="text-primary">DECODER</span></h1>
            <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Route Analysis Protocol // v1.0</p>
          </div>
        </div>
      </header>

      <main className="grid lg:grid-cols-12 gap-8">
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-secondary" />
                Input Stream
              </CardTitle>
              <CardDescription>Paste your Mythic Dungeon Tools string below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea 
                placeholder="!WA:2!..." 
                className="font-mono text-xs min-h-[300px] bg-black/40 border-primary/10 focus:border-primary/50 resize-none text-green-500/80 placeholder:text-muted-foreground/20"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              <Button 
                className="w-full h-12 font-display text-lg uppercase tracking-wider relative overflow-hidden group" 
                onClick={handleDecode}
                disabled={isDecoding || !input}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                {isDecoding ? "Decrypting..." : "Initialize Decode"}
              </Button>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
              <Info className="h-4 w-4" />
              <AlertTitle>Decryption Failed</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="p-4 rounded-lg border border-border/50 bg-accent/20 text-xs text-muted-foreground space-y-2">
            <div className="flex items-center gap-2 text-secondary">
              <Info className="w-4 h-4" />
              <span className="font-bold uppercase">System Note</span>
            </div>
            <p>
              Standard MDT strings contain route metadata and enemy IDs. 
              <span className="text-primary/80"> Exact coordinates</span> are typically stored in the addon's local database, not the string itself, unless custom drawings are included.
            </p>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-7">
          <AnimatePresence mode="wait">
            {data ? (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Metadata Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-1 md:col-span-2">
                    <div className="text-xs text-primary uppercase tracking-wider">Dungeon</div>
                    <div className="text-lg font-mono font-bold truncate" title={resolvedRoute?.dungeonName || "Unknown"}>
                      {resolvedRoute?.dungeonName || `ID: ${data.dungeonIdx || data.value?.currentDungeonIdx || "?"}`}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      Map ID: {resolvedRoute?.mapID || "?"} | Scale: {resolvedRoute?.scaleMultiplier?.toFixed(2) || "1.00"}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
                    <div className="text-xs text-secondary uppercase tracking-wider">Pulls</div>
                    <div className="text-2xl font-mono font-bold text-secondary">
                      {resolvedRoute?.pulls?.length || countPulls(data.pulls || data.value?.pulls)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/30 border border-accent space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Total Forces</div>
                    <div className="text-2xl font-mono font-bold">{resolvedRoute?.totalCount || "—"}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/30 border border-accent space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Author</div>
                    <div className="text-lg font-mono font-bold truncate">{data.text || data.value?.text || "—"}</div>
                  </div>
                </div>

                <Tabs defaultValue="coords" className="w-full">
                  <TabsList className="w-full grid grid-cols-4 bg-black/40 border border-border/50">
                    <TabsTrigger value="coords" data-testid="tab-coords">Coordinates</TabsTrigger>
                    <TabsTrigger value="pulls" data-testid="tab-pulls">Route Pulls</TabsTrigger>
                    <TabsTrigger value="lua" data-testid="tab-lua">Lua Export</TabsTrigger>
                    <TabsTrigger value="raw" data-testid="tab-raw">Raw Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="coords" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <ScrollArea className="h-full p-6">
                        {resolvedRoute && resolvedRoute.pulls.length > 0 ? (
                          <div className="space-y-6">
                            {resolvedRoute.pulls.map((pull) => (
                              <div key={pull.pullIndex} className="group relative pl-6 border-l-2 border-secondary/30 hover:border-secondary transition-colors">
                                <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-secondary/50 group-hover:border-secondary group-hover:scale-110 transition-all" />
                                
                                <div className="flex items-baseline justify-between gap-2 mb-3">
                                  <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
                                    <Target className="w-4 h-4 text-secondary" />
                                    Pull {pull.pullIndex}
                                  </h3>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="bg-secondary/5 border-secondary/20 text-secondary">
                                      {pull.enemies.length} mobs
                                    </Badge>
                                    <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                      +{pull.totalCount} forces
                                    </Badge>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  {pull.enemies.map((enemy, i) => (
                                    <div 
                                      key={`${enemy.enemyIdx}-${enemy.cloneIdx}-${i}`} 
                                      className="flex items-center justify-between gap-4 bg-black/30 p-3 rounded-lg border border-border/30"
                                      data-testid={`enemy-${pull.pullIndex}-${i}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Skull className="w-4 h-4 text-destructive/70 shrink-0" />
                                        <div className="min-w-0">
                                          <div className="font-medium text-white truncate">{enemy.name}</div>
                                          <div className="text-xs text-muted-foreground font-mono">
                                            NPC #{enemy.id} | Clone {enemy.cloneIdx}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-1 text-xs font-mono shrink-0 text-right">
                                        <div className="flex items-center gap-1.5 text-secondary">
                                          <MapPin className="w-3 h-3" />
                                          <span className="text-white">{enemy.x.toFixed(1)}, {enemy.y.toFixed(1)}</span>
                                          {enemy.sublevel > 1 && (
                                            <Badge variant="secondary" className="text-xs">
                                              L{enemy.sublevel}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                          <span className="text-xs">norm:</span>
                                          <span className="text-green-400/80">{(enemy.normalizedX || 0).toFixed(4)}, {(enemy.normalizedY || 0).toFixed(4)}</span>
                                          {enemy.count > 0 && (
                                            <span className="text-primary">+{enemy.count}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground space-y-4">
                            <MapIcon className="w-12 h-12 opacity-20" />
                            <div className="text-center">
                              <p>Could not resolve coordinates for this route.</p>
                              <p className="text-xs opacity-50 max-w-xs mx-auto mt-2">
                                The dungeon may not be in our database, or the route format may not be recognized.
                              </p>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </Card>
                  </TabsContent>

                  <TabsContent value="pulls" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <ScrollArea className="h-full p-6">
                        <div className="space-y-6">
                          {luaTableToArray(data.pulls || data.value?.pulls).map((pull: any, idx: number) => (
                            <div key={idx} className="group relative pl-6 border-l-2 border-primary/30 hover:border-primary transition-colors">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary/50 group-hover:border-primary group-hover:scale-110 transition-all" />
                              
                              <div className="flex items-baseline justify-between gap-2 mb-2">
                                <h3 className="text-lg font-bold font-display text-white">Pull {idx + 1}</h3>
                                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                  {Object.keys(pull || {}).filter(k => !['color', 'x', 'y'].includes(k)).length} Enemies
                                </Badge>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-mono text-muted-foreground">
                                {Object.entries(pull || {}).map(([key, val], pIdx) => {
                                  if (['color', 'x', 'y'].includes(key)) return null;
                                  const enemies = luaTableToArray(val);
                                  return (
                                    <div key={pIdx} className="flex items-center gap-2 bg-black/20 p-2 rounded">
                                      <Skull className="w-3 h-3 text-destructive/70" />
                                      <span>NPC {key}: <span className="text-white">{enemies.length > 0 ? `x${enemies.length}` : String(val)}</span></span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {countPulls(data.pulls || data.value?.pulls) === 0 && (
                            <div className="text-center text-muted-foreground py-12">
                              No pull data found in this route.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </TabsContent>

                  <TabsContent value="lua" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <div className="p-4 border-b border-border/50 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-sm text-muted-foreground">
                            Lua code for Project Sylvanas with vec3 world coordinate conversion
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleDownloadLua}
                              disabled={!resolvedRoute}
                              className="gap-2"
                              data-testid="button-download-lua"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleCopyLua}
                              disabled={!resolvedRoute}
                              className="gap-2"
                              data-testid="button-copy-lua"
                            >
                              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                              {copied ? "Copied!" : "Copy"}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-4 p-3 rounded-md bg-black/20 border border-border/30">
                          <div className="flex-1">
                            <div className="text-sm font-medium flex items-center gap-2">
                              Sylvanas Vec3 Coordinates
                              <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                Experimental
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              Generate Sylvanas API code for 3D world positions. Note: MDT uses a custom canvas coordinate system - accuracy may vary by dungeon.
                            </div>
                            {resolvedRoute && resolvedRoute.mapID === 0 && (
                              <div className="text-xs text-destructive mt-1">
                                Map ID unknown for this dungeon - vec3 conversion unavailable
                              </div>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={useSylvanasVec3 ? "default" : "outline"}
                            onClick={() => setUseSylvanasVec3(!useSylvanasVec3)}
                            className="gap-2"
                            disabled={resolvedRoute?.mapID === 0}
                            data-testid="button-toggle-vec3"
                          >
                            {useSylvanasVec3 ? "Enabled" : "Disabled"}
                          </Button>
                        </div>
                      </div>
                      <ScrollArea className="h-[calc(100%-130px)] p-4">
                        {resolvedRoute ? (
                          <pre className="text-xs font-mono text-yellow-400/80 leading-relaxed whitespace-pre-wrap">
                            {generateLuaExport(resolvedRoute, useSylvanasVec3)}
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground space-y-4">
                            <Download className="w-12 h-12 opacity-20" />
                            <div className="text-center">
                              <p>No route data to export.</p>
                              <p className="text-xs opacity-50 max-w-xs mx-auto mt-2">
                                Decode an MDT string first to generate Lua export.
                              </p>
                            </div>
                          </div>
                        )}
                      </ScrollArea>
                    </Card>
                  </TabsContent>

                  <TabsContent value="raw" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <ScrollArea className="h-full p-4">
                        <pre className="text-xs font-mono text-green-400/80 leading-relaxed whitespace-pre-wrap break-all">
                          {JSON.stringify(data, null, 2)}
                        </pre>
                      </ScrollArea>
                    </Card>
                  </TabsContent>
                </Tabs>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center min-h-[400px] border-2 border-dashed border-white/5 rounded-xl bg-white/5">
                <div className="text-center space-y-4 max-w-md p-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <Code className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Ready to Decrypt</h3>
                  <p className="text-muted-foreground">
                    Waiting for route data. Paste an MDT string on the left to visualize the run structure.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
