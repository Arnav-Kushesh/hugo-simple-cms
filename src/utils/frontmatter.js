import jsyaml from 'js-yaml';

// Parse frontmatter from markdown content
export function parseFrontmatter(content) {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);
    
    if (!match) {
        return { data: {}, content: content };
    }
    
    const yamlContent = match[1];
    const markdownContent = match[2];
    
    // Use js-yaml if available, otherwise fall back to simple parser
    let data = {};
    try {
        data = jsyaml.load(yamlContent) || {};
    } catch (error) {
        console.warn('Error parsing YAML with js-yaml, using fallback:', error);
        data = parseYamlSimple(yamlContent);
    }
    
    return { data, content: markdownContent };
}

// Simple YAML parser fallback
function parseYamlSimple(yamlContent) {
    const data = {};
    const lines = yamlContent.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        const colonIndex = trimmed.indexOf(':');
        if (colonIndex === -1) continue;
        
        const key = trimmed.substring(0, colonIndex).trim();
        let value = trimmed.substring(colonIndex + 1).trim();
        
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        
        // Try to parse as boolean
        if (value === 'true') {
            data[key] = true;
        } else if (value === 'false') {
            data[key] = false;
        } else if (value === 'null' || value === '~') {
            data[key] = null;
        } else if (!isNaN(value) && value !== '') {
            // Try to parse as number
            data[key] = Number(value);
        } else {
            data[key] = value;
        }
    }
    
    return data;
}

// Stringify frontmatter to markdown format
export function stringifyFrontmatter(content, frontmatter) {
    if (!frontmatter || Object.keys(frontmatter).length === 0) {
        return content;
    }
    
    // Use js-yaml for better YAML formatting
    let yamlContent;
    try {
        yamlContent = jsyaml.dump(frontmatter, {
            lineWidth: -1,
            noRefs: true,
            quotingType: '"',
            forceQuotes: false
        }).trim();
    } catch (error) {
        console.warn('Error stringifying YAML with js-yaml, using fallback:', error);
        yamlContent = stringifyYamlSimple(frontmatter);
    }
    
    return `---\n${yamlContent}\n---\n${content}`;
}

// Simple YAML stringifier fallback
function stringifyYamlSimple(frontmatter) {
    const yamlLines = [];
    for (const [key, value] of Object.entries(frontmatter)) {
        if (value === null || value === undefined) {
            yamlLines.push(`${key}: null`);
        } else if (typeof value === 'boolean') {
            yamlLines.push(`${key}: ${value}`);
        } else if (typeof value === 'number') {
            yamlLines.push(`${key}: ${value}`);
        } else if (Array.isArray(value)) {
            yamlLines.push(`${key}:`);
            value.forEach(item => {
                yamlLines.push(`  - ${item}`);
            });
        } else if (typeof value === 'object') {
            yamlLines.push(`${key}:`);
            for (const [subKey, subValue] of Object.entries(value)) {
                yamlLines.push(`  ${subKey}: ${subValue}`);
            }
        } else {
            // Escape if needed
            const stringValue = String(value);
            if (stringValue.includes(':') || stringValue.includes('\n') || stringValue.includes('"')) {
                yamlLines.push(`${key}: "${stringValue.replace(/"/g, '\\"')}"`);
            } else {
                yamlLines.push(`${key}: ${stringValue}`);
            }
        }
    }
    return yamlLines.join('\n');
}
