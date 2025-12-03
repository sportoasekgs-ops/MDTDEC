import { inflateRaw } from "pako";
import dungeonData from "./mdt-dungeons.json";

export interface MDTData {
  dungeonEnemies: any[];
  pulls: any[];
  dungeonIdx: number;
  week: number;
  [key: string]: any;
}

export interface EnemyClone {
  enemyIdx: number;
  cloneIdx: number;
  name: string;
  id: number;
  x: number;
  y: number;
  sublevel: number;
  count: number;
  group?: number;
}

export interface PullWithCoords {
  pullIndex: number;
  enemies: EnemyClone[];
  totalCount: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface EnemyWithWorldCoords extends EnemyClone {
  worldPos?: Vec3;
  normalizedX?: number;
  normalizedY?: number;
}

export interface PullWithWorldCoords {
  pullIndex: number;
  enemies: EnemyWithWorldCoords[];
  totalCount: number;
}

export interface ResolvedRoute {
  dungeonName: string;
  dungeonIdx: number;
  mapID: number;
  scaleMultiplier: number;
  pulls: PullWithWorldCoords[];
  totalCount: number;
}

export const MDT_CANVAS_WIDTH = 840;
export const MDT_CANVAS_HEIGHT = 555;

export interface DungeonMetadata {
  mapID: number;
  englishName: string;
  scaleMultiplier?: number;
  viewportOverrides?: Record<number, { zoomScale: number; horizontalPan: number; verticalPan: number }>;
}

export const DUNGEON_METADATA: Record<number, DungeonMetadata> = {
  19: { mapID: 353, englishName: "Siege of Boralus", viewportOverrides: { 2: { zoomScale: 4.3, horizontalPan: 499.1, verticalPan: 38.7 } } },
  30: { mapID: 378, englishName: "Halls of Atonement" },
  31: { mapID: 375, englishName: "Mists of Tirna Scithe" },
  35: { mapID: 376, englishName: "The Necrotic Wake", scaleMultiplier: 1.3 },
  37: { mapID: 391, englishName: "Tazavesh: Streets of Wonder" },
  38: { mapID: 392, englishName: "Tazavesh: So'leah's Gambit" },
  110: { mapID: 501, englishName: "The Stonevault" },
  111: { mapID: 505, englishName: "The Dawnbreaker" },
  112: { mapID: 507, englishName: "Grim Batol" },
  113: { mapID: 503, englishName: "Ara-Kara" },
  114: { mapID: 502, englishName: "City of Threads" },
  115: { mapID: 499, englishName: "Priory of the Sacred Flame" },
  116: { mapID: 506, englishName: "Cinderbrew Meadery" },
  117: { mapID: 504, englishName: "Darkflame Cleft" },
  118: { mapID: 500, englishName: "The Rookery" },
  119: { mapID: 525, englishName: "Operation: Floodgate" },
  120: { mapID: 247, englishName: "The MOTHERLODE!!" },
  121: { mapID: 382, englishName: "Theater of Pain" },
  122: { mapID: 370, englishName: "Mechagon - Workshop" },
  123: { mapID: 542, englishName: "Eco-Dome Al'dani", viewportOverrides: { 1: { zoomScale: 1.3, horizontalPan: 93.9, verticalPan: 48.8 } } },
};

export const DUNGEON_MAP_IDS: Record<number, number> = Object.fromEntries(
  Object.entries(DUNGEON_METADATA).map(([idx, meta]) => [parseInt(idx), meta.mapID])
);

// --- LibDeflate: DecodeForPrint Implementation ---

const alphabet = [
  "a", "b", "c", "d", "e", "f", "g", "h",
  "i", "j", "k", "l", "m", "n", "o", "p",
  "q", "r", "s", "t", "u", "v", "w", "x",
  "y", "z", "A", "B", "C", "D", "E", "F",
  "G", "H", "I", "J", "K", "L", "M", "N",
  "O", "P", "Q", "R", "S", "T", "U", "V",
  "W", "X", "Y", "Z", "0", "1", "2", "3",
  "4", "5", "6", "7", "8", "9", "(", ")"
];

const charTo6Bit: { [key: string]: number } = {};
alphabet.forEach((char, index) => {
  charTo6Bit[char] = index;
});

function decodeForPrint(str: string): Uint8Array | null {
  // Strip whitespace and control characters
  str = str.replace(/^[\s\u0000-\u001f]+|[\s\u0000-\u001f]+$/g, "");
  
  if (str.length === 0) return null;

  const buffer: number[] = [];
  
  let i = 0;
  const len = str.length;
  
  // Main loop: Process groups of 4 characters into 3 bytes
  while (i <= len - 4) {
    const x1 = charTo6Bit[str[i]];
    const x2 = charTo6Bit[str[i + 1]];
    const x3 = charTo6Bit[str[i + 2]];
    const x4 = charTo6Bit[str[i + 3]];

    if (x1 === undefined || x2 === undefined || x3 === undefined || x4 === undefined) {
      return null; // Invalid character
    }

    i += 4;

    // Calculate the 24-bit value
    // Note: Lua implementation: x1 + x2 * 64 + x3 * 4096 + x4 * 262144
    // This is Little Endian packing of 6-bit chunks?
    // Let's trace:
    // cache = x1 + (x2 << 6) + (x3 << 12) + (x4 << 18)
    let cache = x1 + x2 * 64 + x3 * 4096 + x4 * 262144;

    // Extract bytes
    const b1 = cache % 256;
    cache = (cache - b1) / 256;
    const b2 = cache % 256;
    const b3 = (cache - b2) / 256;

    buffer.push(b1, b2, b3);
  }

  // Handle remaining characters
  let cache = 0;
  let cacheBitlen = 0;
  while (i < len) {
    const x = charTo6Bit[str[i]];
    if (x === undefined) return null;
    
    cache = cache + x * Math.pow(2, cacheBitlen);
    cacheBitlen += 6;
    i++;
  }

  while (cacheBitlen >= 8) {
    const byte = cache % 256;
    buffer.push(byte);
    cache = (cache - byte) / 256;
    cacheBitlen -= 8;
  }

  return new Uint8Array(buffer);
}

// --- AceSerializer Implementation ---

function deserializeStringHelper(escape: string): string {
    // escape matches "~." (tilde followed by any char)
    const code = escape.charCodeAt(1);
    // Lua: if escape < "~\122" then strchar(strbyte(escape,2,2)-64)
    // "z" is 122.
    if (code < 122) {
        return String.fromCharCode(code - 64);
    }
    // Special cases
    if (escape === "~z") return "\u001E"; // \030 -> Record Separator?
    if (escape === "~{") return "\u007F"; // \127 -> DEL
    if (escape === "~|") return "\u007E"; // \126 -> ~
    if (escape === "~}") return "^";      // \94 -> ^
    
    throw new Error(`DeserializeStringHelper got called for '${escape}'`);
}

function parseAceSerializer(str: string): any {
    // Remove control chars and spaces (AceSerializer implementation)
    // str = str.replace(/[\u0000-\u001f ]/g, ""); // Actually, we shouldn't strip spaces inside strings?
    // The Lua code says: str = gsub(str, "[%c ]", "")
    // But wait, ^S strings can contain spaces?
    // If spaces are stripped globally, then strings can't have spaces?
    // AceSerializer seems to strip them BEFORE parsing. 
    // So yes, all spaces are removed. This implies spaces in strings are encoded/escaped?
    // AceSerializer SerializeStringHelper doesn't seem to escape spaces...
    // Wait, "nice for embedding in email and stuff".
    // If I encode "Hello World", is it "Hello World"?
    // If spaces are stripped, it becomes "HelloWorld".
    // Let's assume for MDT exports (which are compressed binary), spaces are not an issue in the binary data itself
    // because it's base64 encoded first.
    // BUT, we are operating on the DECOMPRESSED string.
    // Does AceSerializer really strip spaces from the decompressed string?
    // Lua: str = gsub(str, "[%c ]", "")
    // Yes, it does.
    // So spaces must be escaped in strings if they are significant?
    // Or maybe they are not escaped and just lost? That would be bad.
    // Let's assume we should follow the Lua code: strip control chars and spaces.
    
    // However, JS strings are UTF-16. The input is from pako.inflate(..., {to: 'string'}).
    // This produces a JS string from the binary data.
    // If the binary data contained byte 32 (space), it is now a space in the string.
    
    // Let's follow the Lua logic exactly:
    const cleanStr = str.replace(/[\u0000-\u001f ]/g, "");
    
    // Split by ^
    // Note: literal ^ in strings are escaped as ~}
    // So we can safely split by ^.
    // The first element will be empty if string starts with ^
    const parts = cleanStr.split("^");
    
    // Iterator
    let idx = 0;
    // The string should start with ^1.
    // parts[0] should be empty (before first ^).
    // parts[1] should be "1" (header).
    
    if (parts.length < 2 || parts[1] !== "1") {
        throw new Error("Supplied data is not AceSerializer data (rev 1)");
    }
    
    // Skip empty start and header
    idx = 2;

    function next(): { ctl: string, data: string } | null {
        if (idx >= parts.length) return null;
        const part = parts[idx++];
        if (part.length === 0) {
            // This happens if we have ^^ (terminator) -> split gives empty string between them?
            // No, ^^ becomes empty string in parts?
            // "A^^B" split ^ -> "A", "", "B".
            // So control code is empty char?
            // Wait. The format is ^Cdata.
            // If part is empty, it means we had ^^.
            // In that case ctl is ^ (the second caret) and data is empty?
            // No.
            // Let's look at split behavior.
            // "^^" -> ["", "", ""]
            // "^1" -> ["", "1"]
            // "^Sval" -> ["", "Sval"]
            
            // If part is "Sval", ctl is 'S', data is "val".
            // If part is "", it corresponds to a caret that was immediately followed by another caret?
            // e.g. "^^".
            // The split eats the carets.
            // If we have "^^", split gives empty string.
            // The control code is the FIRST char of the part.
            return { ctl: "^", data: "" }; 
        }
        return { ctl: part[0], data: part.slice(1) };
    }

    function deserializeValue(): any {
        const item = next();
        if (!item) throw new Error("Unexpected end of data");
        
        const { ctl, data } = item;
        
        if (ctl === "^") {
            // Terminator ^^
            return undefined; // Should loop handle this?
        }
        
        if (ctl === "S") {
            // String
            return data.replace(/~./g, deserializeStringHelper);
        } else if (ctl === "N") {
            // Number
            const num = parseFloat(data);
            if (isNaN(num)) {
                 if (data === "-inf") return -Infinity;
                 if (data === "inf") return Infinity;
                 // Handle other cases?
            }
            return num;
        } else if (ctl === "F") {
            // Float: mantissa ^f exponent
            // The next part should be the exponent
            const expPart = next();
            if (!expPart || expPart.ctl !== "f") throw new Error("Invalid floating point format");
            const m = parseFloat(data);
            const e = parseFloat(expPart.data);
            return m * Math.pow(2, e);
        } else if (ctl === "B") {
            return true;
        } else if (ctl === "b") {
            return false;
        } else if (ctl === "Z") {
            return null;
        } else if (ctl === "T") {
            // Table
            const res: any = {}; // Or array? AceSerializer doesn't distinguish, creates Lua table.
            // In JS we use Object, but might want to detect Array-like keys.
            // For now, use Object.
            
            while (true) {
                // Peek or get next
                // We need to check if next is "^t" (End of table)
                // But our next() advances.
                // We can look at parts[idx].
                if (idx < parts.length && parts[idx].startsWith("t")) {
                    idx++; // Consume the end marker
                    break;
                }
                
                // Get key
                const key = deserializeValue();
                if (key === undefined) break; // Should not happen if properly terminated
                
                // Get value
                const val = deserializeValue();
                if (val === undefined) break;
                
                res[key] = val;
            }
            return res;
        }
        
        throw new Error(`Unknown control code: ^${ctl}`);
    }

    return deserializeValue();
}

export function decodeMDT(encodedString: string): MDTData | null {
  try {
    // 1. Remove ! prefix if present
    if (encodedString.startsWith("!")) {
        encodedString = encodedString.slice(1);
    }

    // 2. DecodeForPrint (Base64)
    const compressed = decodeForPrint(encodedString);
    if (!compressed) throw new Error("Base64 decode failed");

    // 3. Decompress (Deflate)
    // We use pako.inflate.
    // MDT uses LibDeflate:CompressDeflate.
    // pako.inflate should handle it.
    let decompressed: string;
    try {
        decompressed = inflateRaw(compressed, { to: "string" });
    } catch (e) {
        console.error("Decompression error:", e);
        throw new Error("Decompression failed");
    }

    // 4. Deserialize (AceSerializer)
    const result = parseAceSerializer(decompressed);
    
    return result;

  } catch (error: any) {
    console.error("MDT Decode Error:", error);
    throw new Error(error.message || "Failed to decode string");
  }
}

// Convert numeric-keyed objects to arrays (Lua tables with numeric keys)
function toArray<T>(obj: any): T[] {
  if (!obj || typeof obj !== 'object') return [];
  const keys = Object.keys(obj).filter(k => !isNaN(Number(k)));
  const result: T[] = [];
  for (const key of keys) {
    result[Number(key)] = obj[key];
  }
  return result;
}

export interface ViewportOverride {
  zoomScale: number;
  horizontalPan: number;
  verticalPan: number;
}

export function mdtToNormalizedCoords(
  mdtX: number, 
  mdtY: number, 
  scaleMultiplier: number = 1.0,
  sublevel: number = 1,
  viewportOverrides?: Record<number, ViewportOverride>
): { normalizedX: number; normalizedY: number } {
  const scaledWidth = MDT_CANVAS_WIDTH * scaleMultiplier;
  const scaledHeight = MDT_CANVAS_HEIGHT * scaleMultiplier;
  
  let adjustedX = mdtX;
  let adjustedY = Math.abs(mdtY);
  
  if (viewportOverrides && viewportOverrides[sublevel]) {
    const override = viewportOverrides[sublevel];
    adjustedX = (mdtX - override.horizontalPan) / override.zoomScale;
    adjustedY = (Math.abs(mdtY) - override.verticalPan) / override.zoomScale;
  }
  
  let normalizedX = adjustedX / scaledWidth;
  let normalizedY = adjustedY / scaledHeight;
  
  normalizedX = Math.max(0, Math.min(1, normalizedX));
  normalizedY = Math.max(0, Math.min(1, normalizedY));
  
  return { normalizedX, normalizedY };
}

export function generateSylvanasLuaCode(route: ResolvedRoute): string {
  const metadata = DUNGEON_METADATA[route.dungeonIdx];
  const mapID = metadata?.mapID || route.mapID;
  const scaleMult = metadata?.scaleMultiplier || 1.0;
  const hasViewportOverrides = metadata?.viewportOverrides && Object.keys(metadata.viewportOverrides).length > 0;
  
  const lines: string[] = [
    `-- MDT Route: ${route.dungeonName}`,
    `-- Map ID: ${mapID}`,
    `-- Scale Multiplier: ${scaleMult}`,
    `-- Total Count: ${route.totalCount}`,
    `-- Viewport Overrides: ${hasViewportOverrides ? 'Yes (per-sublevel calibration applied)' : 'None'}`,
    ``,
    `local coords_helper = require("common.utility.coords_helper")`,
    `local vec3 = require("common.geometry.vec3")`,
    `local graphics_helper = require("common.utility.graphics_helper")`,
    ``,
    `-- MDT Canvas dimensions: 840x555 pixels`,
    `-- Normalized coordinates are clamped to [0,1] range`,
    `-- Per-sublevel viewport overrides have been applied during normalization`,
    ``,
    `local MDT_ROUTE = {`,
    `  dungeonName = "${route.dungeonName}",`,
    `  dungeonIdx = ${route.dungeonIdx},`,
    `  mapID = ${mapID},`,
    `  scaleMultiplier = ${scaleMult},`,
    `  totalCount = ${route.totalCount},`,
  ];
  
  if (hasViewportOverrides && metadata.viewportOverrides) {
    lines.push(`  viewportOverrides = {`);
    for (const [sublevel, override] of Object.entries(metadata.viewportOverrides)) {
      lines.push(`    [${sublevel}] = { zoomScale = ${override.zoomScale}, horizontalPan = ${override.horizontalPan}, verticalPan = ${override.verticalPan} },`);
    }
    lines.push(`  },`);
  }
  
  lines.push(`  pulls = {`);
  
  for (const pull of route.pulls) {
    lines.push(`    [${pull.pullIndex}] = {`);
    lines.push(`      enemies = {`);
    
    for (let i = 0; i < pull.enemies.length; i++) {
      const enemy = pull.enemies[i];
      const comma = i < pull.enemies.length - 1 ? ',' : '';
      lines.push(`        { npcId = ${enemy.id}, name = "${enemy.name}", mdtX = ${enemy.x.toFixed(2)}, mdtY = ${enemy.y.toFixed(2)}, normalizedX = ${enemy.normalizedX?.toFixed(6) || 0}, normalizedY = ${enemy.normalizedY?.toFixed(6) || 0}, sublevel = ${enemy.sublevel}, count = ${enemy.count} }${comma}`);
    }
    
    lines.push(`      },`);
    lines.push(`      totalCount = ${pull.totalCount}`);
    lines.push(`    },`);
  }
  
  lines.push(`  }`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`-- Convert normalized coordinates to world vec3 using Sylvanas API`);
  lines.push(`-- Usage: local worldPos = coords_helper:to_3d(normalizedX, normalizedY, mapID)`);
  lines.push(`function MDT_ROUTE:get_world_positions()`);
  lines.push(`  local positions = {}`);
  lines.push(`  for pullIdx, pull in pairs(self.pulls) do`);
  lines.push(`    positions[pullIdx] = {}`);
  lines.push(`    for i, enemy in ipairs(pull.enemies) do`);
  lines.push(`      local worldPos = coords_helper:to_3d(enemy.normalizedX, enemy.normalizedY, self.mapID)`);
  lines.push(`      positions[pullIdx][i] = {`);
  lines.push(`        npcId = enemy.npcId,`);
  lines.push(`        name = enemy.name,`);
  lines.push(`        worldPos = worldPos`);
  lines.push(`      }`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`  return positions`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`-- Render ESP overlay for all enemies in route`);
  lines.push(`function MDT_ROUTE:draw_esp()`);
  lines.push(`  local positions = self:get_world_positions()`);
  lines.push(`  for pullIdx, pullPositions in pairs(positions) do`);
  lines.push(`    for _, enemy in ipairs(pullPositions) do`);
  lines.push(`      if enemy.worldPos then`);
  lines.push(`        graphics_helper:world_to_screen(enemy.worldPos, function(screenPos)`);
  lines.push(`          -- Draw enemy marker at screenPos.x, screenPos.y`);
  lines.push(`        end)`);
  lines.push(`      end`);
  lines.push(`    end`);
  lines.push(`  end`);
  lines.push(`end`);
  lines.push(``);
  lines.push(`return MDT_ROUTE`);
  
  return lines.join('\n');
}

export function resolveCoordinates(data: MDTData): ResolvedRoute | null {
  const dungeonIdx = data.value?.currentDungeonIdx 
    || data.currentDungeonIdx 
    || data.dungeonIdx 
    || data.value?.dungeonIdx;
    
  if (!dungeonIdx) {
    console.warn("No dungeon index found in decoded data");
    return null;
  }
  
  const dungeon = (dungeonData as any)[dungeonIdx.toString()];
  if (!dungeon) {
    console.warn(`Dungeon ${dungeonIdx} not found in database. Available dungeons: ${Object.keys(dungeonData).join(', ')}`);
    return null;
  }
  
  const metadata = DUNGEON_METADATA[dungeonIdx];
  const scaleMultiplier = metadata?.scaleMultiplier || 1.0;
  
  const pullsData = data.value?.pulls || data.pulls;
  if (!pullsData) {
    console.warn("No pulls data found in decoded route");
    return null;
  }
  
  const pullsArray = toArray<any>(pullsData);
  const resolvedPulls: PullWithWorldCoords[] = [];
  let routeTotalCount = 0;
  
  for (let pullIdx = 1; pullIdx < pullsArray.length; pullIdx++) {
    const pull = pullsArray[pullIdx];
    if (!pull) continue;
    
    const enemies: EnemyWithWorldCoords[] = [];
    let pullTotalCount = 0;
    
    for (const [enemyIdxStr, cloneData] of Object.entries(pull)) {
      if (enemyIdxStr === 'color') continue;
      
      const enemyIdx = parseInt(enemyIdxStr);
      if (isNaN(enemyIdx)) continue;
      
      const enemyInfo = dungeon.enemies[enemyIdx.toString()];
      if (!enemyInfo) continue;
      
      const cloneIndices = toArray<number>(cloneData);
      
      for (let i = 1; i < cloneIndices.length; i++) {
        const cloneIdx = cloneIndices[i];
        if (cloneIdx === undefined || cloneIdx === null) continue;
        
        const clone = enemyInfo.clones[cloneIdx.toString()];
        if (!clone) continue;
        
        const { normalizedX, normalizedY } = mdtToNormalizedCoords(
          clone.x, 
          clone.y, 
          scaleMultiplier,
          clone.sublevel || 1,
          metadata?.viewportOverrides
        );
        
        enemies.push({
          enemyIdx,
          cloneIdx,
          name: enemyInfo.name,
          id: enemyInfo.id,
          x: clone.x,
          y: clone.y,
          sublevel: clone.sublevel || 1,
          count: enemyInfo.count || 0,
          group: clone.g,
          normalizedX,
          normalizedY
        });
        
        pullTotalCount += enemyInfo.count || 0;
      }
    }
    
    if (enemies.length > 0) {
      resolvedPulls.push({
        pullIndex: pullIdx,
        enemies,
        totalCount: pullTotalCount
      });
      routeTotalCount += pullTotalCount;
    }
  }
  
  return {
    dungeonName: dungeon.name,
    dungeonIdx,
    mapID: metadata?.mapID || DUNGEON_MAP_IDS[dungeonIdx] || 0,
    scaleMultiplier,
    pulls: resolvedPulls,
    totalCount: routeTotalCount
  };
}
