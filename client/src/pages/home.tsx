import { useState } from "react";
import { decodeMDT } from "@/lib/mdt";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, Shield, Sword, Skull, Map as MapIcon, Code, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const [input, setInput] = useState("");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDecoding, setIsDecoding] = useState(false);

  const handleDecode = async () => {
    if (!input) return;
    
    setIsDecoding(true);
    setError(null);
    setData(null);

    // Simulate processing time for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const result = decodeMDT(input);
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsDecoding(false);
    }
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 space-y-1">
                    <div className="text-xs text-primary uppercase tracking-wider">Dungeon ID</div>
                    <div className="text-2xl font-mono font-bold">{data.dungeonIdx || data.value?.currentDungeonIdx || "Unknown"}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20 space-y-1">
                    <div className="text-xs text-secondary uppercase tracking-wider">Pulls</div>
                    <div className="text-2xl font-mono font-bold text-secondary">
                      {/* Handle different data structures */}
                      {(data.pulls?.length) || (data.value?.pulls?.length) || 0}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/30 border border-accent space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Week</div>
                    <div className="text-2xl font-mono font-bold">{data.week || data.value?.week || "—"}</div>
                  </div>
                  <div className="p-4 rounded-lg bg-accent/30 border border-accent space-y-1">
                    <div className="text-xs text-muted-foreground uppercase tracking-wider">Author</div>
                    <div className="text-lg font-mono font-bold truncate">{data.text || data.value?.text || "—"}</div>
                  </div>
                </div>

                <Tabs defaultValue="pulls" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 bg-black/40 border border-border/50">
                    <TabsTrigger value="pulls">Route Pulls</TabsTrigger>
                    <TabsTrigger value="drawings">Drawings / Coords</TabsTrigger>
                    <TabsTrigger value="raw">Raw Data</TabsTrigger>
                  </TabsList>

                  <TabsContent value="pulls" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <ScrollArea className="h-full p-6">
                        <div className="space-y-6">
                          {((data.pulls || data.value?.pulls) || []).map((pull: any, idx: number) => (
                            <div key={idx} className="group relative pl-6 border-l-2 border-primary/30 hover:border-primary transition-colors">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-background border-2 border-primary/50 group-hover:border-primary group-hover:scale-110 transition-all" />
                              
                              <div className="flex items-baseline justify-between mb-2">
                                <h3 className="text-lg font-bold font-display text-white">Pull {idx + 1}</h3>
                                <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                                  {/* Count enemies if array, or keys if object */}
                                  {Array.isArray(pull) ? pull.length : Object.keys(pull).filter(k => !['color', 'x', 'y'].includes(k)).length} Enemies
                                </Badge>
                              </div>

                              {/* Enemies List */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm font-mono text-muted-foreground">
                                {Object.entries(pull).map(([key, val], pIdx) => {
                                  if (['color', 'x', 'y'].includes(key)) return null;
                                  return (
                                    <div key={pIdx} className="flex items-center gap-2 bg-black/20 p-2 rounded">
                                      <Skull className="w-3 h-3 text-destructive/70" />
                                      <span>Enemy ID: <span className="text-white">{String(val)}</span></span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                          {(!data.pulls && !data.value?.pulls) && (
                            <div className="text-center text-muted-foreground py-12">
                              No pull data found in this route.
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </Card>
                  </TabsContent>

                  <TabsContent value="drawings" className="mt-4">
                    <Card className="bg-card/50 border-border/50 h-[500px]">
                      <ScrollArea className="h-full p-6">
                        <div className="space-y-4">
                           {/* Check for drawings/objects */}
                           {((data.objects || data.value?.objects) || []).length > 0 ? (
                             ((data.objects || data.value?.objects) || []).map((obj: any, i: number) => (
                               <div key={i} className="p-4 rounded border border-secondary/20 bg-secondary/5 space-y-2">
                                 <div className="flex items-center gap-2 text-secondary font-bold">
                                   <MapIcon className="w-4 h-4" />
                                   <span>Map Object {i + 1}</span>
                                 </div>
                                 <div className="grid grid-cols-2 gap-4 font-mono text-xs">
                                   <div>X: <span className="text-white">{obj.x || "N/A"}</span></div>
                                   <div>Y: <span className="text-white">{obj.y || "N/A"}</span></div>
                                   {obj.d && <div className="col-span-2">Data: {String(obj.d).substring(0, 50)}...</div>}
                                 </div>
                               </div>
                             ))
                           ) : (
                             <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground space-y-4">
                               <MapIcon className="w-12 h-12 opacity-20" />
                               <div className="text-center">
                                 <p>No custom map drawings found.</p>
                                 <p className="text-xs opacity-50 max-w-xs mx-auto mt-2">
                                   Standard routes rely on static database coordinates which are not included in the string. Only custom drawings/notes contain explicit coordinates.
                                 </p>
                               </div>
                             </div>
                           )}
                        </div>
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
