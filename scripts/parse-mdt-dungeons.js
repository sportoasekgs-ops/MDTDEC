import fs from 'fs';
import path from 'path';

const dungeonDirs = [
  'attached_assets/MythicDungeonTools/TheWarWithin',
  'attached_assets/MythicDungeonTools/MistsOfPandaria',
];

const dungeons = {};

function extractBracedContent(content, startPos) {
  let i = startPos;
  while (i < content.length && content[i] !== '{') i++;
  if (i >= content.length) return null;
  
  let depth = 0;
  const start = i;
  
  for (; i < content.length; i++) {
    if (content[i] === '{') {
      depth++;
    } else if (content[i] === '}') {
      depth--;
      if (depth === 0) {
        return content.substring(start, i + 1);
      }
    }
  }
  return null;
}

function parseClones(clonesStr) {
  const clones = {};
  const clonePattern = /\[(\d+)\]\s*=\s*\{([^}]+)\}/g;
  let match;
  
  while ((match = clonePattern.exec(clonesStr)) !== null) {
    const idx = parseInt(match[1]);
    const cloneData = match[2];
    
    const xMatch = cloneData.match(/\["x"\]\s*=\s*([-\d.]+)/);
    const yMatch = cloneData.match(/\["y"\]\s*=\s*([-\d.]+)/);
    const gMatch = cloneData.match(/\["g"\]\s*=\s*([-\d]+)/);
    const subMatch = cloneData.match(/\["sublevel"\]\s*=\s*(\d+)/);
    
    if (xMatch && yMatch) {
      clones[idx] = {
        x: parseFloat(xMatch[1]),
        y: parseFloat(yMatch[1]),
        g: gMatch ? parseInt(gMatch[1]) : null,
        sublevel: subMatch ? parseInt(subMatch[1]) : 1
      };
    }
  }
  
  return clones;
}

function parseEnemies(enemiesContent) {
  const enemies = {};
  
  const enemyPattern = /\[(\d+)\]\s*=\s*\{/g;
  let match;
  const positions = [];
  
  while ((match = enemyPattern.exec(enemiesContent)) !== null) {
    positions.push({ idx: parseInt(match[1]), pos: match.index, endOfMatch: match.index + match[0].length });
  }
  
  for (let i = 0; i < positions.length; i++) {
    const startPos = positions[i].pos;
    const enemyContent = extractBracedContent(enemiesContent, startPos);
    if (!enemyContent) continue;
    
    const nameMatch = enemyContent.match(/\["name"\]\s*=\s*"([^"]+)"/);
    const idMatch = enemyContent.match(/\["id"\]\s*=\s*(\d+)/);
    const countMatch = enemyContent.match(/\["count"\]\s*=\s*(\d+)/);
    
    const clonesIdx = enemyContent.indexOf('["clones"]');
    let clones = {};
    
    if (clonesIdx !== -1) {
      const clonesContent = extractBracedContent(enemyContent, clonesIdx);
      if (clonesContent) {
        clones = parseClones(clonesContent);
      }
    }
    
    if (nameMatch && idMatch && Object.keys(clones).length > 0) {
      enemies[positions[i].idx] = {
        name: nameMatch[1],
        id: parseInt(idMatch[1]),
        count: countMatch ? parseInt(countMatch[1]) : 0,
        clones: clones
      };
    }
  }
  
  return enemies;
}

function parseDungeonFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  const indexMatch = content.match(/local\s+dungeonIndex\s*=\s*(\d+)/);
  if (!indexMatch) return null;
  
  const dungeonIndex = parseInt(indexMatch[1]);
  
  const nameMatch = content.match(/MDT\.dungeonList\[dungeonIndex\]\s*=\s*L\["([^"]+)"\]/);
  const name = nameMatch ? nameMatch[1] : path.basename(filePath, '.lua');
  
  const enemiesStart = content.indexOf('MDT.dungeonEnemies[dungeonIndex]');
  if (enemiesStart === -1) return null;
  
  const enemiesContent = extractBracedContent(content, enemiesStart);
  if (!enemiesContent) return null;
  
  const enemies = parseEnemies(enemiesContent);
  
  return {
    index: dungeonIndex,
    name: name,
    enemies: enemies
  };
}

for (const dir of dungeonDirs) {
  if (!fs.existsSync(dir)) continue;
  
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.lua'));
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    try {
      const data = parseDungeonFile(filePath);
      if (data && Object.keys(data.enemies).length > 0) {
        dungeons[data.index] = {
          name: data.name,
          enemies: data.enemies
        };
        
        let totalClones = 0;
        for (const e of Object.values(data.enemies)) {
          totalClones += Object.keys(e.clones).length;
        }
        console.log(`${file}: dungeon ${data.index} - ${Object.keys(data.enemies).length} enemies, ${totalClones} clones`);
      }
    } catch (e) {
      console.error(`Error parsing ${file}:`, e.message);
    }
  }
}

const outputPath = 'client/src/lib/mdt-dungeons.json';
fs.writeFileSync(outputPath, JSON.stringify(dungeons, null, 2));
console.log(`\nWrote ${Object.keys(dungeons).length} dungeons to ${outputPath}`);

let totalEnemies = 0;
let totalClones = 0;
for (const d of Object.values(dungeons)) {
  totalEnemies += Object.keys(d.enemies).length;
  for (const e of Object.values(d.enemies)) {
    totalClones += Object.keys(e.clones).length;
  }
}
console.log(`Total: ${totalEnemies} enemy types, ${totalClones} clones`);
