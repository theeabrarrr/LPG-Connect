const fs = require('fs');

// Generate TypeScript Types
const tsJsonPath = "C:/Users/User/.gemini/antigravity/brain/84782325-1241-4bba-ae02-e36a56950c19/.system_generated/steps/28/output.txt";
const destTsPath = "c:/Users/User/Desktop/lpg-connect/src/types/database.types.ts";

try {
    const tsData = JSON.parse(fs.readFileSync(tsJsonPath, 'utf8'));
    if (tsData.types) {
        fs.writeFileSync(destTsPath, tsData.types);
        console.log("database.types.ts updated successfully!");
    } else {
        console.log("No 'types' field found in the TS JSON output.");
    }
} catch (e) {
    console.error("Error updating database.types.ts:", e);
}

// Generate Markdown Format
const mdJsonPath = "C:/Users/User/.gemini/antigravity/brain/84782325-1241-4bba-ae02-e36a56950c19/.system_generated/steps/29/output.txt";
const destMdPath = "c:/Users/User/Desktop/lpg-connect/DATABASE_SCHEMA.md";

try {
    const data = JSON.parse(fs.readFileSync(mdJsonPath, 'utf8'));

    let md = `# Database Schema Documentation\n\n> **Note:** This schema reflects the live database tables and columns as synced using Supabase MCP.\n\n`;

    for (const table of data) {
        md += `### \`${table.schema}.${table.name}\`\n`;
        if (table.rls_enabled) {
            md += `*RLS Enabled: Yes*\n\n`;
        } else {
            md += `*RLS Enabled: No*\n\n`;
        }

        for (const col of table.columns) {
            let isPk = table.primary_keys && table.primary_keys.includes(col.name);

            let extras = [];
            if (isPk) extras.push("PK");
            if (col.options && col.options.includes("nullable")) extras.push("nullable");
            if (col.options && col.options.includes("unique")) extras.push("unique");
            if (col.default_value) extras.push(`default: ${col.default_value}`);

            let fkStr = "";
            if (table.foreign_key_constraints) {
                let fks = table.foreign_key_constraints.filter(fk => fk.source === `${table.schema}.${table.name}.${col.name}`);
                if (fks.length > 0) {
                    fkStr = ` -> FK ${fks[0].target}`;
                }
            }

            md += `- \`${col.name}\` (${col.data_type}${extras.length > 0 ? ', ' + extras.join(', ') : ''})${fkStr}\n`;
        }
        md += `\n---\n\n`;
    }

    fs.writeFileSync(destMdPath, md);
    console.log("DATABASE_SCHEMA.md generated successfully!");
} catch (e) {
    console.error("Error generating DATABASE_SCHEMA.md:", e);
}
