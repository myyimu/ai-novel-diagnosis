import { buildSkillPackageZip } from "./skill-package-zip";

describe("buildSkillPackageZip", () => {
  it("builds a valid zip archive containing skill package files", () => {
    const zip = buildSkillPackageZip(
      [
        {
          path: "demo-skill/SKILL.md",
          content: "---\nname: demo-skill\n---\n",
        },
        {
          path: "demo-skill/scripts/check.js",
          content: "console.log('ok');\n",
          executable: true,
        },
      ],
      { modifiedAt: new Date("2026-01-01T00:00:00Z") },
    );

    expect(zip.readUInt32LE(0)).toBe(0x04034b50);
    expect(zip.includes(Buffer.from("demo-skill/SKILL.md"))).toBe(true);
    expect(zip.includes(Buffer.from("demo-skill/scripts/check.js"))).toBe(true);
    expect(zip.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
  });
});
