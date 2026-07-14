import fs from "fs";
import path from "path";

interface WorkspaceConfig {
  root: string;
}

const CONFIG_DIR = path.join(
  process.cwd(),
  ".agents"
);

const CONFIG_FILE = path.join(
  CONFIG_DIR,
  "workspace.json"
);

class WorkspaceManager {
  private ensureConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, {
        recursive: true,
      });
    }

    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeFileSync(
        CONFIG_FILE,
        JSON.stringify(
          {
            root: process.cwd(),
          },
          null,
          2
        )
      );
    }
  }

  getRoot(): string {
    this.ensureConfig();

    const config =
      JSON.parse(
        fs.readFileSync(
          CONFIG_FILE,
          "utf8"
        )
      ) as WorkspaceConfig;

    return path.resolve(config.root);
  }

  setRoot(root: string) {
    this.ensureConfig();

    fs.writeFileSync(
      CONFIG_FILE,
      JSON.stringify(
        {
          root: path.resolve(root),
        },
        null,
        2
      )
    );
  }
}

export const workspace =
  new WorkspaceManager();