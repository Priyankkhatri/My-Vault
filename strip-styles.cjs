const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const visualPatterns = [
    /\bbg-[a-zA-Z0-9-]+\b/g,
    /\bshadow(?:-[a-zA-Z0-9-]+)?\b/g,
    /\brounded(?:-[a-zA-Z0-9-]+)?\b/g,
    /\btext-(?:transparent|current|black|white|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-[0-9]+)?\b/g,
    /\border(?:-[a-zA-Z0-9-]+)?\b/g,
    /\b(!?hover:[a-zA-Z0-9-:]+)\b/g, 
    /\b(!?focus:[a-zA-Z0-9-:]+)\b/g,
    /\btransition(?:-[a-zA-Z0-9-]+)?\b/g,
    /\bduration-[0-9]+\b/g,
    /\bease-[a-zA-Z0-9-]+\b/g,
    /\bring(?:-[a-zA-Z0-9-]+)?\b/g,
    /\bfrom-[a-zA-Z0-9-]+\b/g,
    /\bto-[a-zA-Z0-9-]+\b/g,
    /\bvia-[a-zA-Z0-9-]+\b/g,
    /\bbg-gradient-[a-zA-Z0-9-]+\b/g,
    /\bopacity-[0-9]+\b/g,
    /\bbackdrop-[a-zA-Z0-9-]+\b/g,
];

function processContent(content) {
    let newContent = content;
    
    // Instead of completely global replace, target string literals that look like tailwind classes to be safe, 
    // or just run globally since the risk of hitting a variable named "bg-white" is zero
    for (const pattern of visualPatterns) {
        newContent = newContent.replace(pattern, '');
    }
    
    // Clean up multiple spaces that were left behind in className strings
    // We do this by replacing double spaces with single space globally
    let previous;
    do {
        previous = newContent;
        newContent = newContent.replace(/  /g, ' ');
    } while (newContent !== previous);
    
    // Fix leading trailing spaces in className="..."
    newContent = newContent.replace(/className=" /g, 'className="');
    newContent = newContent.replace(/ "/g, '"');
    newContent = newContent.replace(/className=\{` /g, 'className={`');
    newContent = newContent.replace(/ `\}/g, '`}');
    
    return newContent;
}

const modifiedFiles = [];

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            const original = fs.readFileSync(fullPath, 'utf8');
            let processed = processContent(original);
            
            if (original !== processed) {
                fs.writeFileSync(fullPath, processed, 'utf8');
                modifiedFiles.push(fullPath);
            }
        }
    }
}

walkDir(directoryPath);
fs.writeFileSync('stripped_files.json', JSON.stringify(modifiedFiles, null, 2));
console.log('Done! Files modified: ' + modifiedFiles.length);
