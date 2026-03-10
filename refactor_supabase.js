const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

function processFile(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // Detectar imports do supabase
    if (!content.includes('supabase')) return;

    // Injetar import de supabaseQuery se houver match e ainda não estiver importado
    const matchHasDestructure = /(const|let)\s+\{\s*data(\s*:\s*\w+)?\s*(,\s*error(\s*:\s*\w+)?)?\s*\}\s*=\s*await\s+supabase/g;
    const matchHasResultArray = /(const|let)\s+\[\w+\]\s*=\s*await\s+Promise\.all/g;
    
    // Simplificando o regex para tratar na munheca as substituições mais comuns:
    // const { data } = await supabase.from(...) -> const data = await supabaseQuery(() => supabase.from(...))
    // const { data: varName } = await supabase... -> const varName = await supabaseQuery(() => supabase...)
    // const { error } = await supabase... -> await supabaseQuery(() => supabase...)
    
    // Regra 1: { data, error } ou { data } ou { data: algo }
    content = content.replace(/(const|let)\s+\{\s*data\s*(?::\s*(\w+))?\s*(?:,\s*error\s*(?::\s*\w+)?)?\s*\}\s*=\s*await\s+(supabase\.[^;]+);/g, (match, declaration, alias, restObj) => {
        const varName = alias || 'data';
        return `${declaration} ${varName} = await supabaseQuery(async () => await ${restObj});`;
    });

    // Regra 2: Apenas { error } (ex: inserts que não ligam pra data, apenas querem exception if error)
    content = content.replace(/(const|let)\s+\{\s*error\s*(?::\s*\w+)?\s*\}\s*=\s*await\s+(supabase\.[^;]+);/g, (match, declaration, restObj) => {
        return `await supabaseQuery(async () => await ${restObj});`;
    });
    
    // Regra 3: assignments sem declaracao const/let
    content = content.replace(/\{\s*data\s*(?::\s*(\w+))?\s*(?:,\s*error\s*(?::\s*\w+)?)?\s*\}\s*=\s*await\s+(supabase\.[^;]+);/g, (match, alias, restObj) => {
        const varName = alias || 'data';
        return `${varName} = await supabaseQuery(async () => await ${restObj});`;
    });
    
     content = content.replace(/\{\s*error\s*(?::\s*\w+)?\s*\}\s*=\s*await\s+(supabase\.[^;]+);/g, (match, restObj) => {
        return `await supabaseQuery(async () => await ${restObj});`;
    });

    if (original !== content) {
        if (!content.includes('supabaseQuery')) {
            // Import injecao simplista
            const importLine = `import { supabaseQuery } from "@/lib/supabaseHelper";\n`;
            content = importLine + content;
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

walkDir('./src', processFile);
