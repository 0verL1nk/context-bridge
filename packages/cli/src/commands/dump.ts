import fs from "fs";

export async function dumpCommand(filePath: string) {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  
  console.log("\n📦 Context Bridge Dump\n");
  console.log(`Time: ${data.timestamp}`);
  if (data.gitSummary) {
    console.log(`\nGit Status:\n${data.gitSummary}`);
  }
  
  console.log(`\nActive Context: ${data.activeContext?.length || 0} items`);
  console.log(`Constraints: ${data.constraints?.length || 0} items`);
}
